package com.hotelcollection.hotel.controller;

import java.time.LocalDate;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.BatchMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import com.hotelcollection.hotel.dto.PageInput;
import com.hotelcollection.hotel.dto.reservation.ReservationLookupInput;
import com.hotelcollection.hotel.dto.reservation.ReservationPageResult;
import com.hotelcollection.hotel.entity.Guest;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.entity.RatePlan;
import com.hotelcollection.hotel.util.PaymentTerms;
import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.entity.ReservationCancellation;
import com.hotelcollection.hotel.entity.ReservationRoom;
import com.hotelcollection.hotel.entity.ReservationStatus;
import com.hotelcollection.hotel.service.BookingService;
import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.service.PricingService;

/**
 * Reservation GraphQL controller — READ side only (API rule: GraphQL =
 * READ, REST = WRITE/ACTION). Creation and cancellation are REST writes
 * (POST /api/v1/reservations, .../{reference}/cancel,
 * /api/v1/admin/reservations/{id}/cancel). Authorization is enforced inside
 * the service layer.
 */
@Controller
public class ReservationGraphQLController {

	private final BookingService booking;
	private final CatalogQueryService catalog;
	private final PricingService pricing;

	public ReservationGraphQLController(BookingService booking, CatalogQueryService catalog,
			PricingService pricing) {
		this.booking = booking;
		this.catalog = catalog;
		this.pricing = pricing;
	}

	@QueryMapping
	public List<Reservation> myReservations() {
		return booking.myReservations();
	}

	@QueryMapping
	public Reservation reservation(@Argument ReservationLookupInput input) {
		return booking.getByReferenceAndEmail(input.reference(), input.email());
	}

	@QueryMapping
	public ReservationPageResult adminReservations(@Argument UUID hotelId,
			@Argument ReservationStatus status, @Argument PageInput page) {
		return booking.adminReservations(hotelId, status, page);
	}

	@SchemaMapping(typeName = "Reservation", field = "guest")
	public Guest reservationGuest(Reservation r) {
		return r.getGuest();
	}

	@SchemaMapping(typeName = "ReservationCancellation", field = "reason")
	public String cancellationReason(ReservationCancellation c) {
		return booking.cancellationReasonLabel(c.getCancellationReasonId());
	}

	// Room identity on reservation lines: roomLines persist only the room-type
	// id (a snapshot), so the display name and a representative image are
	// resolved from the current catalog (batch, no N+1).
	@BatchMapping(typeName = "ReservationRoomLine", field = "roomTypeName")
	public Map<ReservationRoom, String> roomLineNames(Collection<ReservationRoom> lines) {
		Map<UUID, String> names = catalog.roomTypeNamesByIds(
				lines.stream().map(ReservationRoom::getRoomTypeId).collect(Collectors.toSet()));
		return lines.stream().collect(Collectors.toMap(l -> l,
				l -> names.getOrDefault(l.getRoomTypeId(), "Room")));
	}

	@BatchMapping(typeName = "ReservationRoomLine", field = "roomTypeImageUrl")
	public Map<ReservationRoom, String> roomLineImages(Collection<ReservationRoom> lines) {
		Map<UUID, List<Media>> media = catalog.mediaByRoomTypeIds(
				lines.stream().map(ReservationRoom::getRoomTypeId).collect(Collectors.toSet()));
		return lines.stream().collect(Collectors.toMap(l -> l,
				l -> media.getOrDefault(l.getRoomTypeId(), List.of()).stream()
						.findFirst().map(Media::getUrl).orElse(null)));
	}

	@BatchMapping(typeName = "ReservationRoomLine", field = "ratePlanName")
	public Map<ReservationRoom, String> roomLineRatePlans(Collection<ReservationRoom> lines) {
		Map<UUID, String> names = pricing.ratePlanNamesByIds(
				lines.stream().map(ReservationRoom::getRatePlanId).collect(Collectors.toSet()));
		return lines.stream().collect(Collectors.toMap(l -> l,
				l -> names.get(l.getRatePlanId())));
	}

	// Cancellation terms: resolved from the current rate catalog so the
	// guest sees the real policy instead of a client-side guess. Deliberately
	// exposes only the two facts a display needs (refundable? free until
	// when?) — never a computed penalty amount, which requires the plan's
	// penalty type/value and belongs to CancellationPolicy/BookingService's
	// actual cancel path, not a read-side resolver.
	@BatchMapping(typeName = "ReservationRoomLine", field = "isRefundable")
	public Map<ReservationRoom, Boolean> roomLineIsRefundable(Collection<ReservationRoom> lines) {
		Map<UUID, RatePlan> plans = pricing.ratePlansByIds(
				lines.stream().map(ReservationRoom::getRatePlanId).collect(Collectors.toSet()));
		return lines.stream().collect(Collectors.toMap(l -> l, l -> {
			RatePlan plan = plans.get(l.getRatePlanId());
			// Plan deleted after booking: no policy left to check, so don't
			// show a scary "non-refundable" — mirrors doCancel's own
			// fall-through-to-penalty-free handling of the same case.
			return plan == null || plan.isRefundable();
		}));
	}

	/**
	 * Settlement terms of this line's rate plan, resolved from the current rate
	 * catalog the same way the cancellation fields are — room lines persist
	 * only the rate-plan id. Lets the confirmation say "due at the property"
	 * instead of reporting a payment that is pending forever by design.
	 */
	@BatchMapping(typeName = "ReservationRoomLine", field = "paymentTiming")
	public Map<ReservationRoom, String> roomLinePaymentTiming(Collection<ReservationRoom> lines) {
		Map<UUID, RatePlan> plans = pricing.ratePlansByIds(
				lines.stream().map(ReservationRoom::getRatePlanId).collect(Collectors.toSet()));
		return lines.stream().collect(Collectors.toMap(l -> l, l -> {
			RatePlan plan = plans.get(l.getRatePlanId());
			// Plan deleted after booking: fall back to the prepaid reading,
			// matching PaymentTerms' own treatment of an unknown value.
			return plan == null ? PaymentTerms.PREPAY_FULL : plan.getPaymentTiming();
		}));
	}

	@BatchMapping(typeName = "ReservationRoomLine", field = "freeCancellationUntil")
	public Map<ReservationRoom, LocalDate> roomLineFreeCancellationUntil(Collection<ReservationRoom> lines) {
		Map<UUID, RatePlan> plans = pricing.ratePlansByIds(
				lines.stream().map(ReservationRoom::getRatePlanId).collect(Collectors.toSet()));
		Map<ReservationRoom, LocalDate> result = new HashMap<>();
		for (ReservationRoom line : lines) {
			RatePlan plan = plans.get(line.getRatePlanId());
			LocalDate freeUntil = null;
			if (plan != null && plan.isRefundable() && plan.getCancellationDeadlineDays() != null) {
				freeUntil = line.getCheckInDate().minusDays(plan.getCancellationDeadlineDays());
			}
			result.put(line, freeUntil);
		}
		return result;
	}
}