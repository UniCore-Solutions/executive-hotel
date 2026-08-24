package com.hotelcollection.hotel.exception;

/**
 * Infrastructure / unexpected failure (database, storage, messaging, external
 * providers, …). The message is a safe generic description — never internals
 * — and the global handlers log the full cause server-side.
 */
public class TechnicalException extends DomainException {

	public TechnicalException(ErrorCode code, String message) {
		super(code, message);
	}
}