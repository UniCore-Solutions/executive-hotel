package com.hotelcollection.hotel.dto.rate;
import java.util.UUID;

public record QuoteLineInput(UUID roomTypeId, UUID ratePlanId) {
}