package com.hotelcollection.hotel.service;

import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.entity.ReservationCancellation;

/**
 * Guest-facing notification use cases. Every send writes a {@code notifications}
 * row first (per ADR-004's pipeline: event → notification row → provider →
 * sent/failed), then attempts delivery through {@link com.hotelcollection.hotel.email.EmailProvider}.
 * A notification failure never throws past this interface — callers (booking/
 * payment flows) must not have their own transaction rolled back by a
 * secondary effect like a failed email.
 */
public interface NotificationService {

	void notifyBookingConfirmed(Reservation reservation);

	void notifyBookingCancelled(Reservation reservation, ReservationCancellation cancellation);
}
