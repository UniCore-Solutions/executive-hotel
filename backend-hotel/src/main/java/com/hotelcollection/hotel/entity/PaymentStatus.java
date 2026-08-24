package com.hotelcollection.hotel.entity;

/** DB CHECK constraint values (chk_reservations_payment_status). */
public enum PaymentStatus {
	pending, authorized, captured, failed, refunded, partially_refunded
}