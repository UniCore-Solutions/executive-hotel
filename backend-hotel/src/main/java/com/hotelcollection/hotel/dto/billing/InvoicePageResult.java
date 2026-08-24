package com.hotelcollection.hotel.dto.billing;

import java.util.List;

import com.hotelcollection.hotel.entity.Invoice;

public record InvoicePageResult(long total, int page, int size, List<Invoice> items) {
}
