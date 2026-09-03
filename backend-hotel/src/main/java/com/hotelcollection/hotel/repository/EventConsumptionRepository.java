package com.hotelcollection.hotel.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hotelcollection.hotel.entity.EventConsumption;
import com.hotelcollection.hotel.entity.EventConsumptionId;

public interface EventConsumptionRepository extends JpaRepository<EventConsumption, EventConsumptionId> {
}
