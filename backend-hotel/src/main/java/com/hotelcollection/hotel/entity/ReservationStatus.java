package com.hotelcollection.hotel.entity;

/** DB CHECK constraint values (chk_reservations_status). */
public enum ReservationStatus {
	pending, confirmed, modified, cancelled, checked_in, checked_out, no_show
}