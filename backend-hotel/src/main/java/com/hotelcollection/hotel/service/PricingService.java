package com.hotelcollection.hotel.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.hotelcollection.hotel.entity.RatePlan;
import com.hotelcollection.hotel.dto.rate.CancellationEvaluation;
import com.hotelcollection.hotel.dto.rate.ExtraLineSpec;
import com.hotelcollection.hotel.dto.rate.Quote;
import com.hotelcollection.hotel.dto.rate.QuoteInput;
import com.hotelcollection.hotel.dto.rate.RoomRateOption;
import com.hotelcollection.hotel.dto.rate.TaxChargeSpec;

/**
 * Pricing use cases: server-side quote (single source of truth for price
 * lines, extras and charges), display rates and cancellation evaluation.
 */
public interface PricingService {

	BigDecimal currentPrice(UUID linkId, LocalDate date);

	BigDecimal fromPrice(UUID hotelId, UUID roomTypeId, LocalDate date);

	List<RoomRateOption> rates(UUID hotelId, UUID roomTypeId, LocalDate checkInDate);

	Quote quote(QuoteInput in);

	List<TaxChargeSpec> taxCharges(UUID hotelId, BigDecimal taxedBase, int nights, int roomsCount,
			int adults);

	List<ExtraLineSpec> extraLines(QuoteInput in, int nights, int roomsCount);

	BigDecimal extrasTotal(QuoteInput in, int nights, int roomsCount);

	/**
	 * Cancellation evaluation for a booked room line (delegates to the
	 * rate service's cancellation rule).
	 */
	CancellationEvaluation evaluateCancellation(RatePlan plan, BigDecimal lineSubtotal,
			BigDecimal ratePerNight, LocalDate checkInDate);

	/**
	 * Display names for rate plans by id (batch) — used by reservation room
	 * lines, which persist only the rate-plan id (a snapshot). Plans that no
	 * longer exist are omitted from the map.
	 */
	Map<UUID, String> ratePlanNamesByIds(Collection<UUID> ids);

	/**
	 * Rate plans by id (batch) — used to resolve a reservation room line's
	 * cancellation terms (isRefundable / freeCancellationUntil) for display.
	 * Plans that no longer exist are omitted from the map.
	 */
	Map<UUID, RatePlan> ratePlansByIds(Collection<UUID> ids);
}