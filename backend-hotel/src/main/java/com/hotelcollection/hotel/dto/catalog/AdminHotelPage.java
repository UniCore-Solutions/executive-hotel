package com.hotelcollection.hotel.dto.catalog;

import java.util.List;

public record AdminHotelPage(long total, int page, int size, List<AdminHotelSummary> items) {
}
