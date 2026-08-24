package com.hotelcollection.hotel.exception;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpMethod;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import com.hotelcollection.hotel.security.TraceIdFilter;

import jakarta.validation.ConstraintViolationException;

/**
 * Error contract unit tests: every exception family maps to the agreed
 * (status, code, message) pair and the envelope carries path + traceId.
 */
class GlobalExceptionHandlerTest {

	private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

	private ApiError handle(Exception ex, String uri) {
		MockHttpServletRequest request = new MockHttpServletRequest("GET", uri);
		request.setAttribute(TraceIdFilter.REQUEST_ATTRIBUTE, "trace-123");
		if (ex instanceof DomainException de) {
			return handler.domain(de, request).getBody();
		}
		if (ex instanceof AuthenticationException ae) {
			return handler.authentication(ae, request).getBody();
		}
		if (ex instanceof AccessDeniedException ade) {
			return handler.accessDenied(ade, request).getBody();
		}
		if (ex instanceof ConstraintViolationException cve) {
			return handler.beanValidation(cve, request).getBody();
		}
		if (ex instanceof HttpMessageNotReadableException || ex instanceof MethodArgumentTypeMismatchException
				|| ex instanceof MissingServletRequestPartException) {
			return handler.malformed(ex, request).getBody();
		}
		if (ex instanceof NoResourceFoundException nre) {
			return handler.noResource(nre, request).getBody();
		}
		if (ex instanceof DataIntegrityViolationException dive) {
			return handler.dataConflict(dive, request).getBody();
		}
		if (ex instanceof MaxUploadSizeExceededException mue) {
			return handler.tooLarge(mue, request).getBody();
		}
		return handler.unexpected(ex, request).getBody();
	}

	@Test
	void domainNotFound() {
		ApiError body = handle(DomainException.notFound("media not found"), "/api/v1/media/x");
		assertThat(body.status()).isEqualTo(404);
		assertThat(body.code()).isEqualTo("NOT_FOUND");
		assertThat(body.message()).isEqualTo("media not found");
	}

	@Test
	void validationForbiddenConflict() {
		assertThat(handle(DomainException.validation("bad input"), "/x").status()).isEqualTo(400);
		assertThat(handle(DomainException.validation("bad input"), "/x").code())
				.isEqualTo("VALIDATION");
		assertThat(handle(DomainException.forbidden("no"), "/x").status()).isEqualTo(403);
		assertThat(handle(DomainException.conflict("dup"), "/x").status()).isEqualTo(409);
	}

	@Test
	void technicalFailureIsGeneric() {
		ApiError body = handle(DomainException.technical("db blew up"), "/x");
		assertThat(body.status()).isEqualTo(500);
		assertThat(body.code()).isEqualTo("INTERNAL_ERROR");
		assertThat(body.message()).isEqualTo("internal error");
		assertThat(body.message()).doesNotContain("db blew up");
	}

	@Test
	void frameworkClientErrorsMapTo400Validation() {
		ApiError typeMismatch = handle(new MethodArgumentTypeMismatchException("abc",
				UUID.class, "id", null, null), "/x");
		assertThat(typeMismatch.status()).isEqualTo(400);
		assertThat(typeMismatch.code()).isEqualTo("VALIDATION");

		ApiError unreadable = handle(
				new HttpMessageNotReadableException("bad body", (org.springframework.http.HttpInputMessage) null),
				"/x");
		assertThat(unreadable.code()).isEqualTo("VALIDATION");

		ApiError constraints = handle(new ConstraintViolationException(Set.of()), "/x");
		assertThat(constraints.code()).isEqualTo("VALIDATION");

		ApiError missingPart = handle(new MissingServletRequestPartException("file"), "/x");
		assertThat(missingPart.code()).isEqualTo("VALIDATION");
	}

	@Test
	void unknownPathIs404() {
		ApiError body = handle(
				new NoResourceFoundException(HttpMethod.GET, "/api/v1/nope", "not found"),
				"/api/v1/nope");
		assertThat(body.status()).isEqualTo(404);
		assertThat(body.code()).isEqualTo("NOT_FOUND");
	}

	@Test
	void dataConflictIs409() {
		ApiError body = handle(new DataIntegrityViolationException("duplicate key"), "/x");
		assertThat(body.status()).isEqualTo(409);
		assertThat(body.code()).isEqualTo("CONFLICT");
	}

	@Test
	void securityFailuresMapTo401And403() {
		ApiError unauthorized = handle(new BadCredentialsException("bad"), "/x");
		assertThat(unauthorized.status()).isEqualTo(401);
		assertThat(unauthorized.code()).isEqualTo("UNAUTHORIZED");

		ApiError forbidden = handle(new AccessDeniedException("no"), "/x");
		assertThat(forbidden.status()).isEqualTo(403);
		assertThat(forbidden.code()).isEqualTo("FORBIDDEN");
	}

	@Test
	void uploadOverLimitIs413() {
		ApiError body = handle(new MaxUploadSizeExceededException(1_000_000L), "/x");
		assertThat(body.status()).isEqualTo(413);
		assertThat(body.code()).isEqualTo("VALIDATION");
	}

	@Test
	void unexpectedIsGeneric500() {
		ApiError body = handle(new IllegalStateException("boom"), "/x");
		assertThat(body.status()).isEqualTo(500);
		assertThat(body.code()).isEqualTo("INTERNAL_ERROR");
		assertThat(body.message()).isEqualTo("internal error");
	}

	@Test
	void envelopeCarriesPathAndTraceId() {
		ApiError body = handle(DomainException.notFound("x"), "/api/v1/things/1");
		assertThat(body.path()).isEqualTo("/api/v1/things/1");
		assertThat(body.traceId()).isEqualTo("trace-123");
		assertThat(body.timestamp()).isNotNull();
	}
}