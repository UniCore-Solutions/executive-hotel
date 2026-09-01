package com.hotelcollection.hotel.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import jakarta.annotation.PostConstruct;

/**
 * Production guard for the simulated payment provider.
 *
 * <p>There is no real payment gateway in this platform. When
 * {@code app.payments.auto-settle-enabled} is true, a plain card checkout
 * schedules an in-process callback that captures the payment and promotes the
 * reservation to {@code confirmed} — selling inventory and issuing an invoice
 * with no money movement. That is exactly what dev and QA want, and exactly
 * what production must never do.
 *
 * <p>The property therefore defaults to {@code false} and this runner makes it
 * unsettable under the {@code prod} profile: the application refuses to start
 * rather than silently accepting free bookings. Mirrors the fail-fast
 * {@code JWT_SECRET} validation in {@link com.hotelcollection.hotel.security.JwtService}.
 */
@Configuration
@Profile("prod")
public class PaymentSafetyConfig {

	private final boolean autoSettleEnabled;

	public PaymentSafetyConfig(
			@Value("${app.payments.auto-settle-enabled:false}") boolean autoSettleEnabled) {
		this.autoSettleEnabled = autoSettleEnabled;
	}

	/**
	 * Runs during context refresh — deliberately <em>not</em> an
	 * {@code ApplicationRunner}, which fires only after the context is up and the
	 * HTTP port is already bound. A live run showed that ordering: the log said
	 * "Started HotelPlatformApplication" before the guard tripped. Failing here
	 * means the web server never binds and the container never accepts a request.
	 */
	@PostConstruct
	void rejectSimulatedPaymentSettlement() {
		if (autoSettleEnabled) {
			throw new IllegalStateException("""
					app.payments.auto-settle-enabled must be false under the 'prod' profile.

					The simulated payment provider captures payments and confirms \
					reservations without any money movement. Unset \
					PAYMENT_AUTO_SETTLE_ENABLED (or set it to false) before \
					deploying, and integrate a real payment provider before \
					taking live bookings.""");
		}
	}
}
