package com.hotelcollection.hotel.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.Profile;

/**
 * The production guard on the simulated payment provider (audit finding P0-1).
 *
 * <p>With auto-settlement on, a card checkout captures the payment and promotes the
 * reservation to {@code confirmed} with no money movement — selling inventory and
 * issuing an invoice for free. The property defaults to {@code false}, and under the
 * {@code prod} profile the application must refuse to start rather than accept it.
 *
 * <p>Verified live on 2026-08-31: a container run with {@code SPRING_PROFILES_ACTIVE=prod}
 * and {@code PAYMENT_AUTO_SETTLE_ENABLED=true} exits non-zero with this message.
 */
class PaymentSafetyConfigTest {

	@Test
	void refusesToStartWhenSimulatedSettlementIsEnabled() {
		PaymentSafetyConfig config = new PaymentSafetyConfig(true);

		assertThatThrownBy(config::rejectSimulatedPaymentSettlement)
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("auto-settle-enabled must be false")
				.hasMessageContaining("prod");
	}

	@Test
	void startsNormallyWhenSimulatedSettlementIsDisabled() {
		PaymentSafetyConfig config = new PaymentSafetyConfig(false);

		assertThatCode(config::rejectSimulatedPaymentSettlement).doesNotThrowAnyException();
	}

	/**
	 * The guard is only meaningful if it is actually wired to the prod profile —
	 * an annotation typo would silently disable it everywhere.
	 */
	@Test
	void theGuardIsScopedToTheProdProfile() {
		Profile profile = PaymentSafetyConfig.class.getAnnotation(Profile.class);

		assertThat(profile).as("PaymentSafetyConfig must be @Profile-scoped").isNotNull();
		assertThat(profile.value()).containsExactly("prod");
	}

	/**
	 * Must run during context refresh, not after startup. An {@code ApplicationRunner}
	 * fires once the HTTP port is already bound — a live run showed the app logging
	 * "Started HotelPlatformApplication" before the guard tripped. A {@code @PostConstruct}
	 * fails the refresh, so the web server never binds.
	 */
	@Test
	void theGuardRunsDuringContextRefreshNotAfterStartup() throws Exception {
		assertThat(PaymentSafetyConfig.class
				.getDeclaredMethod("rejectSimulatedPaymentSettlement")
				.isAnnotationPresent(jakarta.annotation.PostConstruct.class))
				.as("guard must be @PostConstruct so it fails before the port is bound")
				.isTrue();
	}
}
