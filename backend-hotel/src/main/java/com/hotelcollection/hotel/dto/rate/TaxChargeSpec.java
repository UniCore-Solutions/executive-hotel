package com.hotelcollection.hotel.dto.rate;

import java.math.BigDecimal;
import java.util.UUID;

/** One persisted charge line: a tax/fee snapshot for a booking. */
public record TaxChargeSpec(UUID taxFeeTypeId, String chargeType, String name, BigDecimal amount) {
}