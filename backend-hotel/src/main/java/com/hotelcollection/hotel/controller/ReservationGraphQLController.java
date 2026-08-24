package com.hotelcollection.hotel.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import com.hotelcollection.hotel.dto.PageInput;
import com.hotelcollection.hotel.dto.reservation.CancelReservationInput;
import com.hotelcollection.hotel.dto.reservation.CreateReservationInput;
import com.hotelcollection.hotel.dto.reservation.ReservationLookupInput;
import com.hotelcollection.hotel.dto.reservation.ReservationPageResult;
import com.hotelcollection.hotel.dto.reservation.ReservationResult;
import com.hotelcollection.hotel.entity.Guest;
import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.entity.ReservationCancellation;
import com.hotelcollection.hotel.entity.ReservationStatus;
import com.hotelcollection.hotel.service.BookingService;

/**
 * Reservation GraphQL controller: booking creation, cancellation (guest and
 * back-office), reservation lookups and guest-related field resolvers.
 * Authorization is enforced inside the service layer.
 */
@Controller
public class ReservationGraphQLController {

	private final BookingService booking;

	public ReservationGraphQLController(BookingService booking) {
		this.booking = booking;
	}

	@MutationMapping
	public ReservationResult createReservation(@Argument CreateReservationInput input) {
		var result = booking.create(input);
		return new ReservationResult(result.reservation(), result.created());
	}

	@MutationMapping
	public ReservationResult cancelReservation(@Argument CancelReservationInput input) {
		return new ReservationResult(booking.cancel(input), false);
	}

	@MutationMapping
	public Reservation adminCancelReservation(@Argument UUID reservationId,
			@Argument String reasonCode, @Argument String reasonNote) {
		return booking.adminCancel(reservationId, reasonCode, reasonNote);
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
}