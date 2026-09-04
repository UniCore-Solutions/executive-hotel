package com.hotelcollection.hotel.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.Media;

public interface MediaRepository extends JpaRepository<Media, UUID> {

	@Query("select m from Media m where m.hotelId in :hotelIds order by m.sortOrder")
	List<Media> findByHotelIds(@Param("hotelIds") Collection<UUID> hotelIds);

	@Query("select m from Media m where m.roomTypeId in :roomTypeIds order by m.sortOrder")
	List<Media> findByRoomTypeIds(@Param("roomTypeIds") Collection<UUID> roomTypeIds);

	@Query("select m from Media m where m.experienceId in :ids order by m.sortOrder")
	List<Media> findByExperienceIds(@Param("ids") Collection<UUID> ids);

	@Query("select m from Media m where m.restaurantId in :ids order by m.sortOrder")
	List<Media> findByRestaurantIds(@Param("ids") Collection<UUID> ids);

	@Query("select m from Media m where m.extraId in :ids order by m.sortOrder")
	List<Media> findByExtraIds(@Param("ids") Collection<UUID> ids);

	@Query("select m from Media m where m.hotelId = :hotelId order by m.sortOrder")
	List<Media> findByHotelId(@Param("hotelId") UUID hotelId);

	@Query("select m from Media m where m.roomTypeId = :roomTypeId order by m.sortOrder")
	List<Media> findByRoomTypeId(@Param("roomTypeId") UUID roomTypeId);

	/** Bulk delete (immediate) so a media replacement's new primary insert
	 * never collides with the old primary row in the same transaction. */
	@Modifying
	@Query("delete from Media m where m.hotelId = :hotelId")
	void deleteByHotelId(@Param("hotelId") UUID hotelId);

	@Modifying
	@Query("delete from Media m where m.roomTypeId = :roomTypeId")
	void deleteByRoomTypeId(@Param("roomTypeId") UUID roomTypeId);

	@Query("select m from Media m where m.platformId = :platformId order by m.sortOrder")
	List<Media> findByPlatformId(@Param("platformId") UUID platformId);

	@Query("select m from Media m where m.platformId in :ids order by m.sortOrder")
	List<Media> findByPlatformIds(@Param("ids") Collection<UUID> ids);

	@Modifying
	@Query("delete from Media m where m.platformId = :platformId")
	void deleteByPlatformId(@Param("platformId") UUID platformId);

	/** Immediate deletes so a replacement primary never collides with the old
	 * row in the same transaction (inserts flush before queued deletes). */
	@Modifying
	@Query("delete from Media m where m.platformId = :platformId and m.isPrimary = true")
	void deletePrimaryByPlatformId(@Param("platformId") UUID platformId);

	@Modifying
	@Query("delete from Media m where m.hotelId = :hotelId and m.isPrimary = true")
	void deletePrimaryByHotelId(@Param("hotelId") UUID hotelId);
	void deleteAll();

	/** Replace-on-upload for the one-logo-per-owner rule (mirrors
	 * {@link #deletePrimaryByHotelId}/{@link #deletePrimaryByPlatformId} —
	 * immediate so the new logo's insert never collides with the old row). */
	@Modifying
	@Query("delete from Media m where m.hotelId = :hotelId and m.category = :category")
	void deleteByHotelIdAndCategory(@Param("hotelId") UUID hotelId, @Param("category") String category);

	@Modifying
	@Query("delete from Media m where m.platformId = :platformId and m.category = :category")
	void deleteByPlatformIdAndCategory(@Param("platformId") UUID platformId, @Param("category") String category);

	/** Replace-all gallery writes (`replaceHotelMedia`/`replacePlatformMedia`)
	 * must never be able to delete or duplicate the logo — it has its own
	 * dedicated upload/delete path. These exclude the given category instead
	 * of the owner's full media set. */
	@Modifying
	@Query("delete from Media m where m.hotelId = :hotelId and (m.category is null or m.category <> :category)")
	void deleteByHotelIdExceptCategory(@Param("hotelId") UUID hotelId, @Param("category") String category);

	@Modifying
	@Query("delete from Media m where m.platformId = :platformId and (m.category is null or m.category <> :category)")
	void deleteByPlatformIdExceptCategory(@Param("platformId") UUID platformId, @Param("category") String category);

	/** Logo resolution for email branding ({@code NotificationServiceImpl}) —
	 * hotel-scoped logo first, primary one preferred if more than one exists. */
	@Query("select m from Media m where m.hotelId = :hotelId and m.category = :category "
			+ "order by m.isPrimary desc, m.sortOrder")
	List<Media> findByHotelIdAndCategory(@Param("hotelId") UUID hotelId, @Param("category") String category);

	/** Same as {@link #findByHotelIdAndCategory}, platform-scoped — the
	 * fallback when a hotel has no logo of its own (matches this platform's
	 * actual seed data: the logo is a platform-level asset today). */
	@Query("select m from Media m where m.platformId = :platformId and m.category = :category "
			+ "order by m.isPrimary desc, m.sortOrder")
	List<Media> findByPlatformIdAndCategory(@Param("platformId") UUID platformId,
			@Param("category") String category);
}