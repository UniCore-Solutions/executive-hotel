package com.hotelcollection.hotel.dto.billing;

import java.util.List;

import com.hotelcollection.hotel.entity.Payment;

public record PaymentPageResult(long total, int page, int size, List<Payment> items) {
}
