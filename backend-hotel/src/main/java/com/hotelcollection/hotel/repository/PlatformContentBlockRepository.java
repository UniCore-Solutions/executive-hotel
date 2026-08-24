package com.hotelcollection.hotel.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.PlatformContentBlock;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlatformContentBlockRepository extends JpaRepository<PlatformContentBlock, UUID> {

	List<PlatformContentBlock> findByPlatformIdOrderByPosition(UUID platformId);

	List<PlatformContentBlock> findByIdIn(Collection<UUID> ids);
}