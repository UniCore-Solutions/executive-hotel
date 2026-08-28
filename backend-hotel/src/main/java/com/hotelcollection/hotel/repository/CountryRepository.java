package com.hotelcollection.hotel.repository;

import java.util.List;

import com.hotelcollection.hotel.entity.Country;
import org.springframework.data.jpa.repository.JpaRepository;

/** Reference countries (ISO 3166-1 code + name, optionally calling code). */
public interface CountryRepository extends JpaRepository<Country, String> {

	List<Country> findAllByOrderByName();
}
