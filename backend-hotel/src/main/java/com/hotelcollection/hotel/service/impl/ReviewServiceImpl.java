package com.hotelcollection.hotel.service.impl;

import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.entity.Guest;
import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.entity.ReservationStatus;
import com.hotelcollection.hotel.entity.Review;
import com.hotelcollection.hotel.entity.ReviewModerationStatus;
import com.hotelcollection.hotel.dto.review.CreateReviewInput;
import com.hotelcollection.hotel.dto.PageInput;
import com.hotelcollection.hotel.dto.review.ReviewPage;
import com.hotelcollection.hotel.service.ReviewService;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.service.GuestProvisioningService;
import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.service.BookingService;
import com.hotelcollection.hotel.repository.ReviewRepository;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.security.CurrentUserAccessor;

/**
 * Review use cases. Public queries expose only {@code approved} reviews
 * (privacy, moderation); a review is created in {@code pending} state and
 * requires the reviewer to have completed a stay at the hotel. When a
 * reservation id is supplied it must belong to the reviewer's own guest
 * profile, target the same hotel, and be checked out (proof of stay).
 * Moderation (approve/reject) is a staff operation; the hotel-scoping
 * check is enforced internally.
 *
 * <p>Cross-layer data (hotel existence, guest profile, reservations) is
 * accessed via the service layer.
 */
@Service
public class ReviewServiceImpl implements ReviewService {

	private final ReviewRepository reviewRepository;
	private final CatalogQueryService catalog;
	private final BookingService booking;
	private final GuestProvisioningService guestProvisioning;
	private final CurrentUserAccessor currentUser;

	public ReviewServiceImpl(ReviewRepository reviewRepository, @Lazy CatalogQueryService catalog,
			BookingService booking, GuestProvisioningService guestProvisioning,
			CurrentUserAccessor currentUser) {
		this.reviewRepository = reviewRepository;
		this.catalog = catalog;
		this.booking = booking;
		this.guestProvisioning = guestProvisioning;
		this.currentUser = currentUser;
	}

	@Override
	@Transactional
	public Review create(CreateReviewInput in) {
		if (in.rating() < 1 || in.rating() > 5) {
			throw DomainException.validation("rating must be between 1 and 5");
		}
		CurrentUser user = currentUser.require();
		if (!catalog.hotelExists(in.hotelId())) {
			throw DomainException.notFound("hotel not found");
		}

		Guest guest = guestProvisioning.findByUserId(user.userId())
				.orElseThrow(() -> DomainException.forbidden("no guest profile linked to this account"));
		if (reviewRepository.existsByHotelIdAndGuestId(in.hotelId(), guest.getId())) {
			throw DomainException.conflict("you have already reviewed this hotel");
		}
		if (!booking.hasCompletedStayAt(in.hotelId(), user.userId())) {
			throw DomainException.forbidden(
					"only guests who completed a stay at this hotel can leave a review");
		}

		UUID reservationId = null;
		if (in.reservationId() != null) {
			Reservation reservation = booking.getById(in.reservationId());
			if (!reservation.getHotelId().equals(in.hotelId())
					|| !guest.getId().equals(reservation.getGuestId())) {
				throw DomainException.forbidden("reservation does not belong to this guest and hotel");
			}
			if (reservation.getStatus() != ReservationStatus.checked_out) {
				throw DomainException.validation("reservation has not been completed");
			}
			reservationId = reservation.getId();
		}

		Review review = new Review();
		review.setHotelId(in.hotelId());
		review.setReservationId(reservationId);
		review.setGuestId(guest.getId());
		review.setRating((short) in.rating());
		review.setTitle(in.title());
		review.setComment(in.comment());
		review.setModerationStatus(ReviewModerationStatus.pending);
		review.setCreatedAt(Instant.now());
		review.setUpdatedAt(Instant.now());
		return reviewRepository.save(review);
	}

	@Override
	@Transactional(readOnly = true)
	public List<Review> approvedReviews(UUID hotelId) {
		return reviewRepository.findByHotelIdAndModerationStatusOrderByCreatedAtDesc(hotelId,
				ReviewModerationStatus.approved);
	}

	@Override
	@Transactional(readOnly = true)
	public ReviewPage pagedApproved(UUID hotelId, PageInput page) {
		int p = page == null || page.page() == null ? 0 : Math.max(page.page(), 0);
		int s = page == null || page.size() == null ? 20 : Math.min(Math.max(page.size(), 1), 100);
		Page<Review> rows = reviewRepository.findByHotelIdAndStatus(hotelId,
				ReviewModerationStatus.approved, PageRequest.of(p, s));
		return new ReviewPage(rows.getTotalElements(), rows.getNumber(), rows.getSize(),
				rows.getContent());
	}

	@Override
	@Transactional(readOnly = true)
	public long countApproved(UUID hotelId) {
		return reviewRepository.countApprovedByHotelId(hotelId);
	}

	@Override
	@Transactional(readOnly = true)
	public Double averageRating(UUID hotelId) {
		return reviewRepository.averageRatingByHotelId(hotelId);
	}

	@Override
	@Transactional(readOnly = true)
	public Map<UUID, Double> avgRatingByHotelIds(Collection<UUID> ids) {
		Map<UUID, Double> map = new HashMap<>();
		for (Object[] row : reviewRepository.avgRatingByHotelIds(ids)) {
			map.put(UUID.fromString(row[0].toString()), ((Number) row[1]).doubleValue());
		}
		return map;
	}

	/**
	 * Staff moderation of a review (approve / reject + optional hotel reply).
	 * The hotel-scoping check is enforced here: staff of the review's hotel
	 * or super_admin may moderate.
	 */
	@Override
	@Transactional
	public Review moderate(UUID reviewId, ReviewModerationStatus status, String response) {
		if (status == null) {
			throw DomainException.validation("status is required");
		}
		// Authentication is asserted before the lookup so an anonymous caller
		// still gets 401 (not 404) for a review that does not exist.
		currentUser.require();
		Review review = reviewRepository.findById(reviewId)
				.orElseThrow(() -> DomainException.notFound("review not found"));
		CurrentUser actor = currentUser.requireHotelAccess(review.getHotelId());
		review.setModerationStatus(status);
		review.setResponseText(response);
		review.setRespondedAt(Instant.now());
		review.setRespondedByUserId(actor.userId());
		review.setUpdatedAt(Instant.now());
		return reviewRepository.save(review);
	}

	/** Back-office review listing with optional moderation filter (staff scoped). */
	@Override
	@Transactional(readOnly = true)
	public Page<Review> adminReviews(UUID hotelId, ReviewModerationStatus status, PageInput page) {
		currentUser.requireHotelAccess(hotelId);
		int p = page == null || page.page() == null ? 0 : Math.max(page.page(), 0);
		int s = page == null || page.size() == null ? 20 : Math.min(Math.max(page.size(), 1), 100);
		return reviewRepository.findByHotelIdWithOptionalStatus(hotelId, status, PageRequest.of(p, s));
	}
}