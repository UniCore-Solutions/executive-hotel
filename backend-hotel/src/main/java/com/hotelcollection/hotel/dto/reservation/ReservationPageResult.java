package com.hotelcollection.hotel.dto.reservation;

import java.util.List;

import com.hotelcollection.hotel.entity.Reservation;

public record ReservationPageResult(long total, int page, int size, List<Reservation> items) {
}