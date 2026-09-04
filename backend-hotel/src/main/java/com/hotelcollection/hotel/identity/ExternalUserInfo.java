package com.hotelcollection.hotel.identity;

/**
 * The identity facts an {@link ExternalIdentityProvider} asserts about a user
 * after a successful exchange — already validated (signature, issuer,
 * audience, expiry, subject) by the time this exists. Deliberately carries no
 * access/refresh token: this application only ever needs to know who the
 * user is, never to call the provider's APIs on their behalf.
 */
public record ExternalUserInfo(String subject, String email, boolean emailVerified, String displayName) {
}
