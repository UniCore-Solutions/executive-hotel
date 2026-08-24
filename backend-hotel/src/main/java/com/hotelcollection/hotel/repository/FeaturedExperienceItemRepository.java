package com.hotelcollection.hotel.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.FeaturedExperienceItem;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeaturedExperienceItemRepository extends JpaRepository<FeaturedExperienceItem, UUID> {

	List<FeaturedExperienceItem> findByContentBlockIdOrderByPosition(UUID contentBlockId);

	List<FeaturedExperienceItem> findByContentBlockIdInOrderByPosition(
			Collection<UUID> contentBlockIds);
}