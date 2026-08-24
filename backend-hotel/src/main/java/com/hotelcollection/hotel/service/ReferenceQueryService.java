package com.hotelcollection.hotel.service;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.TaxFeeType;

/** Reference data reads (currencies, tax/fee types). */
public interface ReferenceQueryService {

	boolean currencyExists(String code);

	List<TaxFeeType> findActiveTaxFeeTypesByHotelId(UUID hotelId);
}