package com.hotelcollection.hotel.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

/**
 * A small dedicated pool for one-shot delayed tasks (currently: the
 * simulated payment-settlement callback scheduled by
 * {@code PaymentServiceImpl#createPayment}). Separate from the
 * {@code @Scheduled} annotation machinery (which needs no bean of its own)
 * because that one only runs fixed-rate/fixed-delay jobs, never an
 * arbitrary one-off delay computed at runtime.
 */
@Configuration
public class SchedulingConfig {

	@Bean
	TaskScheduler paymentSimulationScheduler() {
		ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
		scheduler.setPoolSize(2);
		scheduler.setThreadNamePrefix("payment-sim-");
		scheduler.initialize();
		return scheduler;
	}
}
