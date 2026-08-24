package com.hotelcollection.hotel.exception;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;
import com.hotelcollection.hotel.security.TraceIdFilter;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Writes the standard {@link ApiError} envelope from the security filters
 * (401 entry point, 403 access denied, 429 rate limit) — the only paths that
 * run before Spring MVC, so they bypass {@link GlobalExceptionHandler}. Keeps
 * the REST, GraphQL and filter error shapes identical.
 */
@Component
public class ErrorResponseWriter {

	private final ObjectMapper objectMapper;

	public ErrorResponseWriter(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	public void write(HttpServletRequest request, HttpServletResponse response,
			ErrorCode code, String message) throws IOException {
		write(request, response, code, code.httpStatus(), message);
	}

	public void write(HttpServletRequest request, HttpServletResponse response,
			ErrorCode code, HttpStatus status, String message) throws IOException {
		response.setStatus(status.value());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding("UTF-8");
		objectMapper.writeValue(response.getWriter(),
				ApiError.of(code, message, status, request.getRequestURI(),
						TraceIdFilter.currentTraceId(request)));
	}
}