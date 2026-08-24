package com.hotelcollection.hotel.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.FeaturedExperiencesBlock;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeaturedExperiencesBlockRepository extends JpaRepository<FeaturedExperiencesBlock, UUID> {

	List<FeaturedExperiencesBlock> findByContentBlockIdIn(Collection<UUID> contentBlockIds);
}