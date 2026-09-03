package com.hotelcollection.hotel.email;

/**
 * Resolves the single {@link EmailProvider} implementation configured via
 * {@code app.email.provider}. The only thing {@code NotificationServiceImpl}
 * depends on to send mail — switching providers is a configuration change,
 * never a code change to a business service, the Kafka consumer, or a
 * template.
 */
public interface EmailProviderFactory {

	EmailProvider resolve();
}
