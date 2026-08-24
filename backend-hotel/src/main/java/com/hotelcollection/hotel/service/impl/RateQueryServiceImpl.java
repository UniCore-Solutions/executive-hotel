package com.hotelcollection.hotel.service.impl;

import java.time.LocalDate;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.UUID;

import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.dto.rate.AdminPromotionView;
import com.hotelcollection.hotel.dto.rate.AdminRatePlanView;
import com.hotelcollection.hotel.dto.rate.RatePlanPriceInfoView;
import com.hotelcollection.hotel.service.RateQueryService;
import com.hotelcollection.hotel.dto.rate.RoomTypeRatePlanInfoView;
import com.hotelcollection.hotel.entity.Promotion;
import com.hotelcollection.hotel.entity.RatePlan;
import com.hotelcollection.hotel.entity.RatePlanPrice;
import com.hotelcollection.hotel.entity.RoomTypeRatePlan;
import com.hotelcollection.hotel.repository.PromotionRepository;
import com.hotelcollection.hotel.repository.RatePlanPriceRepository;
import com.hotelcollection.hotel.repository.RatePlanRepository;
import com.hotelcollection.hotel.repository.RoomTypeRatePlanRepository;
import com.hotelcollection.hotel.mapper.RateMapper;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.CurrentUserAccessor;
import com.hotelcollection.hotel.exception.DomainException;

/**
 * Rate read use cases: active offers (booking window), rate plans, min-price
 * loaders used by the catalog display layer, and the admin workspace views.
 */
@Service
public class RateQueryServiceImpl implements RateQueryService {

	private final PromotionRepository promotionRepository;
	private final RatePlanRepository ratePlanRepository;
	private final RoomTypeRatePlanRepository linkRepository;
	private final RatePlanPriceRepository priceRepository;
	private final CatalogQueryService catalog;
	private final CurrentUserAccessor currentUser;

	public RateQueryServiceImpl(PromotionRepository promotionRepository,
			RatePlanRepository ratePlanRepository, RoomTypeRatePlanRepository linkRepository,
			RatePlanPriceRepository priceRepository, @Lazy CatalogQueryService catalog,
			CurrentUserAccessor currentUser) {
		this.promotionRepository = promotionRepository;
		this.ratePlanRepository = ratePlanRepository;
		this.linkRepository = linkRepository;
		this.priceRepository = priceRepository;
		this.catalog = catalog;
		this.currentUser = currentUser;
	}

	@Override
	@Transactional(readOnly = true)
	public List<Promotion> offers(UUID hotelId) {
		LocalDate today = LocalDate.now();
		return promotionRepository.findActiveByHotelId(hotelId).stream()
				.filter(p -> p.getBookingWindowStart() == null || !today.isBefore(p.getBookingWindowStart()))
				.filter(p -> p.getBookingWindowEnd() == null || !today.isAfter(p.getBookingWindowEnd()))
				.toList();
	}

	@Override
	@Transactional(readOnly = true)
	public List<RatePlan> ratePlans(UUID hotelId) {
		return ratePlanRepository.findByHotelId(hotelId);
	}

	@Override
	@Transactional(readOnly = true)
	public RatePlan ratePlanById(UUID id) {
		return ratePlanRepository.findById(id).orElse(null);
	}

	@Override
	@Transactional(readOnly = true)
	public List<AdminPromotionView> promotions(UUID hotelId) {
		requireStaffAccess(hotelId);
		return promotionRepository.findForHotel(hotelId).stream()
				.map(RateMapper::promotionView).toList();
	}

	@Override
	@Transactional(readOnly = true)
	public List<AdminRatePlanView> ratePlanWorkspace(UUID hotelId) {
		List<RatePlan> plans = ratePlanRepository.findByHotelId(hotelId);
		List<UUID> planIds = plans.stream().map(RatePlan::getId).toList();
		List<RoomTypeRatePlan> allLinks = planIds.isEmpty() ? List.of()
				: linkRepository.findByRatePlanIds(planIds);
		Map<UUID, List<RoomTypeRatePlan>> linksByPlan = allLinks.stream()
				.collect(Collectors.groupingBy(RoomTypeRatePlan::getRatePlanId));
		List<UUID> linkIds = allLinks.stream().map(RoomTypeRatePlan::getId).toList();
		Map<UUID, List<RatePlanPrice>> pricesByLink = linkIds.isEmpty() ? Map.of()
				: priceRepository.findByRoomTypeRatePlanIds(linkIds).stream()
						.collect(Collectors.groupingBy(RatePlanPrice::getRoomTypeRatePlanId));
		Map<UUID, String> roomTypeNames = catalog.roomTypeNamesByIds(
				allLinks.stream().map(RoomTypeRatePlan::getRoomTypeId).distinct().toList());
		return plans.stream()
				.map(rp -> new AdminRatePlanView(rp.getId(), rp.getHotelId(), rp.getName(),
						rp.getCode(), rp.getCurrencyCode(), rp.getMealPlan(),
						rp.getCancellationPolicy(), rp.getPaymentPolicy(), rp.isRefundable(),
						rp.getCancellationDeadlineDays() == null ? null
								: rp.getCancellationDeadlineDays().intValue(),
						rp.getCancellationPenaltyType() == null ? null
								: rp.getCancellationPenaltyType().name(),
						rp.getCancellationPenaltyValue(), rp.getPaymentTiming(),
						rp.getDepositPercentage(), rp.getMinStay() == null ? null
								: rp.getMinStay().intValue(),
						rp.getMaxStay() == null ? null : rp.getMaxStay().intValue(),
						rp.getStatus(), linksByPlan.getOrDefault(rp.getId(), List.of()).stream()
								.map(l -> new RoomTypeRatePlanInfoView(l.getId(),
										l.getRoomTypeId(),
										roomTypeNames.getOrDefault(l.getRoomTypeId(), "?"),
										l.getRatePlanId(), l.getCurrencyCode(),
										pricesByLink.getOrDefault(l.getId(), List.of()).stream()
												.map(pr -> new RatePlanPriceInfoView(pr.getId(),
														pr.getValidFrom(), pr.getValidTo(),
														pr.getPriceAmount()))
												.toList()))
								.toList()))
				.toList();
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, Integer> minPriceByHotelIds(Collection<UUID> ids) {
		return minPriceMap(ids,
				keys -> priceRepository.minPriceByHotelIds(keys, LocalDate.now()));
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, Integer> minPriceByRoomTypeIds(Collection<UUID> ids) {
		return minPriceMap(ids,
				keys -> priceRepository.minPriceByRoomTypeIds(keys, LocalDate.now()));
	}

	private Map<UUID, Integer> minPriceMap(Collection<UUID> ids,
			Function<Collection<UUID>, List<Object[]>> loader) {
		if (ids == null || ids.isEmpty()) {
			return Map.of();
		}
		Map<UUID, Integer> map = new HashMap<>();
		for (Object[] row : loader.apply(ids)) {
			map.put(UUID.fromString(row[0].toString()), ((Number) row[1]).intValue());
		}
		return map;
	}

	private CurrentUser requireStaffAccess(UUID hotelId) {
		CurrentUser actor = currentUser.require();
		if (!actor.hasRole("super_admin") && !actor.inHotel(hotelId)) {
			throw DomainException.forbidden("no access to this hotel");
		}
		return actor;
	}
}