package com.hotelcollection.hotel.config;

import org.apache.kafka.common.TopicPartition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.ExponentialBackOff;

import com.hotelcollection.hotel.entity.EventEnvelope;
import com.hotelcollection.hotel.exception.DomainException;

/**
 * Container factory for {@code EmailEventConsumer} — the first consumer
 * config in this codebase (everything before this was producer-only, see
 * {@code KafkaOutboxPublisher}).
 *
 * <p>Retry/DLQ policy (§23/24): a thrown exception is retried up to four
 * times with exponential backoff (1s, 2s, 4s, 8s — capped at ~15s elapsed),
 * then the record is published to {@code <original-topic>.DLT} and the
 * offset is committed so the consumer moves on — a stuck poison message
 * would otherwise block every later email on the same partition forever.
 * {@link DomainException} (not-found/validation/conflict — a deterministic
 * business outcome; reprocessing the same event produces the same result)
 * skips retries entirely and goes straight to the DLT.
 */
@Configuration
public class KafkaConsumerConfig {

	@Bean
	public ConcurrentKafkaListenerContainerFactory<String, EventEnvelope> emailListenerContainerFactory(
			ConsumerFactory<String, EventEnvelope> consumerFactory,
			KafkaTemplate<String, EventEnvelope> kafkaTemplate) {
		ConcurrentKafkaListenerContainerFactory<String, EventEnvelope> factory =
				new ConcurrentKafkaListenerContainerFactory<>();
		factory.setConsumerFactory(consumerFactory);
		factory.setCommonErrorHandler(emailErrorHandler(kafkaTemplate));
		return factory;
	}

	private DefaultErrorHandler emailErrorHandler(KafkaTemplate<String, EventEnvelope> kafkaTemplate) {
		DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(kafkaTemplate,
				(record, ex) -> new TopicPartition(record.topic() + ".DLT", record.partition()));
		ExponentialBackOff backOff = new ExponentialBackOff(1000L, 2.0);
		backOff.setMaxElapsedTime(15_000L);
		DefaultErrorHandler handler = new DefaultErrorHandler(recoverer, backOff);
		handler.addNotRetryableExceptions(DomainException.class);
		return handler;
	}
}
