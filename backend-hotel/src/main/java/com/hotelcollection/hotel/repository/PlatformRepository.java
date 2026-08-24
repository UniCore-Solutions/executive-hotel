package com.hotelcollection.hotel.repository;

import java.util.Optional;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Platform;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlatformRepository extends JpaRepository<Platform, UUID> {

	Optional<Platform> findBySlug(String slug);

	boolean existsBySlug(String slug);
}