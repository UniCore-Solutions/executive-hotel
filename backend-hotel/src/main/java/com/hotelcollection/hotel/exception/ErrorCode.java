package com.hotelcollection.hotel.exception;

import org.springframework.http.HttpStatus;

/**
 * Stable API error codes — part of the API contract (AGENTS.md rule 7).
 * Clients branch on these codes, never on exception class names or messages.
 * Each code carries the HTTP status used by the REST transport.
 */
public enum ErrorCode {

	NOT_FOUND(HttpStatus.NOT_FOUND),
	FORBIDDEN(HttpStatus.FORBIDDEN),
	CONFLICT(HttpStatus.CONFLICT),
	VALIDATION(HttpStatus.BAD_REQUEST),
	UNAUTHORIZED(HttpStatus.UNAUTHORIZED),
	RATE_LIMITED(HttpStatus.TOO_MANY_REQUESTS),
	INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR),
	SERVICE_UNAVAILABLE(HttpStatus.SERVICE_UNAVAILABLE);

	private final HttpStatus httpStatus;

	ErrorCode(HttpStatus httpStatus) {
		this.httpStatus = httpStatus;
	}

	public HttpStatus httpStatus() {
		return httpStatus;
	}
}