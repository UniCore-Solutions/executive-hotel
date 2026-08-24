package com.hotelcollection.hotel.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.HeroBlock;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HeroBlockRepository extends JpaRepository<HeroBlock, UUID> {

	List<HeroBlock> findByContentBlockIdIn(Collection<UUID> contentBlockIds);
}