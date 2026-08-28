package com.hotelcollection.hotel.security;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.hotelcollection.hotel.exception.ErrorCode;
import com.hotelcollection.hotel.exception.ErrorResponseWriter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Simple in-memory fixed-window rate limit for the anonymous auth endpoints
 * (ADR-007 debt: brute-force protection). 20 requests per minute per client
 * IP, per window; over the limit returns 429 with the REST error envelope.
 * Covers the REST login/register endpoints (the GraphQL auth mutations no
 * longer exist — API rule: GraphQL = READ, REST = WRITE/ACTION). In-process
 * only — a distributed limiter (Redis) is a future decision. Disable with
 * {@code app.security.auth-rate-limit-enabled} (integration suites that
 * perform many registrations set it to false).
 */
@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {

	private static final int MAX_REQUESTS = 20;
	private static final Duration WINDOW = Duration.ofMinutes(1);

	private final Map<String, Window> windows = new ConcurrentHashMap<>();
	private final boolean enabled;

	private final ErrorResponseWriter errorWriter;

	public AuthRateLimitFilter(
			@Value("${app.security.auth-rate-limit-enabled:true}") boolean enabled,
			ErrorResponseWriter errorWriter) {
		this.enabled = enabled;
		this.errorWriter = errorWriter;
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		if (!enabled) {
			return true;
		}
		return !isRestAuthPath(request);
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
			FilterChain chain) throws ServletException, IOException {
		if (isRestAuthPath(request) && !tryAcquire(request)) {
			errorWriter.write(request, response, ErrorCode.RATE_LIMITED,
					"too many requests, retry later");
			return;
		}
		chain.doFilter(request, response);
	}

	private boolean tryAcquire(HttpServletRequest request) {
		String ip = clientIp(request);
		Window window = windows.compute(ip, (key, existing) ->
				existing == null || existing.expired() ? new Window() : existing);
		return window.tryAcquire();
	}

	private boolean isRestAuthPath(HttpServletRequest request) {
		String path = request.getRequestURI();
		return path.startsWith("/api/v1/auth/login")
				|| path.startsWith("/api/v1/auth/register");
	}

	private String clientIp(HttpServletRequest request) {
		String forwarded = request.getHeader("X-Forwarded-For");
		if (forwarded != null && !forwarded.isBlank()) {
			return forwarded.split(",")[0].trim();
		}
		return request.getRemoteAddr();
	}

	private static final class Window {
		private final Instant start = Instant.now();
		private int count;

		boolean expired() {
			return Instant.now().isAfter(start.plus(WINDOW));
		}

		boolean tryAcquire() {
			if (count >= MAX_REQUESTS) {
				return false;
			}
			count++;
			return true;
		}
	}
}
