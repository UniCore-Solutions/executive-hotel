package com.hotelcollection.hotel.dto.catalog;

/** Policy replacement row (back-office): name/value are required, owner comes
    from the mutation. Mirrors dto/media/MediaInput's replace-list shape. */
public record HotelPolicyInput(String name, String value, String icon, Integer sortOrder) {
}
