package com.hotelcollection.hotel.dto.catalog;

import java.util.List;

import com.hotelcollection.hotel.entity.Hotel;

public record HotelSearchResult(long total, int page, int size, List<Hotel> items) {
}