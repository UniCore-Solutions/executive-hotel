package com.hotelcollection.hotel.repository;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Experience;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ExperienceRepository extends JpaRepository<Experience, UUID> {

	List<Experience> findByHotelIdAndStatusOrderBySortOrder(UUID hotelId, String status);

	List<Experience> findByHotelIdOrderBySortOrder(UUID hotelId);

	@Query("""
			select e from Experience e
			where e.status = 'active' and e.isFeaturedOnHomepage = true
			  and e.hotelId in (select h.id from Hotel h where h.status = 'active')
			order by e.sortOrder, e.id
			""")
	List<Experience> findFeaturedOnHomepage();
}