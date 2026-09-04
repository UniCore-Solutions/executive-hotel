package com.hotelcollection.hotel.service.impl;

import java.time.Instant;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.repository.LoginGrantRepository;
import com.hotelcollection.hotel.repository.OAuthStateRepository;

/**
 * Purges expired {@code oauth_states}/{@code login_grants} rows. Hygiene
 * only — both tables are already checked for expiry at read time
 * ({@link ExternalAuthServiceImpl}), so this job's failure or delay is never
 * a correctness issue, only table bloat. Styled on {@link ReservationHoldExpiryJob}.
 */
@Component
public class OAuthStateExpiryJob {

	private final OAuthStateRepository oauthStateRepository;
	private final LoginGrantRepository loginGrantRepository;

	public OAuthStateExpiryJob(OAuthStateRepository oauthStateRepository,
			LoginGrantRepository loginGrantRepository) {
		this.oauthStateRepository = oauthStateRepository;
		this.loginGrantRepository = loginGrantRepository;
	}

	@Scheduled(fixedDelayString = "${app.oauth.cleanup-interval-ms:300000}")
	@Transactional
	public void purgeExpired() {
		Instant now = Instant.now();
		oauthStateRepository.deleteExpired(now);
		loginGrantRepository.deleteExpired(now);
	}
}
