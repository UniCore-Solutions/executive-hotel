package com.hotelcollection.hotel.dto.catalog;
import com.hotelcollection.hotel.dto.PageInput;

public record HotelSearchInput(String query, PageInput page, String sort) {
}