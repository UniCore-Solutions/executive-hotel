package com.hotelcollection.hotel.dto.email;

/** Template-facing data for {@code email/welcome}. Built by
 * {@code NotificationServiceImpl}, never assembled inside the template. */
public record WelcomeEmailData(String firstName, String accountUrl) {
}
