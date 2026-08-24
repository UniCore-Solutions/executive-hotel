package com.hotelcollection.hotel.dto.reservation;
import java.util.UUID;

public record ExtraInput(UUID extraId, int quantity) {
}