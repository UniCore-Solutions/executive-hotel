package com.hotelcollection.hotel.service.impl;

import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.email.EmailProvider;
import com.hotelcollection.hotel.entity.Guest;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.Notification;
import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.entity.ReservationCancellation;
import com.hotelcollection.hotel.repository.NotificationRepository;
import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.service.NotificationService;

/**
 * Writes and sends guest notifications. This is the first real writer the
 * {@code notifications} table has ever had — previously read-only
 * ({@code NotificationQueryService}), see KNOWN_ISSUES §A3.
 *
 * <p>Every notification is persisted as {@code pending} before any send is
 * attempted (so a crash mid-send still leaves an honest record), then updated
 * to {@code sent}/{@code failed} once {@link EmailProvider} returns. A send
 * failure is logged and swallowed here, not thrown — a guest's confirmation
 * email must never roll back the booking or payment transaction that
 * triggered it.
 */
@Service
public class NotificationServiceImpl implements NotificationService {

	private static final Logger log = LoggerFactory.getLogger(NotificationServiceImpl.class);
	private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);

	private final NotificationRepository notificationRepository;
	private final EmailProvider emailProvider;
	private final CatalogQueryService catalog;

	public NotificationServiceImpl(NotificationRepository notificationRepository, EmailProvider emailProvider,
			@Lazy CatalogQueryService catalog) {
		this.notificationRepository = notificationRepository;
		this.emailProvider = emailProvider;
		this.catalog = catalog;
	}

	@Override
	@Transactional
	public void notifyBookingConfirmed(Reservation reservation) {
		Hotel hotel = catalog.getHotel(reservation.getHotelId());
		String subject = "Your reservation " + reservation.getReference() + " is confirmed";
		String body = confirmationBody(reservation, hotel);
		send(reservation, "booking_confirmation", subject, body);
	}

	@Override
	@Transactional
	public void notifyBookingCancelled(Reservation reservation, ReservationCancellation cancellation) {
		Hotel hotel = catalog.getHotel(reservation.getHotelId());
		String subject = "Your reservation " + reservation.getReference() + " has been cancelled";
		String body = cancellationBody(reservation, cancellation, hotel);
		send(reservation, "booking_cancellation", subject, body);
	}

	private void send(Reservation reservation, String type, String subject, String body) {
		Guest guest = reservation.getGuest();
		if (guest == null || guest.getEmail() == null || guest.getEmail().isBlank()) {
			log.warn("no guest email on file for reservation {} — {} notification not sent",
					reservation.getReference(), type);
			return;
		}

		Notification notification = new Notification();
		notification.setHotelId(reservation.getHotelId());
		notification.setRecipientType("guest");
		notification.setRecipientId(guest.getId());
		notification.setChannel("email");
		notification.setType(type);
		notification.setSubject(subject);
		notification.setBody(body);
		notification.setStatus("pending");
		notification.setAttempts(0);
		notification.setCreatedAt(Instant.now());
		notificationRepository.save(notification);

		notification.setAttempts(notification.getAttempts() + 1);
		try {
			EmailProvider.SendResult result = emailProvider.send(
					new EmailProvider.EmailMessage(guest.getEmail(), subject, body));
			if (result.success()) {
				notification.setStatus("sent");
				notification.setProvider("email");
				notification.setProviderReference(result.providerReference());
				notification.setSentAt(Instant.now());
			} else {
				notification.setStatus("failed");
				notification.setError(result.error());
			}
		} catch (Exception ex) {
			// A provider throwing (network error, etc.) must not become an
			// unhandled exception in the caller's booking/payment transaction.
			log.warn("email send failed for notification type={} reservation={}", type,
					reservation.getReference(), ex);
			notification.setStatus("failed");
			notification.setError(ex.getMessage());
		}
		notificationRepository.save(notification);
	}

	private String confirmationBody(Reservation reservation, Hotel hotel) {
		Guest guest = reservation.getGuest();
		return """
				Hello %s,

				Your reservation at %s is confirmed.

				Reference:   %s
				Check-in:    %s
				Check-out:   %s
				Total:       %s %s

				Thank you for booking with us — we look forward to welcoming you.
				""".formatted(guest.getFirstName(), hotel.getName(), reservation.getReference(),
				DATE_FMT.format(reservation.getCheckInDate()), DATE_FMT.format(reservation.getCheckOutDate()),
				reservation.getTotalAmount(), reservation.getCurrencyCode());
	}

	private String cancellationBody(Reservation reservation, ReservationCancellation cancellation, Hotel hotel) {
		Guest guest = reservation.getGuest();
		return """
				Hello %s,

				Your reservation at %s has been cancelled.

				Reference:      %s
				Check-in:       %s
				Check-out:      %s
				Penalty:        %s %s
				Refund amount:  %s %s%s

				If you have any questions about this cancellation, please contact us
				quoting your reservation reference.
				""".formatted(guest.getFirstName(), hotel.getName(), reservation.getReference(),
				DATE_FMT.format(reservation.getCheckInDate()), DATE_FMT.format(reservation.getCheckOutDate()),
				cancellation.getPenaltyAmount(), reservation.getCurrencyCode(),
				cancellation.getRefundAmount(), reservation.getCurrencyCode(),
				cancellation.isRefundable() ? "" : " (non-refundable)");
	}
}
