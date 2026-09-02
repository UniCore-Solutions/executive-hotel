package com.hotelcollection.hotel.dto.platform;

/** Platform brand-settings update input (back-office). Nullable fields stay
    unchanged on update, same convention as AdminHotelInput. Slug is never
    editable through this input — it stays whatever the seed/original write set. */
public record AdminPlatformInput(String name, String tagline, String description,
		String status, String defaultCurrency, String contactEmail, String contactPhone) {
}
