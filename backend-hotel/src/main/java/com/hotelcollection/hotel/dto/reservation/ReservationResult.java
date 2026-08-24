package com.hotelcollection.hotel.dto.reservation;

import com.hotelcollection.hotel.entity.Reservation;

public record ReservationResult(Reservation reservation, boolean created) {
}