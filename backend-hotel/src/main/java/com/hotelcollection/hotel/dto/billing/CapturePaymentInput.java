package com.hotelcollection.hotel.dto.billing;
import java.util.UUID;

public record CapturePaymentInput(UUID paymentId, String gatewayReference, String guestEmail) {
}