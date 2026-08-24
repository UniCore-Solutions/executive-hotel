package com.hotelcollection.hotel.repository;

import com.hotelcollection.hotel.entity.Currency;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CurrencyRepository extends JpaRepository<Currency, String> {
}