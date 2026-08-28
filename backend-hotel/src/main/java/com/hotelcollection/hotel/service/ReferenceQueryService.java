package com.hotelcollection.hotel.service;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Country;
import com.hotelcollection.hotel.entity.TaxFeeType;

/** Reference data reads (countries, currencies, tax/fee types). */
public interface ReferenceQueryService {

	boolean currencyExists(String code);

	List<TaxFeeType> findActiveTaxFeeTypesByHotelId(UUID hotelId);

	/**
	 * All reference countries (ISO code + name + calling code), ordered by
	 * name — the single source for the guest country / phone selectors.
	 */
	List<Country> countries();
}