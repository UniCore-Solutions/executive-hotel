package com.hotelcollection.hotel.dto.rate;

import java.math.BigDecimal;
import java.util.List;

public record Quote(String currencyCode, BigDecimal subtotalAmount, BigDecimal discountAmount,
		BigDecimal taxAmount, BigDecimal feeAmount, BigDecimal totalAmount, BigDecimal originalTotal,
		boolean valid, List<QuoteLine> lines, List<ExtraLineSpec> extras, List<TaxChargeSpec> charges,
		String promoMessage) {
}