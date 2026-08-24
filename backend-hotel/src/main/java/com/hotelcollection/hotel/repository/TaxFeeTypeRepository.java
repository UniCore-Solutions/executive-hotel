package com.hotelcollection.hotel.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.TaxFeeType;

public interface TaxFeeTypeRepository extends JpaRepository<TaxFeeType, UUID> {

	@Query("""
			select t from TaxFeeType t
			where t.status = 'active'
			  and (t.hotelId = :hotelId or t.hotelId is null)
			order by t.name
			""")
	List<TaxFeeType> findActiveByHotelId(@Param("hotelId") UUID hotelId);
}