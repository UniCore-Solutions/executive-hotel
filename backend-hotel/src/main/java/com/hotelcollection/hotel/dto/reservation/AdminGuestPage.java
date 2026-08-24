package com.hotelcollection.hotel.dto.reservation;

import java.util.List;

public record AdminGuestPage(long total, int page, int size, List<AdminGuestView> items) {
}
