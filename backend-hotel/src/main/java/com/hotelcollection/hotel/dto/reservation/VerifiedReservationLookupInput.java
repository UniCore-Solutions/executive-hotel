package com.hotelcollection.hotel.dto.reservation;

import java.util.UUID;

public record VerifiedReservationLookupInput(String reference, String email, UUID lookupToken) {
}
