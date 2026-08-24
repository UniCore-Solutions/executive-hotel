package com.hotelcollection.hotel.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import graphql.analysis.MaxQueryDepthInstrumentation;
import graphql.execution.instrumentation.Instrumentation;

/**
 * GraphQL runtime wiring: query depth limit. A hard cap on nesting depth
 * bounds the cost of hostile queries (billion-laughs style over deep
 * selections); 15 levels covers the deepest documented client selection
 * with headroom, while keeping the endpoint safe for anonymous callers.
 */
@Configuration
public class GraphqlConfig {

	public static final int MAX_QUERY_DEPTH = 15;

	@Bean
	Instrumentation queryDepthInstrumentation() {
		return new MaxQueryDepthInstrumentation(MAX_QUERY_DEPTH);
	}
}