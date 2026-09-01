package com.hotelcollection.hotel.security;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.hotelcollection.hotel.exception.ErrorCode;
import com.hotelcollection.hotel.exception.ErrorResponseWriter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * In-memory fixed-window rate limit for the <em>anonymous</em> REST surface.
 *
 * <p>Every path in {@link #POLICIES} is reachable without credentials (see
 * {@code SecurityConfig}), so each one is an unauthenticated entry point that
 * an attacker can drive at will:
 *
 * <ul>
 *   <li><b>auth login/register</b> — credential brute force.</li>
 *   <li><b>reservations</b> — the important one. Creating a reservation sells
 *       a physical room unit and holds it for {@code app.reservations.hold-minutes}
 *       (15 by default). Unlimited anonymous creates let a trivial script pin
 *       the whole property's inventory indefinitely and deny the site's only
 *       revenue path. The {@code Idempotency-Key} requirement is no defence —
 *       the caller mints a fresh key each time. The prefix also covers
 *       {@code /{reference}/cancel}, where reference + email is the sole
 *       credential and is therefore brute-forceable.</li>
 *   <li><b>payments</b> — payment creation against a held reservation.</li>
 * </ul>
 *
 * <p>Budgets are per client IP <em>per policy</em>, so a booking burst cannot
 * exhaust the login budget (or vice versa). Over the limit returns 429 with
 * the standard {@link com.hotelcollection.hotel.exception.ApiError} envelope.
 *
 * <p>In-process only — a distributed limiter (Redis) is a future decision, and
 * this is not a substitute for an edge/WAF limit in front of the application.
 * Disable wholesale with {@code app.security.rate-limit-enabled} (the
 * integration suite does, since it performs far more than these volumes).
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

	private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

	private static final Duration WINDOW = Duration.ofMinutes(1);

	/**
	 * Matched most-specific-first; the first matching prefix wins. A legitimate
	 * guest books once, so the reservation budget is deliberately tight — it
	 * still leaves room for a retry and a cancellation in the same minute.
	 */
	private static final List<Policy> POLICIES = List.of(
			new Policy("/api/v1/auth/login", 20),
			new Policy("/api/v1/auth/register", 20),
			new Policy("/api/v1/reservations", 5),
			new Policy("/api/v1/payments", 10));

	private final Map<String, Window> windows = new ConcurrentHashMap<>();
	private final boolean enabled;
	private final Set<String> trustedProxies;
	private final ErrorResponseWriter errorWriter;

	public RateLimitFilter(
			@Value("${app.security.rate-limit-enabled:true}") boolean enabled,
			@Value("${app.security.trusted-proxies:}") String trustedProxies,
			ErrorResponseWriter errorWriter) {
		this.enabled = enabled;
		this.trustedProxies = java.util.Arrays.stream(trustedProxies.split(","))
				.map(String::trim)
				.filter(s -> !s.isBlank())
				.collect(java.util.stream.Collectors.toUnmodifiableSet());
		this.errorWriter = errorWriter;
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		return !enabled || policyFor(request).isEmpty();
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
			FilterChain chain) throws ServletException, IOException {
		Optional<Policy> policy = policyFor(request);
		if (policy.isPresent() && !tryAcquire(request, policy.get())) {
			// Security-relevant: a sustained trip on the reservations policy is
			// what an inventory-exhaustion attempt looks like. The trace id
			// comes from the MDC (TraceIdFilter).
			log.warn("rate limit exceeded: policy={} limit={}/min ip={} method={} path={}",
					policy.get().prefix(), policy.get().maxRequests(), clientIp(request),
					request.getMethod(), request.getRequestURI());
			errorWriter.write(request, response, ErrorCode.RATE_LIMITED,
					"too many requests, retry later");
			return;
		}
		chain.doFilter(request, response);
	}

	/**
	 * Safe (read-only) methods are never limited.
	 *
	 * <p>Every attack these budgets exist to stop is a <em>write</em>: creating
	 * reservations that hold inventory, creating payments, brute-forcing
	 * credentials. Reads on the same prefixes are cheap and are legitimately
	 * polled — {@code GET /api/v1/payments/{id}} is the payment-status endpoint a
	 * guest's browser polls every 2s for up to two minutes while an async
	 * settlement resolves. Counting those against the write budget rate-limits a
	 * paying guest out of their own confirmation, which a live end-to-end run
	 * caught: six status polls exhausted the payments budget and the subsequent
	 * capture returned 429.
	 */
	private static final Set<String> SAFE_METHODS = Set.of("GET", "HEAD", "OPTIONS");

	private Optional<Policy> policyFor(HttpServletRequest request) {
		if (SAFE_METHODS.contains(request.getMethod())) {
			return Optional.empty();
		}
		String path = request.getRequestURI();
		return POLICIES.stream().filter(p -> path.startsWith(p.prefix())).findFirst();
	}

	private boolean tryAcquire(HttpServletRequest request, Policy policy) {
		// Per IP *and* per policy: bursting one endpoint must not consume
		// another's budget.
		String key = clientIp(request) + "|" + policy.prefix();
		Window window = windows.compute(key, (k, existing) ->
				existing == null || existing.expired() ? new Window() : existing);
		return window.tryAcquire(policy.maxRequests());
	}

	/**
	 * The client identity a budget is keyed on.
	 *
	 * <p>{@code X-Forwarded-For} is honoured <b>only</b> when the immediate peer is
	 * a configured trusted proxy. Trusting it unconditionally makes the whole
	 * limiter a no-op: a live probe rotated {@code X-Forwarded-For: 10.9.9.N} and
	 * every request sailed past a budget that had already tripped for the same
	 * real client. Any header an attacker controls cannot be an identity.
	 *
	 * <p>With no trusted proxy configured (the default) the peer address is used.
	 * Note the deployment consequence: guest traffic reaches this service through
	 * the Next.js BFF, so it all shares that container's address and therefore one
	 * budget. That is deliberately the safe failure mode — it throttles rather
	 * than waves through — but it means effective per-client limiting needs
	 * {@code app.security.trusted-proxies} set to the BFF/ingress address, with
	 * that hop setting a trustworthy {@code X-Forwarded-For}. See the class
	 * javadoc: this is a coarse safety net, not a replacement for an edge/WAF limit.
	 */
	private String clientIp(HttpServletRequest request) {
		String peer = request.getRemoteAddr();
		if (trustedProxies.contains(peer)) {
			String forwarded = request.getHeader("X-Forwarded-For");
			if (forwarded != null && !forwarded.isBlank()) {
				return forwarded.split(",")[0].trim();
			}
		}
		return peer;
	}

	/** An anonymous path prefix and the requests per {@link #WINDOW} allowed on it. */
	private record Policy(String prefix, int maxRequests) {
	}

	private static final class Window {
		private final Instant start = Instant.now();
		private int count;

		boolean expired() {
			return Instant.now().isAfter(start.plus(WINDOW));
		}

		synchronized boolean tryAcquire(int maxRequests) {
			if (count >= maxRequests) {
				return false;
			}
			count++;
			return true;
		}
	}
}
