package com.hotelcollection.hotel.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.Hotel;

public interface HotelRepository extends JpaRepository<Hotel, UUID> {

	@EntityGraph(attributePaths = "amenities")
	Optional<Hotel> findById(UUID id);

	@EntityGraph(attributePaths = "amenities")
	@Query("select h from Hotel h where h.id in :ids")
	List<Hotel> findByIdsWithAmenities(@Param("ids") Collection<UUID> ids);

	@Query("""
			select h from Hotel h
			where h.status = 'active'
			  and (lower(h.name) like lower(concat('%', :query, '%'))
			       or lower(h.city) like lower(concat('%', :query, '%'))
			       or lower(h.brand) like lower(concat('%', :query, '%')))
			""")
	Page<Hotel> searchByPattern(@Param("query") String query, Pageable pageable);

	@Query("select h from Hotel h where h.status = 'active'")
	Page<Hotel> findAllActive(Pageable pageable);

	/**
	 * Search with optional query. Split from the pattern query on purpose:
	 * PostgreSQL cannot infer the parameter type when the same parameter is
	 * used both in {@code :query is null} and a {@code '%' || :query || '%'}
	 * concat (it resolves the concat operand to bytea and {@code lower(bytea)}
	 * does not exist).
	 */
	default Page<Hotel> search(String query, Pageable pageable) {
		if (query == null || query.isBlank()) {
			return findAllActive(pageable);
		}
		return searchByPattern(query, pageable);
	}

	@Query("select h from Hotel h where h.status = 'active'")
	List<Hotel> findAllActive();

	@EntityGraph(attributePaths = "amenities")
	@Query("""
			select h from Hotel h
			where h.status = 'active' and h.isFeaturedOnHomepage = true
			order by h.name
			""")
	List<Hotel> findFeaturedOnHomepage();

	/** All hotels regardless of status (back-office listing, staff-scoped). */
	Page<Hotel> findAllByOrderByName(Pageable pageable);

	Page<Hotel> findByIdIn(Collection<UUID> ids, Pageable pageable);

	Optional<Hotel> findBySlug(String slug);

	boolean existsBySlug(String slug);

	List<Hotel> findByPlatformId(UUID platformId);
}