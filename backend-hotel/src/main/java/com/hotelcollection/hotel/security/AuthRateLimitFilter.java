package com.hotelcollection.hotel.security;

import java.io.BufferedReader;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.hotelcollection.hotel.exception.ErrorCode;
import com.hotelcollection.hotel.exception.ErrorResponseWriter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ReadListener;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletInputStream;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletRequestWrapper;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Simple in-memory fixed-window rate limit for the anonymous auth endpoints
 * (ADR-007 debt: brute-force protection). 20 requests per minute per client
 * IP, per window; over the limit returns 429 with the REST error envelope.
 * Covers the REST login/register endpoints AND the GraphQL login/register
 * mutations (detected by inspecting the request body). The body is buffered
 * upfront in a wrapper that serves a fresh stream to downstream consumers, so
 * the GraphQL handler still sees the full payload. Legitimate non-auth
 * GraphQL traffic is never limited. In-process only — a distributed limiter
 * (Redis) is a future decision. Disable with
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
		return !(isRestAuthPath(request) || isGraphQlPost(request));
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
			FilterChain chain) throws ServletException, IOException {
		HttpServletRequest effective = request;
		boolean authOperation = isRestAuthPath(request);
		if (!authOperation && isGraphQlPost(request)) {
			BufferedRequestWrapper wrapper = new BufferedRequestWrapper(request);
			authOperation = isAuthOperationInBody(wrapper);
			effective = wrapper;
		}
		if (authOperation && !tryAcquire(effective)) {
			errorWriter.write(request, response, ErrorCode.RATE_LIMITED,
					"too many requests, retry later");
			return;
		}
		chain.doFilter(effective, response);
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

	private boolean isGraphQlPost(HttpServletRequest request) {
		return request.getRequestURI().startsWith("/graphql")
				&& "POST".equalsIgnoreCase(request.getMethod());
	}

	/**
	 * Detects the anonymous auth mutations in the GraphQL POST body (already
	 * buffered by the wrapper).
	 */
	private boolean isAuthOperationInBody(BufferedRequestWrapper wrapper) {
		byte[] body = wrapper.body();
		if (body.length == 0) {
			return false;
		}
		String lower = new String(body, StandardCharsets.UTF_8).toLowerCase(Locale.ROOT);
		return lower.contains("login") || lower.contains("register");
	}

	private String clientIp(HttpServletRequest request) {
		String forwarded = request.getHeader("X-Forwarded-For");
		if (forwarded != null && !forwarded.isBlank()) {
			return forwarded.split(",")[0].trim();
		}
		return request.getRemoteAddr();
	}

	/**
	 * Buffers the request body once at construction and serves a fresh stream
	 * on every {@code getInputStream()}/{@code getReader()} call, so both this
	 * filter and downstream consumers can read the full payload.
	 */
	private static final class BufferedRequestWrapper extends HttpServletRequestWrapper {

		private final byte[] body;

		BufferedRequestWrapper(HttpServletRequest request) throws IOException {
			super(request);
			this.body = request.getInputStream().readAllBytes();
		}

		byte[] body() {
			return body;
		}

		@Override
		public ServletInputStream getInputStream() {
			ByteArrayInputStream source = new ByteArrayInputStream(body);
			return new ServletInputStream() {
				@Override
				public int read() {
					return source.read();
				}

				@Override
				public boolean isFinished() {
					return source.available() == 0;
				}

				@Override
				public boolean isReady() {
					return true;
				}

				@Override
				public void setReadListener(ReadListener readListener) {
					throw new UnsupportedOperationException();
				}
			};
		}

		@Override
		public BufferedReader getReader() {
			return new BufferedReader(
					new InputStreamReader(getInputStream(), StandardCharsets.UTF_8));
		}
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
