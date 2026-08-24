package com.hotelcollection.hotel.repository;
import com.hotelcollection.hotel.entity.Reservation;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.Guest;

public interface GuestRepository extends JpaRepository<Guest, UUID> {

	@Query("select g from Guest g where lower(g.email) = lower(:email)")
	List<Guest> findByEmailIgnoreCase(@Param("email") String email);

	Optional<Guest> findByUserId(UUID userId);

	/** Guests who booked at a hotel (back-office), sorted by name. */
	@Query(value = """
			select distinct g from Guest g, Reservation r
			where r.guestId = g.id
			  and r.hotelId = :hotelId
			""", countQuery = """
			select count(distinct g.id) from Guest g, Reservation r
			where r.guestId = g.id and r.hotelId = :hotelId
			""")
	Page<Guest> findDistinctByHotel(@Param("hotelId") UUID hotelId, Pageable pageable);

	/**
	 * Split from the plain query on purpose: PostgreSQL cannot infer the
	 * parameter type when the same parameter is used both in {@code :query is
	 * null} and a {@code '%' || :query || '%'} concat (it resolves the concat
	 * operand to bytea and {@code lower(bytea)} does not exist).
	 */
	@Query(value = """
			select distinct g from Guest g, Reservation r
			where r.guestId = g.id
			  and r.hotelId = :hotelId
			  and (lower(g.firstName) like lower(concat('%', :query, '%'))
			       or lower(g.lastName) like lower(concat('%', :query, '%'))
			       or lower(g.email) like lower(concat('%', :query, '%')))
			""")
	Page<Guest> findDistinctByHotelAndPattern(@Param("hotelId") UUID hotelId,
			@Param("query") String query, Pageable pageable);

	default Page<Guest> findDistinctByHotel(UUID hotelId, String query, Pageable pageable) {
		if (query == null || query.isBlank()) {
			return findDistinctByHotel(hotelId, pageable);
		}
		return findDistinctByHotelAndPattern(hotelId, query, pageable);
	}
}