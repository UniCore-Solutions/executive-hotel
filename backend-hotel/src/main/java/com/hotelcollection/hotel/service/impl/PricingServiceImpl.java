package com.hotelcollection.hotel.service.impl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.UUID;

import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.dto.rate.CancellationEvaluation;
import com.hotelcollection.hotel.dto.rate.ExtraLineSpec;
import com.hotelcollection.hotel.service.PricingService;
import com.hotelcollection.hotel.dto.rate.Quote;
import com.hotelcollection.hotel.dto.rate.QuoteExtraInput;
import com.hotelcollection.hotel.dto.rate.QuoteInput;
import com.hotelcollection.hotel.dto.rate.QuoteLine;
import com.hotelcollection.hotel.dto.rate.QuoteLineInput;
import com.hotelcollection.hotel.dto.rate.RoomRateOption;
import com.hotelcollection.hotel.dto.rate.TaxChargeSpec;
import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.entity.Extra;
import com.hotelcollection.hotel.entity.ExtraPricingModel;
import com.hotelcollection.hotel.util.MoneyUtil;
import com.hotelcollection.hotel.entity.Promotion;
import com.hotelcollection.hotel.entity.RatePlan;
import com.hotelcollection.hotel.entity.RatePlanPrice;
import com.hotelcollection.hotel.entity.RoomTypeRatePlan;
import com.hotelcollection.hotel.util.CancellationPolicy;
import com.hotelcollection.hotel.entity.TaxFeeChargeType;
import com.hotelcollection.hotel.entity.TaxFeeType;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.repository.PromotionRepository;
import com.hotelcollection.hotel.repository.RatePlanPriceRepository;
import com.hotelcollection.hotel.repository.RatePlanRepository;
import com.hotelcollection.hotel.repository.RoomTypeRatePlanRepository;
import com.hotelcollection.hotel.service.ReferenceQueryService;

/**
 * Pricing engine. Rules mirror the frontend quote math (pricing.ts) and
 * are documented in docs/architecture/invariants.md: single nightly rate per
 * stay from the range covering check-in, taxes/fees from tax_fee_types,
 * single promo code (percentage/fixed only), totals identity (C16).
 * {@link #quote} is the single source of truth for price lines, extras
 * and charges — the booking use case persists exactly what the quote
 * computed (no duplicated pricing logic).
 */
@Service
public class PricingServiceImpl implements PricingService {

	private final RoomTypeRatePlanRepository linkRepository;
	private final RatePlanRepository ratePlanRepository;
	private final RatePlanPriceRepository priceRepository;
	private final PromotionRepository promotionRepository;
	private final CatalogQueryService catalog;
	private final ReferenceQueryService reference;

	public PricingServiceImpl(RoomTypeRatePlanRepository linkRepository,
			RatePlanRepository ratePlanRepository, RatePlanPriceRepository priceRepository,
			PromotionRepository promotionRepository, @Lazy CatalogQueryService catalog,
			ReferenceQueryService reference) {
		this.linkRepository = linkRepository;
		this.ratePlanRepository = ratePlanRepository;
		this.priceRepository = priceRepository;
		this.promotionRepository = promotionRepository;
		this.catalog = catalog;
		this.reference = reference;
	}

	/** Current nightly price of an offered pair on {@code date}, or null. */
	@Override
	@Transactional(readOnly = true)
	public BigDecimal currentPrice(UUID linkId, LocalDate date) {
		return priceRepository.findCurrentByLinkIds(List.of(linkId), date).stream()
				.findFirst()
				.map(RatePlanPrice::getPriceAmount)
				.orElse(null);
	}

	/** Lowest current nightly price of a room type (display "from" price). */
	@Override
	@Transactional(readOnly = true)
	public BigDecimal fromPrice(UUID hotelId, UUID roomTypeId, LocalDate date) {
		List<RoomTypeRatePlan> links = linkRepository.findByHotelIdAndRoomTypeIds(hotelId,
				List.of(roomTypeId));
		if (links.isEmpty()) {
			return null;
		}
		List<RatePlanPrice> prices = priceRepository.findCurrentByLinkIds(
				links.stream().map(RoomTypeRatePlan::getId).toList(), date);
		return prices.stream().map(RatePlanPrice::getPriceAmount).min(BigDecimal::compareTo).orElse(null);
	}

	/** Offered (room_type, rate_plan) options for a stay, with current pricing. */
	@Override
	@Transactional(readOnly = true)
	public List<RoomRateOption> rates(UUID hotelId, UUID roomTypeId, LocalDate checkInDate) {
		List<RoomTypeRatePlan> links = roomTypeId == null
				? linkRepository.findByHotelId(hotelId)
				: linkRepository.findByHotelIdAndRoomTypeIds(hotelId, List.of(roomTypeId));
		if (links.isEmpty()) {
			return List.of();
		}
		Map<UUID, RatePlan> plans = ratePlanRepository.findActiveByIds(
				links.stream().map(RoomTypeRatePlan::getRatePlanId).toList())
				.stream().collect(Collectors.toMap(RatePlan::getId, Function.identity()));
		Map<UUID, RatePlanPrice> prices = priceRepository.findCurrentByLinkIds(
				links.stream().map(RoomTypeRatePlan::getId).toList(), checkInDate)
				.stream().collect(Collectors.toMap(RatePlanPrice::getRoomTypeRatePlanId,
						Function.identity(), (a, b) -> a));

		List<RoomRateOption> options = new ArrayList<>();
		for (RoomTypeRatePlan link : links) {
			RatePlan plan = plans.get(link.getRatePlanId());
			RatePlanPrice price = prices.get(link.getId());
			if (plan == null || price == null) {
				continue;
			}
			options.add(new RoomRateOption(link.getId(), link.getRoomTypeId(), plan.getId(),
					plan.getCode(), plan.getName(), plan.getMealPlan(), price.getPriceAmount(),
					link.getCurrencyCode(), plan.getCancellationPolicy(), plan.isRefundable()));
		}
		return options;
	}

	/** One persisted extra line: an extra snapshot for a booking. */

	/** Server-side quote: the source of truth the booking mutation persists. */
	@Override
	@Transactional(readOnly = true)
	public Quote quote(QuoteInput in) {
		validateStayDates(in.checkInDate(), in.checkOutDate());
		int nights = (int) java.time.temporal.ChronoUnit.DAYS.between(in.checkInDate(), in.checkOutDate());

		List<QuoteLine> lines = new ArrayList<>();
		BigDecimal subtotal = MoneyUtil.ZERO;
		for (QuoteLineInput room : in.rooms()) {
			RoomTypeRatePlan link = linkRepository.findOffer(room.roomTypeId(), room.ratePlanId())
					.orElseThrow(() -> DomainException.validation(
							"room type " + room.roomTypeId() + " and rate plan " + room.ratePlanId()
									+ " is not an offered combination"));
			if (!link.getHotelId().equals(in.hotelId())) {
				throw DomainException.validation("offered combination does not belong to this hotel");
			}
			BigDecimal rate = currentPrice(link.getId(), in.checkInDate());
			if (rate == null) {
				throw DomainException.conflict("no price configured for the selected stay dates");
			}
			BigDecimal lineSubtotal = MoneyUtil.multiply(rate, nights);
			subtotal = subtotal.add(lineSubtotal);
			lines.add(new QuoteLine(link.getRoomTypeId(), link.getRatePlanId(), rate, nights, lineSubtotal));
		}
		if (lines.isEmpty()) {
			throw DomainException.validation("at least one room is required");
		}

		BigDecimal discount = MoneyUtil.ZERO;
		String promoMessage = null;
		boolean valid = true;
		if (in.promoCode() != null && !in.promoCode().isBlank()) {
			PromoOutcome outcome = applyPromo(in, nights, subtotal);
			discount = outcome.discount();
			promoMessage = outcome.message();
			valid = outcome.valid();
		}

		BigDecimal taxedBase = subtotal.subtract(discount).max(MoneyUtil.ZERO);
		List<TaxChargeSpec> charges = taxCharges(in.hotelId(), taxedBase, nights, lines.size(),
				in.adults());
		BigDecimal tax = charges.stream().filter(c -> "tax".equals(c.chargeType()))
				.map(TaxChargeSpec::amount).reduce(MoneyUtil.ZERO, BigDecimal::add);
		BigDecimal fee = charges.stream().filter(c -> "fee".equals(c.chargeType()))
				.map(TaxChargeSpec::amount).reduce(MoneyUtil.ZERO, BigDecimal::add);

		List<ExtraLineSpec> extras = extraLines(in, nights, lines.size());
		BigDecimal extrasTotal = extras.stream().map(ExtraLineSpec::totalPrice)
				.reduce(MoneyUtil.ZERO, BigDecimal::add);

		BigDecimal total = taxedBase.add(tax).add(fee).add(extrasTotal);
		BigDecimal originalTotal = subtotal.add(tax).add(fee).add(extrasTotal);
		return new Quote(in.currencyCode(), subtotal, discount, tax, fee, total, originalTotal, valid,
				lines, extras, charges, promoMessage);
	}

	/**
	 * Tax/fee lines for a stay, per tax_fee_types (percentage, fixed per
	 * night/stay/guest). Shared by the quote (totals) and the booking use
	 * case (persisted reservation_charges).
	 */
	@Override
	@Transactional(readOnly = true)
	public List<TaxChargeSpec> taxCharges(UUID hotelId, BigDecimal taxedBase, int nights,
			int roomsCount, int adults) {
		List<TaxChargeSpec> specs = new ArrayList<>();
		for (TaxFeeType t : reference.findActiveTaxFeeTypesByHotelId(hotelId)) {
			BigDecimal amount = switch (t.getCalculationMethod()) {
				case percentage -> MoneyUtil.percent(taxedBase, t.getValue());
				case fixed_per_night -> MoneyUtil.multiply(t.getValue(), (long) nights * roomsCount);
				case fixed_per_stay -> MoneyUtil.of(t.getValue());
				case fixed_per_guest -> MoneyUtil.multiply(t.getValue(), adults);
			};
			specs.add(new TaxChargeSpec(t.getId(),
					t.getChargeType() == TaxFeeChargeType.tax ? "tax" : "fee",
					t.getName(), amount));
		}
		return specs;
	}

	/**
	 * Extra lines for a stay, per pricing model (mirrors frontend extra
	 * units). Shared by the quote (total) and the booking use case
	 * (persisted reservation_extras); validates hotel and currency.
	 */
	@Override
	@Transactional(readOnly = true)
	public List<ExtraLineSpec> extraLines(QuoteInput in, int nights, int roomsCount) {
		if (in.extras() == null || in.extras().isEmpty()) {
			return List.of();
		}
		List<UUID> ids = in.extras().stream().map(QuoteExtraInput::extraId).toList();
		Map<UUID, Extra> extras = catalog.extrasByIds(ids);
		List<ExtraLineSpec> specs = new ArrayList<>();
		for (QuoteExtraInput e : in.extras()) {
			Extra extra = extras.get(e.extraId());
			if (extra == null || !extra.getHotelId().equals(in.hotelId())) {
				throw DomainException.validation("extra " + e.extraId() + " is not available");
			}
			if (!in.currencyCode().equals(extra.getCurrencyCode())) {
				throw DomainException.validation("extra currency does not match booking currency");
			}
			BigDecimal line = switch (extra.getPricingModel()) {
				case per_stay -> MoneyUtil.multiply(extra.getPriceAmount(), e.quantity());
				case per_night -> MoneyUtil.multiply(extra.getPriceAmount(), (long) e.quantity() * nights);
				case per_person -> MoneyUtil.multiply(extra.getPriceAmount(), (long) e.quantity() * in.adults());
				case per_room -> MoneyUtil.multiply(extra.getPriceAmount(), (long) e.quantity() * roomsCount);
			};
			specs.add(new ExtraLineSpec(e.extraId(), e.quantity(), extra.getPriceAmount(), line,
					extra.getPricingModel() == ExtraPricingModel.per_night));
		}
		return specs;
	}

	/** Extras total for quote/booking, per pricing model (mirrors frontend extra units). */
	@Override
	@Transactional(readOnly = true)
	public BigDecimal extrasTotal(QuoteInput in, int nights, int roomsCount) {
		return extraLines(in, nights, roomsCount).stream().map(ExtraLineSpec::totalPrice)
				.reduce(MoneyUtil.ZERO, BigDecimal::add);
	}

	/** Cancellation evaluation for a booked room line (delegates to the rate rule). */
	@Override
	@Transactional(readOnly = true)
	public CancellationEvaluation evaluateCancellation(RatePlan plan, BigDecimal lineSubtotal,
			BigDecimal ratePerNight, java.time.LocalDate checkInDate) {
		var eval = CancellationPolicy.evaluate(plan, lineSubtotal, ratePerNight, checkInDate);
		return new CancellationEvaluation(eval.isRefundable(), eval.penaltyAmount(),
				eval.refundAmount());
	}

	private void validateStayDates(LocalDate checkIn, LocalDate checkOut) {
		if (checkOut.isBefore(checkIn)) {
			throw DomainException.validation("checkOutDate must be after checkInDate");
		}
		int nights = (int) java.time.temporal.ChronoUnit.DAYS.between(checkIn, checkOut);
		if (nights < 1) {
			throw DomainException.validation("stay must be at least one night");
		}
	}

	/** Soft-failure result of applying a promo code to a quote: an inapplicable or
	    unknown code never fails the whole quote (C16's totals are still valid without
	    it) — {@code valid} carries the promo-specific outcome for the caller to surface. */
	private record PromoOutcome(BigDecimal discount, String message, boolean valid) {
	}

	private PromoOutcome applyPromo(QuoteInput in, int nights, BigDecimal subtotal) {
		String code = in.promoCode().trim();
		Promotion promo = promotionRepository.findByCodeIgnoreCase(code).orElse(null);
		if (promo == null) {
			return new PromoOutcome(MoneyUtil.ZERO,
					"\"" + code + "\" is not a valid promo code. Check the code and try again.", false);
		}
		if (!promo.getStatus().equals("active")
				|| (promo.getHotelId() != null && !promo.getHotelId().equals(in.hotelId()))) {
			return new PromoOutcome(MoneyUtil.ZERO, "promo code is not valid for this hotel", false);
		}
		if (promo.getMinNights() != null && nights < promo.getMinNights()) {
			return new PromoOutcome(MoneyUtil.ZERO, "promo code requires a stay of at least "
					+ promo.getMinNights() + " nights", false);
		}
		if (promo.getStayWindowStart() != null && in.checkInDate().isBefore(promo.getStayWindowStart())
				|| promo.getStayWindowEnd() != null
						&& in.checkInDate().isAfter(promo.getStayWindowEnd())) {
			return new PromoOutcome(MoneyUtil.ZERO, "promo code does not apply to these stay dates",
					false);
		}
		if (promo.getDiscountType() == com.hotelcollection.hotel.entity.PromotionDiscountType.stay_x_pay_y) {
			return new PromoOutcome(MoneyUtil.ZERO,
					"stay_x_pay_y promos are not supported yet (see docs/architecture/invariants.md)",
					false);
		}
		BigDecimal discount = switch (promo.getDiscountType()) {
			case percentage -> MoneyUtil.percent(subtotal, promo.getDiscountValue());
			case fixed_amount -> promo.getDiscountValue().min(subtotal);
			case stay_x_pay_y -> MoneyUtil.ZERO; // handled above
		};
		return new PromoOutcome(discount, promo.getName() + " — " + promo.getCode() + " applied.", true);
	}
}