package com.hotelcollection.hotel.dto.identity;

import com.hotelcollection.hotel.security.CurrentUser;

public record AuthPayload(String token, CurrentUser me) {
}