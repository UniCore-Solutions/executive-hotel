package com.hotelcollection.hotel.repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.RoomType;

public interface RoomTypeRepository extends JpaRepository<RoomType, UUID> {

	@EntityGraph(attributePaths = "amenities")
	@Query("select rt from RoomType rt where rt.hotelId = :hotelId and rt.status = 'active' order by rt.name")
	List<RoomType> findActiveByHotelId(@Param("hotelId") UUID hotelId);

	@EntityGraph(attributePaths = "amenities")
	@Query("select rt from RoomType rt where rt.id in :ids")
	List<RoomType> findByIdsWithAmenities(@Param("ids") Collection<UUID> ids);

	@EntityGraph(attributePaths = "amenities")
	@Query("select rt from RoomType rt where rt.hotelId = :hotelId")
	List<RoomType> findByHotelId(@Param("hotelId") UUID hotelId);

	@EntityGraph(attributePaths = "amenities")
	Optional<RoomType> findBySlug(@Param("slug") String slug);

	boolean existsByHotelIdAndSlug(@Param("hotelId") UUID hotelId, @Param("slug") String slug);

	@EntityGraph(attributePaths = "amenities")
	@Query("select rt from RoomType rt where rt.id = :id")
	Optional<RoomType> findByIdWithAmenities(@Param("id") UUID id);

	@Query("select rt.hotelId, count(rt) from RoomType rt where rt.hotelId in :hotelIds group by rt.hotelId")
	List<Object[]> countByHotelIds(@Param("hotelIds") Collection<UUID> hotelIds);

	@EntityGraph(attributePaths = "amenities")
	@Query("""
			select rt from RoomType rt
			where rt.status = 'active' and rt.isFeaturedOnHomepage = true
			order by rt.name
			""")
	List<RoomType> findFeaturedOnHomepage();
}