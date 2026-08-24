package com.hotelcollection.hotel.dto.reservation;

import com.hotelcollection.hotel.entity.Reservation;

public record CreateResult(Reservation reservation, boolean created) {
}