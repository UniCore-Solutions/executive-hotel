package com.hotelcollection.hotel.service.impl;

import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.hotelcollection.hotel.service.BookingService;

/**
 * Releases reservations left on a payment hold past their TTL — the
 * compensation half of the "sell inventory at create, confirm on capture"
 * design (see BookingServiceImpl#create / #expireHold). Styled on
 * {@link OutboxRelay}: a thin, stateless poll loop that delegates all
 * business logic to the service layer. Each candidate is re-verified and
 * cancelled in its own transaction (BookingService#expireHold), so one
 * failure never aborts the batch and a hold resolved concurrently by a
 * capture is never double-processed.
 */
@Component
public class ReservationHoldExpiryJob {

	private static final Logger log = LoggerFactory.getLogger(ReservationHoldExpiryJob.class);

	private final BookingService bookingService;

	public ReservationHoldExpiryJob(BookingService bookingService) {
		this.bookingService = bookingService;
	}

	@Scheduled(fixedDelayString = "${app.reservations.hold-expiry-interval-ms:60000}")
	public void expireStaleHolds() {
		List<UUID> candidates = bookingService.findExpiredHoldIds();
		for (UUID id : candidates) {
			try {
				bookingService.expireHold(id);
			} catch (Exception ex) {
				log.warn("failed to expire payment hold for reservation {}", id, ex);
			}
		}
	}
}
