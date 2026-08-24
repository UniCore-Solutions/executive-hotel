package com.hotelcollection.hotel.exception;

import java.time.Instant;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;

import com.hotelcollection.hotel.security.TraceIdFilter;

/**
 * REST error envelope (one taxonomy across REST, GraphQL and the security
 * filters). Fields: timestamp, HTTP status, stable {@link ErrorCode}, safe
 * client-facing message, request path and the request's {@code traceId} so
 * clients can correlate an error with server logs.
 */
public record ApiError(Instant timestamp, int status, String code, String message,
		String path, String traceId) {

	public static ApiError of(ErrorCode code, String message, HttpServletRequest request) {
		return new ApiError(Instant.now(), code.httpStatus().value(), code.name(), message,
				request.getRequestURI(),
				TraceIdFilter.currentTraceId(request));
	}

	public static ApiError of(ErrorCode code, String message, HttpStatus status,
			HttpServletRequest request) {
		return new ApiError(Instant.now(), status.value(), code.name(), message,
				request.getRequestURI(),
				TraceIdFilter.currentTraceId(request));
	}

	/** Envelope without request context (unit tests / non-web paths). */
	public static ApiError of(ErrorCode code, String message, HttpStatus status, String path,
			String traceId) {
		return new ApiError(Instant.now(), status.value(), code.name(), message, path, traceId);
	}
}