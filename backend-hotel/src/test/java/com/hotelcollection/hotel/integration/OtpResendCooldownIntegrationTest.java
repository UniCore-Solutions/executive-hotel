package com.hotelcollection.hotel.integration;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.context.TestPropertySource;

import com.hotelcollection.hotel.entity.OtpPurpose;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.exception.ErrorCode;
import com.hotelcollection.hotel.service.OtpService;

/**
 * The resend cooldown itself, isolated in its own context — every other OTP
 * test relies on {@code app.otp.resend-cooldown-seconds=0} (the shared test
 * default) so it can re-issue a code directly to capture a known plaintext
 * value; this class re-enables the real cooldown instead, the same idiom
 * {@code RateLimitIntegrationTest} uses for {@code app.security.rate-limit-enabled}.
 */
@SpringBootTest
@ContextConfiguration(classes = TestcontainersConfiguration.class)
@TestPropertySource(properties = "app.otp.resend-cooldown-seconds=30")
class OtpResendCooldownIntegrationTest {

	@Autowired
	OtpService otpService;

	@Test
	void secondIssueWithinTheCooldownWindowIsRejected() {
		String email = "otp-cooldown-" + System.nanoTime() + "@example.com";
		otpService.issue(OtpPurpose.registration_verification, email, "Cool", null, null);

		assertThatThrownBy(() -> otpService.issue(OtpPurpose.registration_verification, email, "Cool", null, null))
				.isInstanceOf(DomainException.class)
				.extracting(ex -> ((DomainException) ex).getCode())
				.isEqualTo(ErrorCode.CONFLICT);
	}
}
