package com.hotelcollection.hotel.repository;
import com.hotelcollection.hotel.entity.Reservation;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.Review;
import com.hotelcollection.hotel.entity.ReviewModerationStatus;
import com.hotelcollection.hotel.entity.ReservationStatus;

public interface ReviewRepository extends JpaRepository<Review, UUID> {

	@Query("""
			select r from Review r
			where r.hotelId = :hotelId and r.moderationStatus = :status
			order by r.createdAt desc
			""")
	Page<Review> findByHotelIdAndStatus(@Param("hotelId") UUID hotelId,
			@Param("status") ReviewModerationStatus status, Pageable pageable);

	/** Any moderation status, optionally filtered (back-office moderation queue). */
	@Query("""
			select r from Review r
			where r.hotelId = :hotelId
			  and (:status is null or r.moderationStatus = :status)
			order by r.createdAt desc
			""")
	Page<Review> findByHotelIdWithOptionalStatus(@Param("hotelId") UUID hotelId,
			@Param("status") ReviewModerationStatus status, Pageable pageable);

	@Query("select r from Review r where r.hotelId = :hotelId and r.moderationStatus = :status order by r.createdAt desc")
	List<Review> findByHotelIdAndModerationStatusOrderByCreatedAtDesc(@Param("hotelId") UUID hotelId,
			@Param("status") ReviewModerationStatus status);

	@Query("select count(r) from Review r where r.hotelId = :hotelId and r.moderationStatus = 'approved'")
	long countApprovedByHotelId(@Param("hotelId") UUID hotelId);

	@Query("select coalesce(avg(r.rating), 0) from Review r where r.hotelId = :hotelId and r.moderationStatus = 'approved'")
	double averageRatingByHotelId(@Param("hotelId") UUID hotelId);

	@Query("""
			select r.hotelId, coalesce(avg(r.rating), 0)
			from Review r
			where r.hotelId in :hotelIds and r.moderationStatus = 'approved'
			group by r.hotelId
			""")
	List<Object[]> avgRatingByHotelIds(@Param("hotelIds") Collection<UUID> hotelIds);

	Optional<Review> findByReservationId(UUID reservationId);

	boolean existsByHotelIdAndGuestId(UUID hotelId, UUID guestId);

	@Query("""
			select r from Review r
			where r.moderationStatus = 'approved' and r.isFeaturedOnHomepage = true
			order by r.createdAt desc
			""")
	List<Review> findFeaturedOnHomepage();

	@Query("""
			select count(r) > 0 from Reservation r
			where r.hotelId = :hotelId and r.bookedByUserId = :userId
			  and r.status = com.hotelcollection.hotel.entity.ReservationStatus.checked_out
			""")
	boolean existsCompletedStay(@Param("hotelId") UUID hotelId, @Param("userId") UUID userId);
}