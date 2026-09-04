package com.hotelcollection.hotel.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.net.URLEncoder;
import java.text.NumberFormat;
import java.time.Instant;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.ITemplateEngine;
import org.thymeleaf.context.Context;

import com.hotelcollection.hotel.dto.billing.GeneratedDocument;
import com.hotelcollection.hotel.dto.email.BookingConfirmationEmailData;
import com.hotelcollection.hotel.dto.email.CancellationEmailData;
import com.hotelcollection.hotel.dto.email.EmailTheme;
import com.hotelcollection.hotel.dto.email.InvoiceEmailData;
import com.hotelcollection.hotel.dto.email.OtpEmailData;
import com.hotelcollection.hotel.dto.email.PaymentFailedEmailData;
import com.hotelcollection.hotel.dto.email.RefundEmailData;
import com.hotelcollection.hotel.dto.email.WelcomeEmailData;
import com.hotelcollection.hotel.email.EmailProvider;
import com.hotelcollection.hotel.email.EmailProviderFactory;
import com.hotelcollection.hotel.entity.EventConsumption;
import com.hotelcollection.hotel.entity.EventConsumptionId;
import com.hotelcollection.hotel.entity.Guest;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.entity.Notification;
import com.hotelcollection.hotel.entity.PaymentStatus;
import com.hotelcollection.hotel.entity.Reservation;
import com.hotelcollection.hotel.entity.ReservationCancellation;
import com.hotelcollection.hotel.entity.ReservationRoom;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.entity.User;
import com.hotelcollection.hotel.repository.EventConsumptionRepository;
import com.hotelcollection.hotel.repository.MediaRepository;
import com.hotelcollection.hotel.repository.NotificationRepository;
import com.hotelcollection.hotel.service.AuthService;
import com.hotelcollection.hotel.service.BookingService;
import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.service.InvoiceService;
import com.hotelcollection.hotel.service.NotificationService;

/**
 * Renders and sends every outbound guest/user email. Called only from
 * {@link EmailEventConsumer} — see {@link NotificationService}'s class
 * comment for why business services never call this directly.
 *
 * <p><b>Theme + data, not a grab-bag of loose variables.</b> Every template
 * receives exactly two top-level variables: {@code theme} (an
 * {@link EmailTheme} — colors, fonts, hotel identity, footer; resolved once
 * per send by {@link #resolveTheme}/{@link #resolveWelcomeTheme}) and
 * {@code data} (the email-specific, already-formatted content — a
 * {@code *EmailData} record). Templates never do arithmetic, date/money
 * formatting, or branding lookups themselves — that all happens here, the
 * same "authoritative backend data, presentation-only template" split
 * {@code DocumentGenerationServiceImpl} already uses for invoice PDFs.
 *
 * <p>Idempotency: each method is a no-op if {@code (consumerGroup, eventId)}
 * already exists in {@code event_consumption} (checked first, recorded after
 * a successful send — see {@link #markConsumed}) — safe under Kafka
 * redelivery and consumer restart; safe across multiple consumer instances
 * for as long as Kafka's own per-partition exclusivity holds (the narrow
 * window outside that — a crash after send, before the commit that records
 * consumption — mirrors {@code OutboxRelay}'s own documented stale-claim
 * tolerance elsewhere in this codebase).
 *
 * <p>A transport failure (the provider throws, or reports
 * {@code SendResult.success() == false}) is <em>not</em> swallowed here — it
 * propagates so {@code EmailEventConsumer}'s Kafka error handler retries
 * with backoff and eventually routes to the dead-letter topic. A business
 * reason not to send (no email on file, nothing to attach) is not an error:
 * it is logged, the event is marked consumed, and the method returns
 * normally — retrying would produce the exact same outcome.
 *
 * <p>No OTP method exists here — there is no OTP/email-verification flow
 * anywhere in this codebase to trigger one (the {@code email/otp} template
 * exists for when there is; see its own javadoc on
 * {@link com.hotelcollection.hotel.dto.email.OtpEmailData}).
 */
@Service
public class NotificationServiceImpl implements NotificationService {

	private static final Logger log = LoggerFactory.getLogger(NotificationServiceImpl.class);
	private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("d MMM yyyy", Locale.ENGLISH);
	private static final DateTimeFormatter DATETIME_FMT =
			DateTimeFormatter.ofPattern("d MMM yyyy, HH:mm", Locale.ENGLISH).withZone(java.time.ZoneOffset.UTC);
	/** Platform-wide brand for platform-scoped emails when no hotel can be
	 * resolved — deliberately not a hard failure; see {@link #resolveWelcomeTheme}. */
	private static final String PLATFORM_BRAND = "Hotel Collection";

	private final NotificationRepository notificationRepository;
	private final EventConsumptionRepository eventConsumptionRepository;
	private final MediaRepository mediaRepository;
	private final EmailProviderFactory emailProviderFactory;
	private final ITemplateEngine templateEngine;
	private final BookingService booking;
	private final InvoiceService invoiceService;
	private final CatalogQueryService catalog;
	private final AuthService authService;
	private final String frontendBaseUrl;

	public NotificationServiceImpl(NotificationRepository notificationRepository,
			EventConsumptionRepository eventConsumptionRepository, MediaRepository mediaRepository,
			EmailProviderFactory emailProviderFactory, ITemplateEngine templateEngine,
			@Lazy BookingService booking, @Lazy InvoiceService invoiceService,
			@Lazy CatalogQueryService catalog,
			// @Lazy: AuthServiceImpl now depends on OtpService, which depends
			// on this class (to send the OTP email) — AuthService -> OtpService
			// -> NotificationService -> AuthService would otherwise be an
			// unresolvable cycle. Same idiom as booking/invoiceService/catalog above.
			@Lazy AuthService authService,
			@Value("${app.frontend-base-url:http://localhost:3000}") String frontendBaseUrl) {
		this.notificationRepository = notificationRepository;
		this.eventConsumptionRepository = eventConsumptionRepository;
		this.mediaRepository = mediaRepository;
		this.emailProviderFactory = emailProviderFactory;
		this.templateEngine = templateEngine;
		this.booking = booking;
		this.invoiceService = invoiceService;
		this.catalog = catalog;
		this.authService = authService;
		this.frontendBaseUrl = frontendBaseUrl;
	}

	// ---------------------------------------------------------------- welcome

	@Override
	@Transactional
	public void sendWelcomeEmail(UUID userId, UUID eventId, String correlationId) {
		String group = "email:welcome";
		if (alreadyProcessed(group, eventId)) {
			return;
		}
		User user = authService.findUser(userId);
		if (isBlank(user.getEmail())) {
			log.warn("no email on file for user {} — welcome email not sent", userId);
			markConsumed(group, eventId);
			return;
		}
		EmailTheme theme = resolveWelcomeTheme();
		WelcomeEmailData data = new WelcomeEmailData(user.getFirstName(), frontendBaseUrl + "/account");

		String html = render("email/welcome", theme, data);
		send(group, "user", userId, null, user.getEmail(), "Welcome to " + theme.hotelName(), html, List.of(),
				eventId, correlationId);
	}

	// ---------------------------------------------------------------- booking confirmation

	@Override
	@Transactional
	public void sendBookingConfirmationEmail(String reservationReference, UUID eventId, String correlationId) {
		String group = "email:booking_confirmation";
		if (alreadyProcessed(group, eventId)) {
			return;
		}
		Reservation reservation = booking.getByReference(reservationReference);
		Guest guest = reservation.getGuest();
		if (guest == null || isBlank(guest.getEmail())) {
			log.warn("no guest email on file for reservation {} — confirmation email not sent",
					reservation.getReference());
			markConsumed(group, eventId);
			return;
		}
		Hotel hotel = catalog.getHotel(reservation.getHotelId());
		EmailTheme theme = resolveTheme(hotel);
		int nights = (int) ChronoUnit.DAYS.between(reservation.getCheckInDate(), reservation.getCheckOutDate());
		BookingConfirmationEmailData data = new BookingConfirmationEmailData(
				guest.getFirstName(),
				reservation.getReference(),
				roomTypeNames(reservation),
				DATE_FMT.format(reservation.getCheckInDate()),
				DATE_FMT.format(reservation.getCheckOutDate()),
				pluralize(nights, "night", "nights"),
				guestsDisplay(reservation.getAdults(), reservation.getChildren()),
				blankToNull(reservation.getArrivalSlot()),
				money(reservation.getTotalAmount(), reservation.getCurrencyCode()),
				paymentStatusDisplay(reservation),
				reservation.getPaymentStatus() == PaymentStatus.captured,
				manageBookingUrl(reservation.getReference(), guest.getEmail()));

		String html = render("email/booking-confirmation", theme, data);
		send(group, "guest", guest.getId(), reservation.getHotelId(), guest.getEmail(),
				"Your reservation " + reservation.getReference() + " is confirmed", html, List.of(),
				eventId, correlationId);
	}

	// ---------------------------------------------------------------- invoice

	@Override
	@Transactional
	public void sendInvoiceEmail(String reservationReference, UUID eventId, String correlationId) {
		String group = "email:invoice";
		if (alreadyProcessed(group, eventId)) {
			return;
		}
		Reservation reservation = booking.getByReference(reservationReference);
		Guest guest = reservation.getGuest();
		if (guest == null || isBlank(guest.getEmail())) {
			log.warn("no guest email on file for reservation {} — invoice email not sent",
					reservation.getReference());
			markConsumed(group, eventId);
			return;
		}
		GeneratedDocument pdf;
		try {
			pdf = invoiceService.getInvoicePdfForNotification(reservation.getId());
		} catch (Exception ex) {
			// Nothing to attach (invoice was never issued — e.g. a data
			// anomaly) is a business outcome, not a transport failure:
			// retrying will not conjure an invoice into existence.
			log.warn("no invoice available for reservation {} — invoice email not sent",
					reservation.getReference(), ex);
			markConsumed(group, eventId);
			return;
		}
		Hotel hotel = catalog.getHotel(reservation.getHotelId());
		EmailTheme theme = resolveTheme(hotel);
		InvoiceEmailData data = new InvoiceEmailData(
				guest.getFirstName(),
				reservation.getReference(),
				"INV-" + reservation.getReference(),
				DATE_FMT.format(java.time.LocalDate.now()),
				money(reservation.getTotalAmount(), reservation.getCurrencyCode()),
				paymentStatusDisplay(reservation),
				reservation.getPaymentStatus() == PaymentStatus.captured);

		String html = render("email/invoice", theme, data);
		EmailProvider.EmailAttachment attachment =
				new EmailProvider.EmailAttachment(pdf.filename(), pdf.content(), "application/pdf");
		send(group, "guest", guest.getId(), reservation.getHotelId(), guest.getEmail(),
				"Your invoice for reservation " + reservation.getReference(), html, List.of(attachment),
				eventId, correlationId);
	}

	// ---------------------------------------------------------------- cancellation

	@Override
	@Transactional
	public void sendBookingCancellationEmail(String reservationReference, UUID eventId, String correlationId) {
		String group = "email:booking_cancellation";
		if (alreadyProcessed(group, eventId)) {
			return;
		}
		Reservation reservation = booking.getByReference(reservationReference);
		Guest guest = reservation.getGuest();
		ReservationCancellation cancellation = reservation.getCancellation();
		if (guest == null || isBlank(guest.getEmail())) {
			log.warn("no guest email on file for reservation {} — cancellation email not sent",
					reservation.getReference());
			markConsumed(group, eventId);
			return;
		}
		if (cancellation == null) {
			// Should not happen — booking.cancelled only fires once the
			// cancellation row is committed in the same transaction — but a
			// missing record is a data anomaly, not something retrying fixes.
			log.warn("reservation {} has no cancellation record — cancellation email not sent",
					reservation.getReference());
			markConsumed(group, eventId);
			return;
		}
		Hotel hotel = catalog.getHotel(reservation.getHotelId());
		EmailTheme theme = resolveTheme(hotel);
		boolean hasPenalty = cancellation.getPenaltyAmount() != null
				&& cancellation.getPenaltyAmount().compareTo(BigDecimal.ZERO) > 0;
		boolean hasRefund = cancellation.getRefundAmount() != null
				&& cancellation.getRefundAmount().compareTo(BigDecimal.ZERO) > 0;
		CancellationEmailData data = new CancellationEmailData(
				guest.getFirstName(),
				reservation.getReference(),
				DATE_FMT.format(reservation.getCheckInDate()),
				DATE_FMT.format(reservation.getCheckOutDate()),
				money(cancellation.getPenaltyAmount(), reservation.getCurrencyCode()),
				hasPenalty,
				money(cancellation.getRefundAmount(), reservation.getCurrencyCode()),
				hasRefund,
				cancellation.isRefundable());

		String html = render("email/booking-cancellation", theme, data);
		send(group, "guest", guest.getId(), reservation.getHotelId(), guest.getEmail(),
				"Your reservation " + reservation.getReference() + " has been cancelled", html, List.of(),
				eventId, correlationId);
	}

	// ---------------------------------------------------------------- refund

	@Override
	@Transactional
	public void sendRefundEmail(String reservationReference, UUID eventId, String correlationId, BigDecimal refundAmount,
			String currencyCode) {
		String group = "email:refund";
		if (alreadyProcessed(group, eventId)) {
			return;
		}
		Reservation reservation = booking.getByReference(reservationReference);
		Guest guest = reservation.getGuest();
		if (guest == null || isBlank(guest.getEmail())) {
			log.warn("no guest email on file for reservation {} — refund email not sent",
					reservation.getReference());
			markConsumed(group, eventId);
			return;
		}
		Hotel hotel = catalog.getHotel(reservation.getHotelId());
		EmailTheme theme = resolveTheme(hotel);

		List<EmailProvider.EmailAttachment> attachments = List.of();
		boolean hasCreditNote = false;
		try {
			GeneratedDocument note = invoiceService.getCreditNotePdfForNotification(reservation.getId());
			attachments = List.of(new EmailProvider.EmailAttachment(note.filename(), note.content(), "application/pdf"));
			hasCreditNote = true;
		} catch (Exception ex) {
			// Refund without a credit note on file (e.g. issuance failed
			// separately) — the email still goes out, just without the PDF.
			log.info("no credit note available to attach for reservation {} refund email",
					reservation.getReference());
		}

		RefundEmailData data = new RefundEmailData(
				guest.getFirstName(),
				reservation.getReference(),
				money(refundAmount, currencyCode),
				DATE_FMT.format(java.time.LocalDate.now()),
				hasCreditNote);

		String html = render("email/refund", theme, data);
		send(group, "guest", guest.getId(), reservation.getHotelId(), guest.getEmail(),
				"Refund processed for reservation " + reservation.getReference(), html, attachments,
				eventId, correlationId);
	}

	// ---------------------------------------------------------------- payment failed

	@Override
	@Transactional
	public void sendPaymentFailedEmail(String reservationReference, UUID eventId, String correlationId) {
		String group = "email:payment_failed";
		if (alreadyProcessed(group, eventId)) {
			return;
		}
		Reservation reservation = booking.getByReference(reservationReference);
		Guest guest = reservation.getGuest();
		if (guest == null || isBlank(guest.getEmail())) {
			log.warn("no guest email on file for reservation {} — payment-failed email not sent",
					reservation.getReference());
			markConsumed(group, eventId);
			return;
		}
		Hotel hotel = catalog.getHotel(reservation.getHotelId());
		EmailTheme theme = resolveTheme(hotel);
		PaymentFailedEmailData data = new PaymentFailedEmailData(
				guest.getFirstName(),
				reservation.getReference(),
				money(reservation.getTotalAmount(), reservation.getCurrencyCode()),
				frontendBaseUrl + "/booking/retry?ref=" + urlEncode(reservation.getReference())
						+ "&email=" + urlEncode(guest.getEmail()),
				reservation.getHoldExpiresAt() == null ? null : DATETIME_FMT.format(reservation.getHoldExpiresAt()));

		String html = render("email/payment-failed", theme, data);
		send(group, "guest", guest.getId(), reservation.getHotelId(), guest.getEmail(),
				"We couldn't process your payment for reservation " + reservation.getReference(), html, List.of(),
				eventId, correlationId);
	}

	// ---------------------------------------------------------------- otp (direct send — see class/interface javadoc)

	@Override
	public void sendOtpEmail(String toEmail, String recipientFirstName, String code, int expiresInMinutes) {
		EmailTheme theme = EmailTheme.forPlatform(PLATFORM_BRAND, null, null, null, frontendBaseUrl);
		OtpEmailData data = new OtpEmailData(recipientFirstName, code, pluralize(expiresInMinutes, "minute", "minutes"));
		String html = render("email/otp", theme, data);

		EmailProvider provider = emailProviderFactory.resolve();
		EmailProvider.SendResult result;
		try {
			result = provider.send(new EmailProvider.EmailMessage(toEmail, "Your verification code", html, List.of()));
		} catch (RuntimeException ex) {
			// The exception is a transport failure (connection/auth/etc.) and
			// never carries message content, so logging it here is safe —
			// same as every other type's send() path.
			log.warn("email provider threw for type=otp", ex);
			throw ex;
		}
		if (!result.success()) {
			throw new IllegalStateException("email provider reported failure for type=otp: " + result.error());
		}
		// Deliberately no `notifications` row: a durable, queryable copy of
		// this rendered HTML would itself be "storing the OTP value". The
		// otp_codes row (hash only) is this send's whole audit trail.
	}

	// ---------------------------------------------------------------- theme resolution

	/** Hotel-scoped theme: real hotel name/address/phone/email, logo
	 * resolved hotel-first then platform-level (matches this platform's
	 * actual seed data, where the logo is a platform asset). */
	private EmailTheme resolveTheme(Hotel hotel) {
		String logoUrl = resolveLogoUrl(hotel);
		return EmailTheme.forHotel(hotel.getName(), logoUrl, hotelAddress(hotel), hotel.getPhone(),
				hotel.getEmail(), frontendBaseUrl);
	}

	/**
	 * user.registered carries no hotelId (it is platform-wide) — deliberately
	 * not resolved through {@code catalog.canonicalHotel()}. That call is
	 * {@code @Transactional} and joins this method's own transaction
	 * (default REQUIRED propagation); if it throws (the production
	 * single-active-hotel invariant this email has no business depending
	 * on), Spring marks the whole transaction rollback-only at the AOP
	 * boundary <em>before</em> the exception ever reaches a try/catch here —
	 * the method then appears to return normally but fails at commit with
	 * {@code UnexpectedRollbackException}, which the Kafka consumer sees as
	 * a transport failure and retries pointlessly. A static platform brand
	 * for this one platform-wide email sidesteps the whole class of bug.
	 */
	private EmailTheme resolveWelcomeTheme() {
		return EmailTheme.forPlatform(PLATFORM_BRAND, null, null, null, frontendBaseUrl);
	}

	private String resolveLogoUrl(Hotel hotel) {
		List<Media> hotelLogo = mediaRepository.findByHotelIdAndCategory(hotel.getId(), Media.CATEGORY_LOGO);
		if (!hotelLogo.isEmpty()) {
			return hotelLogo.get(0).getUrl();
		}
		if (hotel.getPlatformId() != null) {
			List<Media> platformLogo = mediaRepository.findByPlatformIdAndCategory(hotel.getPlatformId(),
					Media.CATEGORY_LOGO);
			if (!platformLogo.isEmpty()) {
				return platformLogo.get(0).getUrl();
			}
		}
		return null;
	}

	private String hotelAddress(Hotel hotel) {
		StringBuilder sb = new StringBuilder();
		appendPart(sb, hotel.getAddressLine1());
		appendPart(sb, hotel.getAddressLine2());
		appendPart(sb, hotel.getCity());
		return sb.length() == 0 ? null : sb.toString();
	}

	private void appendPart(StringBuilder sb, String part) {
		if (part == null || part.isBlank()) {
			return;
		}
		if (sb.length() > 0) {
			sb.append(", ");
		}
		sb.append(part);
	}

	// ---------------------------------------------------------------- shared

	private String render(String template, EmailTheme theme, Object data) {
		Context ctx = new Context();
		ctx.setVariable("theme", theme);
		ctx.setVariable("data", data);
		return templateEngine.process(template, ctx);
	}

	/**
	 * Resolves the configured provider, sends, and — only on success —
	 * persists the {@code notifications} row and records consumption. A
	 * failure (thrown or reported) propagates uncaught so
	 * {@link EmailEventConsumer}'s error handler can retry it.
	 */
	private void send(String consumerGroup, String recipientType, UUID recipientId, UUID hotelId, String toEmail,
			String subject, String html, List<EmailProvider.EmailAttachment> attachments, UUID eventId,
			String correlationId) {
		EmailProvider provider = emailProviderFactory.resolve();
		EmailProvider.SendResult result;
		try {
			result = provider.send(new EmailProvider.EmailMessage(toEmail, subject, html, attachments));
		} catch (RuntimeException ex) {
			log.warn("email provider threw for type={} recipientType={}", consumerGroup, recipientType, ex);
			throw ex;
		}
		if (!result.success()) {
			throw new IllegalStateException(
					"email provider reported failure for type=" + consumerGroup + ": " + result.error());
		}

		Notification notification = new Notification();
		notification.setHotelId(hotelId);
		notification.setRecipientType(recipientType);
		notification.setRecipientId(recipientId);
		notification.setChannel("email");
		notification.setType(consumerGroup.substring("email:".length()));
		notification.setSubject(subject);
		notification.setBody(html);
		notification.setStatus("sent");
		notification.setProvider(provider.type().name().toLowerCase(Locale.ROOT));
		notification.setProviderReference(result.providerReference());
		notification.setAttempts(1);
		notification.setSentAt(Instant.now());
		notification.setCreatedAt(Instant.now());
		notification.setEventId(eventId);
		notification.setCorrelationId(correlationId);
		notificationRepository.save(notification);

		markConsumed(consumerGroup, eventId);
	}

	private boolean alreadyProcessed(String consumerGroup, UUID eventId) {
		return eventId != null
				&& eventConsumptionRepository.existsById(new EventConsumptionId(consumerGroup, eventId));
	}

	private void markConsumed(String consumerGroup, UUID eventId) {
		if (eventId == null) {
			return;
		}
		try {
			eventConsumptionRepository.saveAndFlush(new EventConsumption(consumerGroup, eventId));
		} catch (DataIntegrityViolationException ex) {
			// Lost a race with a concurrent delivery of the same event — the
			// other one already recorded completion.
		}
	}

	private static boolean isBlank(String s) {
		return s == null || s.isBlank();
	}

	private static String blankToNull(String s) {
		return isBlank(s) ? null : s;
	}

	private String manageBookingUrl(String reference, String guestEmail) {
		return frontendBaseUrl + "/reservation?ref=" + urlEncode(reference) + "&email=" + urlEncode(guestEmail);
	}

	private static String urlEncode(String value) {
		return URLEncoder.encode(value, StandardCharsets.UTF_8);
	}

	private static String pluralize(int count, String singular, String plural) {
		return count + " " + (count == 1 ? singular : plural);
	}

	private static String guestsDisplay(Short adults, Short children) {
		int a = adults == null ? 0 : adults;
		int c = children == null ? 0 : children;
		String display = pluralize(a, "Adult", "Adults");
		if (c > 0) {
			display += ", " + pluralize(c, "Child", "Children");
		}
		return display;
	}

	/** Distinct room type names across a reservation's lines, in the order
	 * they were booked — a single-room booking (the common case) reads as
	 * just the one name. */
	private String roomTypeNames(Reservation reservation) {
		return reservation.getRoomLines().stream()
				.map(ReservationRoom::getRoomTypeId)
				.distinct()
				.map(catalog::getRoomType)
				.map(RoomType::getName)
				.reduce((a, b) -> a + ", " + b)
				.orElse("Room");
	}

	private static String paymentStatusDisplay(Reservation reservation) {
		return switch (reservation.getPaymentStatus()) {
			case captured -> "Paid";
			case pending -> "Payment pending";
			case authorized -> "Payment authorized";
			case failed -> "Payment failed";
			case refunded -> "Refunded";
			case partially_refunded -> "Partially refunded";
		};
	}

	/** Whole-currency-unit display ("MAD 1,234"), matching
	 * {@code DocumentGenerationServiceImpl}'s convention. */
	private static String money(BigDecimal amount, String currencyCode) {
		BigDecimal value = amount == null ? BigDecimal.ZERO : amount;
		long rounded = value.setScale(0, RoundingMode.HALF_UP).longValueExact();
		return currencyCode + " " + NumberFormat.getIntegerInstance(Locale.US).format(rounded);
	}
}
