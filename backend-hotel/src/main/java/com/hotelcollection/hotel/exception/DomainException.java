package com.hotelcollection.hotel.exception;

/**
 * Base application exception. {@code code} is a stable API error code
 * (see {@link ErrorCode}) surfaced to clients in the REST envelope and the
 * GraphQL {@code code} extension.
 *
 * <p>Hierarchy:
 * <ul>
 *   <li>{@link DomainException} — expected business/domain failures (hotel
 *       not found, already cancelled, conflict, …); the message is part of
 *       the API contract and is shown to clients.</li>
 *   <li>{@link ValidationException} — malformed or invalid client input;
 *       message shown to clients.</li>
 *   <li>{@link TechnicalException} — infrastructure/unexpected failures;
 *       never shown to clients, always logged with the cause server-side.</li>
 * </ul>
 */
public class DomainException extends RuntimeException {

	private final ErrorCode code;

	public DomainException(ErrorCode code, String message) {
		super(message);
		this.code = code;
	}

	public ErrorCode getCode() {
		return code;
	}

	public static DomainException notFound(String message) {
		return new DomainException(ErrorCode.NOT_FOUND, message);
	}

	public static DomainException conflict(String message) {
		return new DomainException(ErrorCode.CONFLICT, message);
	}

	public static DomainException forbidden(String message) {
		return new DomainException(ErrorCode.FORBIDDEN, message);
	}

	/** Client-input failure (bad UUID, malformed payload, invalid range, …). */
	public static ValidationException validation(String message) {
		return new ValidationException(message);
	}

	/** Infrastructure/unexpected failure — message never reaches clients. */
	public static TechnicalException technical(String message) {
		return new TechnicalException(ErrorCode.INTERNAL_ERROR, message);
	}

	/** External/infrastructure unavailability (storage, providers, …). */
	public static TechnicalException unavailable(String message) {
		return new TechnicalException(ErrorCode.SERVICE_UNAVAILABLE, message);
	}
}