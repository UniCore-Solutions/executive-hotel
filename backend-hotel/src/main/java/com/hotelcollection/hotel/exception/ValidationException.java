package com.hotelcollection.hotel.exception;

/**
 * Invalid or malformed client input (bad UUID, out-of-range dates, missing
 * fields, …). Maps to {@link ErrorCode#VALIDATION} / HTTP 400. The message is
 * shown to clients; it is not logged (expected client behaviour).
 */
public class ValidationException extends DomainException {

	public ValidationException(String message) {
		super(ErrorCode.VALIDATION, message);
	}
}