package com.hotelcollection.hotel.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;

/**
 * REST error contract: one taxonomy (REST, GraphQL, security filters), mapped
 * to HTTP status codes, with a consistent {@link ApiError} envelope.
 *
 * <p>Mappings: business/validation exceptions → the status of their
 * {@link ErrorCode}; framework client errors → 400; unknown paths → 404;
 * authorization failures → 403; data conflicts → 409; uploads over the limit
 * → 413; everything unexpected → a safe generic 500, logged with the cause.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(DomainException.class)
	public ResponseEntity<ApiError> domain(DomainException ex, HttpServletRequest request) {
		ErrorCode code = ex.getCode();
		// Technical failures are never surfaced to clients: log the cause and
		// return a safe generic message.
		if (ex instanceof TechnicalException) {
			log.error("technical failure", ex);
			return ResponseEntity.status(code.httpStatus())
					.body(ApiError.of(ErrorCode.INTERNAL_ERROR, "internal error",
							HttpStatus.INTERNAL_SERVER_ERROR, request));
		}
		return ResponseEntity.status(code.httpStatus())
				.body(ApiError.of(code, ex.getMessage(), request));
	}

	@ExceptionHandler(AuthenticationException.class)
	public ResponseEntity<ApiError> authentication(AuthenticationException ex,
			HttpServletRequest request) {
		return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
				.body(ApiError.of(ErrorCode.UNAUTHORIZED, "authentication required", request));
	}

	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<ApiError> accessDenied(AccessDeniedException ex,
			HttpServletRequest request) {
		return ResponseEntity.status(HttpStatus.FORBIDDEN)
				.body(ApiError.of(ErrorCode.FORBIDDEN, "access denied", request));
	}

	@ExceptionHandler({ MethodArgumentNotValidException.class, BindException.class,
			ConstraintViolationException.class })
	public ResponseEntity<ApiError> beanValidation(Exception ex, HttpServletRequest request) {
		return ResponseEntity.status(HttpStatus.BAD_REQUEST)
				.body(ApiError.of(ErrorCode.VALIDATION, "invalid request", request));
	}

	@ExceptionHandler({ HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class,
			MissingServletRequestPartException.class })
	public ResponseEntity<ApiError> malformed(Exception ex, HttpServletRequest request) {
		return ResponseEntity.status(HttpStatus.BAD_REQUEST)
				.body(ApiError.of(ErrorCode.VALIDATION, "malformed request", request));
	}

	@ExceptionHandler(NoResourceFoundException.class)
	public ResponseEntity<ApiError> noResource(NoResourceFoundException ex,
			HttpServletRequest request) {
		return ResponseEntity.status(HttpStatus.NOT_FOUND)
				.body(ApiError.of(ErrorCode.NOT_FOUND, "resource not found", request));
	}

	@ExceptionHandler(DataIntegrityViolationException.class)
	public ResponseEntity<ApiError> dataConflict(DataIntegrityViolationException ex,
			HttpServletRequest request) {
		// Constraint conflicts (duplicates, dangling references, …) are client
		// errors; SQL details stay in the logs.
		log.warn("data integrity violation: {}", ex.getMessage());
		return ResponseEntity.status(HttpStatus.CONFLICT)
				.body(ApiError.of(ErrorCode.CONFLICT, "data conflict", request));
	}

	@ExceptionHandler(MaxUploadSizeExceededException.class)
	public ResponseEntity<ApiError> tooLarge(MaxUploadSizeExceededException ex,
			HttpServletRequest request) {
		return ResponseEntity.status(HttpStatus.PAYLOAD_TOO_LARGE)
				.body(ApiError.of(ErrorCode.VALIDATION, "file exceeds the upload size limit",
						HttpStatus.PAYLOAD_TOO_LARGE, request));
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ApiError> unexpected(Exception ex, HttpServletRequest request) {
		log.error("unhandled exception", ex);
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(ApiError.of(ErrorCode.INTERNAL_ERROR, "internal error", request));
	}
}