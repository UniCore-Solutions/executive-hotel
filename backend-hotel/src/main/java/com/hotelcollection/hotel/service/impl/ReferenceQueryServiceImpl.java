package com.hotelcollection.hotel.service.impl;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.service.ReferenceQueryService;
import com.hotelcollection.hotel.entity.TaxFeeType;
import com.hotelcollection.hotel.repository.CurrencyRepository;
import com.hotelcollection.hotel.repository.TaxFeeTypeRepository;

/** Reference data reads (currencies, tax/fee types). */
@Service
public class ReferenceQueryServiceImpl implements ReferenceQueryService {

	private final CurrencyRepository currencyRepository;
	private final TaxFeeTypeRepository taxFeeTypeRepository;

	public ReferenceQueryServiceImpl(CurrencyRepository currencyRepository,
			TaxFeeTypeRepository taxFeeTypeRepository) {
		this.currencyRepository = currencyRepository;
		this.taxFeeTypeRepository = taxFeeTypeRepository;
	}

	@Override
	@Transactional(readOnly = true)
	public boolean currencyExists(String code) {
		return currencyRepository.existsById(code);
	}

	@Override
	@Transactional(readOnly = true)
	public List<TaxFeeType> findActiveTaxFeeTypesByHotelId(UUID hotelId) {
		return taxFeeTypeRepository.findActiveByHotelId(hotelId);
	}
}