package com.hotelcollection.hotel.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import graphql.analysis.MaxQueryComplexityInstrumentation;
import graphql.analysis.MaxQueryDepthInstrumentation;
import graphql.execution.instrumentation.Instrumentation;

/**
 * GraphQL runtime wiring: query cost limits. {@code /graphql} is
 * {@code permitAll}, so both caps apply to fully anonymous callers.
 *
 * <p><b>Depth</b> bounds nesting (billion-laughs style over deep selections);
 * 15 levels covers the deepest documented client selection with headroom.
 *
 * <p><b>Complexity</b> bounds total field count, which depth alone does not:
 * a flat query repeating hundreds of expensive fields stays within depth 15
 * while costing far more to resolve. 1000 is generous next to the largest real
 * client document (the admin hotel workspace) and still rejects abuse.
 */
@Configuration
public class GraphqlConfig {

	public static final int MAX_QUERY_DEPTH = 15;
	public static final int MAX_QUERY_COMPLEXITY = 1000;

	@Bean
	Instrumentation queryDepthInstrumentation() {
		return new MaxQueryDepthInstrumentation(MAX_QUERY_DEPTH);
	}

	@Bean
	Instrumentation queryComplexityInstrumentation() {
		return new MaxQueryComplexityInstrumentation(MAX_QUERY_COMPLEXITY);
	}
}