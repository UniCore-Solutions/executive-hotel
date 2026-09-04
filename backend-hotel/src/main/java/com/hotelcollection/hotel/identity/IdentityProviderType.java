package com.hotelcollection.hotel.identity;

/**
 * One value per {@link ExternalIdentityProvider} implementation. Adding a new
 * provider (Apple, Microsoft, GitHub, ...) means adding a value here, a new
 * {@link ExternalIdentityProvider} implementation, and a new
 * {@code app.oauth.<provider>.*} config block — nothing above this port
 * changes: not the controller, not the service, not the database schema.
 */
public enum IdentityProviderType {
	GOOGLE
}
