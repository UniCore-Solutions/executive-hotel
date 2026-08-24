package com.hotelcollection.hotel.security;

import java.io.IOException;
import java.util.UUID;

import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Request correlation: exposes a {@code traceId} to error responses and the
 * logging context. Honors a client-supplied {@code X-Request-Id} (sanitized
 * to a safe length) and otherwise generates a UUID. The id is stored as a
 * request attribute (read by {@code ApiError.of}) and in the MDC so every
 * log line of a request carries it.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class TraceIdFilter extends OncePerRequestFilter {

	public static final String REQUEST_ATTRIBUTE = TraceIdFilter.class.getName() + ".traceId";
	public static final String MDC_KEY = "traceId";
	static final int MAX_HEADER_LENGTH = 64;

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
			FilterChain filterChain) throws ServletException, IOException {
		String supplied = request.getHeader("X-Request-Id");
		String traceId = (supplied == null || supplied.isBlank())
				? UUID.randomUUID().toString()
				: supplied.substring(0, Math.min(supplied.length(), MAX_HEADER_LENGTH));
		request.setAttribute(REQUEST_ATTRIBUTE, traceId);
		MDC.put(MDC_KEY, traceId);
		try {
			filterChain.doFilter(request, response);
		} finally {
			MDC.remove(MDC_KEY);
		}
	}

	/** The active request's trace id, or null when no filter ran. */
	public static String currentTraceId(HttpServletRequest request) {
		return (String) request.getAttribute(REQUEST_ATTRIBUTE);
	}
}