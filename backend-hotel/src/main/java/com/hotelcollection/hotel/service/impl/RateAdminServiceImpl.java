package com.hotelcollection.hotel.service.impl;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.service.AuditService;
import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.security.CurrentUserAccessor;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.dto.rate.AdminPromotionInput;
import com.hotelcollection.hotel.dto.rate.AdminPromotionView;
import com.hotelcollection.hotel.dto.rate.AdminRatePlanInput;
import com.hotelcollection.hotel.service.RateAdminService;
import com.hotelcollection.hotel.dto.rate.RatePlanPriceInfoView;
import com.hotelcollection.hotel.dto.rate.RatePlanPriceInput;
import com.hotelcollection.hotel.dto.rate.RoomTypeRatePlanInfoView;
import com.hotelcollection.hotel.entity.CancellationPenaltyType;
import com.hotelcollection.hotel.entity.Promotion;
import com.hotelcollection.hotel.entity.PromotionDiscountType;
import com.hotelcollection.hotel.entity.RatePlan;
import com.hotelcollection.hotel.entity.RatePlanPrice;
import com.hotelcollection.hotel.entity.RoomTypeRatePlan;
import com.hotelcollection.hotel.mapper.RateMapper;
import com.hotelcollection.hotel.repository.PromotionRepository;
import com.hotelcollection.hotel.repository.RatePlanPriceRepository;
import com.hotelcollection.hotel.repository.RatePlanRepository;
import com.hotelcollection.hotel.repository.RateRestrictionRepository;
import com.hotelcollection.hotel.repository.RoomTypeRatePlanRepository;
import com.hotelcollection.hotel.service.ReferenceQueryService;
import com.hotelcollection.hotel.exception.DomainException;

/**
 * Back-office rate write use cases (rate plans, links, price ranges,
 * promotions). Authorization (hotel scoping / super_admin for platform-wide
 * promotions) is enforced internally.
 */
@Service
public class RateAdminServiceImpl implements RateAdminService {

	private final RatePlanRepository ratePlanRepository;
	private final RoomTypeRatePlanRepository linkRepository;
	private final RatePlanPriceRepository priceRepository;
	private final RateRestrictionRepository restrictionRepository;
	private final PromotionRepository promotionRepository;
	private final CatalogQueryService catalog;
	private final ReferenceQueryService reference;
	private final AuditService audit;
	private final CurrentUserAccessor currentUser;

	public RateAdminServiceImpl(RatePlanRepository ratePlanRepository,
			RoomTypeRatePlanRepository linkRepository, RatePlanPriceRepository priceRepository,
			RateRestrictionRepository restrictionRepository,
			PromotionRepository promotionRepository, CatalogQueryService catalog,
			ReferenceQueryService reference, AuditService audit, CurrentUserAccessor currentUser) {
		this.ratePlanRepository = ratePlanRepository;
		this.linkRepository = linkRepository;
		this.priceRepository = priceRepository;
		this.restrictionRepository = restrictionRepository;
		this.promotionRepository = promotionRepository;
		this.catalog = catalog;
		this.reference = reference;
		this.audit = audit;
		this.currentUser = currentUser;
	}

	// ---------------------------------------------------------------- rate plans

	@Override
	@Transactional
	public RatePlan createRatePlan(UUID hotelId, AdminRatePlanInput in) {
		CurrentUser actor = requireStaffAccess(hotelId);
		catalog.getHotel(hotelId);
		String code = required(in.code(), "code").trim().toLowerCase();
		if (ratePlanRepository.findByHotelIdAndCode(hotelId, code).isPresent()) {
			throw DomainException.conflict("a rate plan with this code already exists");
		}
		RatePlan plan = new RatePlan();
		plan.setHotelId(hotelId);
		plan.setName(required(in.name(), "name"));
		plan.setCode(code);
		plan.setCurrencyCode(validateCurrency(in.currencyCode(), "currencyCode"));
		plan.setMealPlan(in.mealPlan());
		plan.setCancellationPolicy(in.cancellationPolicy());
		plan.setPaymentPolicy(in.paymentPolicy());
		plan.setRefundable(in.isRefundable() == null ? true : in.isRefundable());
		plan.setCancellationDeadlineDays(in.cancellationDeadlineDays() == null ? null
				: in.cancellationDeadlineDays().shortValue());
		plan.setCancellationPenaltyType(in.cancellationPenaltyType() == null ? null
				: parseEnum(CancellationPenaltyType.class, in.cancellationPenaltyType(),
						"cancellationPenaltyType"));
		plan.setCancellationPenaltyValue(in.cancellationPenaltyValue());
		plan.setPaymentTiming(validPaymentTiming(in.paymentTiming()));
		plan.setDepositPercentage(in.depositPercentage());
		plan.setMinStay(in.minStay() == null ? null : in.minStay().shortValue());
		plan.setMaxStay(in.maxStay() == null ? null : in.maxStay().shortValue());
		plan.setStatus(in.status() == null ? "active" : validPlanStatus(in.status()));
		plan.setCreatedAt(Instant.now());
		plan.setUpdatedAt(Instant.now());
		ratePlanRepository.save(plan);
		audit.record(actor, "rate_plan.created", "rate_plan", plan.getId(), hotelId,
				Map.of("code", plan.getCode()));
		return plan;
	}

	@Override
	@Transactional
	public RatePlan updateRatePlan(UUID id, AdminRatePlanInput in) {
		RatePlan plan = ratePlanRepository.findById(id)
				.orElseThrow(() -> DomainException.notFound("rate plan not found"));
		CurrentUser actor = requireStaffAccess(plan.getHotelId());
		if (in.name() != null) {
			plan.setName(required(in.name(), "name"));
		}
		if (in.code() != null) {
			String code = in.code().trim().toLowerCase();
			ratePlanRepository.findByHotelIdAndCode(plan.getHotelId(), code)
					.filter(existing -> !existing.getId().equals(id))
					.ifPresent(existing -> {
						throw DomainException.conflict("a rate plan with this code already exists");
					});
			plan.setCode(code);
		}
		if (in.currencyCode() != null) {
			plan.setCurrencyCode(validateCurrency(in.currencyCode(), "currencyCode"));
		}
		applyIfPresent(in.mealPlan(), plan::setMealPlan);
		applyIfPresent(in.cancellationPolicy(), plan::setCancellationPolicy);
		applyIfPresent(in.paymentPolicy(), plan::setPaymentPolicy);
		if (in.isRefundable() != null) {
			plan.setRefundable(in.isRefundable());
		}
		if (in.cancellationDeadlineDays() != null) {
			plan.setCancellationDeadlineDays(in.cancellationDeadlineDays().shortValue());
		}
		if (in.cancellationPenaltyType() != null) {
			plan.setCancellationPenaltyType(parseEnum(CancellationPenaltyType.class,
					in.cancellationPenaltyType(), "cancellationPenaltyType"));
		}
		applyIfPresent(in.cancellationPenaltyValue(), plan::setCancellationPenaltyValue);
		if (in.paymentTiming() != null) {
			plan.setPaymentTiming(validPaymentTiming(in.paymentTiming()));
		}
		applyIfPresent(in.depositPercentage(), plan::setDepositPercentage);
		if (in.minStay() != null) {
			plan.setMinStay(in.minStay().shortValue());
		}
		if (in.maxStay() != null) {
			plan.setMaxStay(in.maxStay().shortValue());
		}
		if (in.status() != null) {
			plan.setStatus(validPlanStatus(in.status()));
		}
		plan.setUpdatedAt(Instant.now());
		try {
			ratePlanRepository.saveAndFlush(plan);
		} catch (DataIntegrityViolationException ex) {
			// C8 composite FK: currency pinned by existing links cannot change
			throw DomainException.conflict(
					"currency cannot change while the rate plan is linked to room types");
		}
		audit.record(actor, "rate_plan.updated", "rate_plan", plan.getId(), plan.getHotelId(),
				Map.of("code", plan.getCode()));
		return plan;
	}

	// ---------------------------------------------------------------- pricing

	@Override
	@Transactional
	public RoomTypeRatePlanInfoView linkRoomTypeRatePlan(UUID roomTypeId, UUID ratePlanId) {
		CurrentUser actor = currentUser.require();
		RoomType rt = catalog.getRoomType(roomTypeId);
		RatePlan plan = ratePlanRepository.findById(ratePlanId)
				.orElseThrow(() -> DomainException.validation("rate plan not found"));
		if (!rt.getHotelId().equals(plan.getHotelId())) {
			throw DomainException.validation("room type and rate plan belong to different hotels");
		}
		requireStaffAccess(rt.getHotelId());
		requireStaffAccess(plan.getHotelId());
		RoomTypeRatePlan link = linkRepository.findOffer(roomTypeId, ratePlanId).orElseGet(() -> {
			RoomTypeRatePlan created = new RoomTypeRatePlan();
			created.setHotelId(rt.getHotelId());
			created.setRoomTypeId(roomTypeId);
			created.setRatePlanId(ratePlanId);
			created.setCurrencyCode(plan.getCurrencyCode());
			return linkRepository.save(created);
		});
		audit.record(actor, "rate_plan.linked", "room_type_rate_plan", link.getId(),
				rt.getHotelId(), Map.of("roomTypeId", roomTypeId, "ratePlanId", ratePlanId));
		return new RoomTypeRatePlanInfoView(link.getId(), link.getRoomTypeId(), rt.getName(),
				link.getRatePlanId(), link.getCurrencyCode(),
				priceRepository.findByRoomTypeRatePlanId(link.getId()).stream()
						.map(pr -> new RatePlanPriceInfoView(pr.getId(), pr.getValidFrom(),
								pr.getValidTo(), pr.getPriceAmount()))
						.toList());
	}

	@Override
	@Transactional
	public boolean unlinkRoomTypeRatePlan(UUID linkId) {
		CurrentUser actor = requireStaffAccessForLink(linkId);
		RoomTypeRatePlan link = linkRepository.findById(linkId)
				.orElseThrow(() -> DomainException.notFound("rate plan link not found"));
		restrictionRepository.deleteByRoomTypeRatePlanId(linkId);
		priceRepository.deleteByRoomTypeRatePlanId(linkId);
		linkRepository.delete(link);
		audit.record(actor, "rate_plan.unlinked", "room_type_rate_plan", linkId, link.getHotelId(),
				Map.of("roomTypeId", link.getRoomTypeId(), "ratePlanId", link.getRatePlanId()));
		return true;
	}

	@Override
	@Transactional
	public List<RatePlanPriceInfoView> setRatePlanPrices(UUID linkId,
			List<RatePlanPriceInput> inputs) {
		CurrentUser actor = requireStaffAccessForLink(linkId);
		RoomTypeRatePlan link = linkRepository.findById(linkId)
				.orElseThrow(() -> DomainException.notFound("rate plan link not found"));
		if (inputs == null || inputs.isEmpty()) {
			throw DomainException.validation("at least one price range is required");
		}
		for (RatePlanPriceInput in : inputs) {
			if (in.validFrom() == null || in.validTo() == null || in.validFrom().isAfter(
					in.validTo())) {
				throw DomainException.validation("invalid price range dates");
			}
			if (in.priceAmount() == null || in.priceAmount().signum() <= 0) {
				throw DomainException.validation("price must be positive");
			}
		}
		List<RatePlanPriceInfoView> saved = new ArrayList<>();
		try {
			priceRepository.deleteByRoomTypeRatePlanId(linkId);
			Instant now = Instant.now();
			for (RatePlanPriceInput in : inputs) {
				RatePlanPrice price = new RatePlanPrice();
				price.setRoomTypeRatePlanId(linkId);
				price.setCurrencyCode(link.getCurrencyCode());
				price.setValidFrom(in.validFrom());
				price.setValidTo(in.validTo());
				price.setPriceAmount(in.priceAmount());
				price.setCreatedAt(now);
				price.setUpdatedAt(now);
				RatePlanPrice persisted = priceRepository.save(price);
				saved.add(new RatePlanPriceInfoView(persisted.getId(), persisted.getValidFrom(),
						persisted.getValidTo(), persisted.getPriceAmount()));
			}
			priceRepository.flush();
		} catch (DataIntegrityViolationException ex) {
			throw DomainException.conflict("price ranges overlap (inclusive bounds)");
		}
		audit.record(actor, "rate_plan.prices.updated", "room_type_rate_plan", linkId,
				link.getHotelId(), Map.of("count", saved.size()));
		return saved;
	}

	// ---------------------------------------------------------------- promotions

	@Override
	@Transactional
	public AdminPromotionView createPromotion(UUID hotelId, AdminPromotionInput in) {
		CurrentUser actor = currentUser.require();
		if (hotelId == null) {
			requireSuperAdmin(actor);
		} else {
			requireStaffAccess(hotelId);
		}
		String code = required(in.code(), "code").trim().toLowerCase();
		promotionRepository.findByCodeIgnoreCase(code).ifPresent(existing -> {
			throw DomainException.conflict("a promotion with this code already exists");
		});
		Promotion promotion = new Promotion();
		promotion.setHotelId(hotelId);
		promotion.setCode(code);
		promotion.setName(required(in.name(), "name"));
		applyPromotionInput(promotion, in);
		if (promotion.getStatus() == null) {
			promotion.setStatus("active");
		}
		promotion.setCreatedAt(Instant.now());
		promotion.setUpdatedAt(Instant.now());
		promotionRepository.save(promotion);
		audit.record(actor, "promotion.created", "promotion", promotion.getId(), hotelId,
				Map.of("code", promotion.getCode()));
		return RateMapper.promotionView(promotion);
	}

	@Override
	@Transactional
	public AdminPromotionView updatePromotion(UUID id, AdminPromotionInput in) {
		Promotion promotion = promotionRepository.findById(id)
				.orElseThrow(() -> DomainException.notFound("promotion not found"));
		CurrentUser actor = requirePromotionScope(promotion);
		if (in.code() != null) {
			promotionRepository.findByCodeIgnoreCase(in.code())
					.filter(existing -> !existing.getId().equals(id))
					.ifPresent(existing -> {
						throw DomainException.conflict("a promotion with this code already exists");
					});
		}
		applyPromotionInput(promotion, in);
		promotion.setUpdatedAt(Instant.now());
		promotionRepository.save(promotion);
		audit.record(actor, "promotion.updated", "promotion", promotion.getId(),
				promotion.getHotelId(), Map.of("code", promotion.getCode()));
		return RateMapper.promotionView(promotion);
	}

	@Override
	@Transactional
	public AdminPromotionView setPromotionStatus(UUID id, String status) {
		Promotion promotion = promotionRepository.findById(id)
				.orElseThrow(() -> DomainException.notFound("promotion not found"));
		CurrentUser actor = requirePromotionScope(promotion);
		promotion.setStatus(validPromotionStatus(status));
		promotion.setUpdatedAt(Instant.now());
		promotionRepository.save(promotion);
		audit.record(actor, "promotion.status.updated", "promotion", promotion.getId(),
				promotion.getHotelId(), Map.of("status", promotion.getStatus()));
		return RateMapper.promotionView(promotion);
	}

	// ---------------------------------------------------------------- helpers

	private void applyPromotionInput(Promotion promotion, AdminPromotionInput in) {
		if (in.code() != null) {
			promotion.setCode(required(in.code(), "code"));
		}
		if (in.name() != null) {
			promotion.setName(required(in.name(), "name"));
		}
		applyIfPresent(in.description(), promotion::setDescription);
		if (in.discountType() != null) {
			promotion.setDiscountType(parseEnum(PromotionDiscountType.class,
					in.discountType(), "discountType"));
		}
		if (in.discountValue() != null) {
			if (in.discountValue().signum() <= 0
					|| (promotion.getDiscountType() == PromotionDiscountType.percentage
							&& in.discountValue().compareTo(new BigDecimal("100")) > 0)) {
				throw DomainException.validation("invalid discount value");
			}
			promotion.setDiscountValue(in.discountValue());
		}
		applyIfPresent(in.bookingWindowStart(), promotion::setBookingWindowStart);
		applyIfPresent(in.bookingWindowEnd(), promotion::setBookingWindowEnd);
		applyIfPresent(in.stayWindowStart(), promotion::setStayWindowStart);
		applyIfPresent(in.stayWindowEnd(), promotion::setStayWindowEnd);
		if (in.minNights() != null) {
			promotion.setMinNights(in.minNights().shortValue());
		}
		applyIfPresent(in.maxUsageTotal(), promotion::setMaxUsageTotal);
		applyIfPresent(in.maxUsagePerGuest(), promotion::setMaxUsagePerGuest);
		if (in.stackable() != null) {
			promotion.setStackable(in.stackable());
		}
		if (in.appliesToAllRoomTypes() != null) {
			promotion.setAppliesToAllRoomTypes(in.appliesToAllRoomTypes());
		}
		if (in.appliesToAllRatePlans() != null) {
			promotion.setAppliesToAllRatePlans(in.appliesToAllRatePlans());
		}
		applyIfPresent(in.applicableDaysOfWeek(), promotion::setApplicableDaysOfWeek);
		if (in.status() != null) {
			promotion.setStatus(validPromotionStatus(in.status()));
		}
	}

	private CurrentUser requireStaffAccess(UUID hotelId) {
		return currentUser.requireHotelAccess(hotelId);
	}

	private CurrentUser requireStaffAccessForLink(UUID linkId) {
		RoomTypeRatePlan link = linkRepository.findById(linkId)
				.orElseThrow(() -> DomainException.notFound("rate plan link not found"));
		return currentUser.requireHotelAccess(link.getHotelId());
	}

	private CurrentUser requirePromotionScope(Promotion promotion) {
		// A promotion with no hotelId is platform-wide, so it takes super_admin;
		// a hotel-scoped one takes staff access at that hotel.
		if (promotion.getHotelId() == null) {
			return currentUser.requireSuperAdmin();
		}
		return currentUser.requireHotelAccess(promotion.getHotelId());
	}

	private void requireSuperAdmin(CurrentUser actor) {
		if (!actor.hasRole("super_admin")) {
			throw DomainException.forbidden("super_admin role required");
		}
	}

	private String required(String value, String field) {
		if (value == null || value.isBlank()) {
			throw DomainException.validation(field + " is required");
		}
		return value;
	}

	private <T> void applyIfPresent(T value, java.util.function.Consumer<T> setter) {
		if (value != null) {
			setter.accept(value);
		}
	}

	private String validateCurrency(String code, String field) {
		String trimmed = required(code, field).trim().toUpperCase();
		if (!reference.currencyExists(trimmed)) {
			throw DomainException.validation("unknown currency: " + trimmed);
		}
		return trimmed;
	}

	private <E extends Enum<E>> E parseEnum(Class<E> type, String value, String field) {
		try {
			return Enum.valueOf(type, value.trim().toLowerCase());
		} catch (IllegalArgumentException | NullPointerException ex) {
			throw DomainException.validation("invalid " + field);
		}
	}

	private String validPaymentTiming(String timing) {
		String value = timing == null ? "pay_at_property" : timing;
		if (!List.of("pay_at_property", "prepay_full", "prepay_deposit").contains(value)) {
			throw DomainException.validation("invalid payment timing");
		}
		return value;
	}

	private String validPlanStatus(String status) {
		if (!List.of("active", "inactive").contains(status)) {
			throw DomainException.validation("invalid rate plan status");
		}
		return status;
	}

	private String validPromotionStatus(String status) {
		if (!List.of("active", "inactive", "expired").contains(status)) {
			throw DomainException.validation("invalid promotion status");
		}
		return status;
	}
}