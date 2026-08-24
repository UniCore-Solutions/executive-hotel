package com.hotelcollection.hotel.config;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.graphql.execution.RuntimeWiringConfigurer;

import graphql.GraphQLException;
import graphql.language.StringValue;
import graphql.schema.Coercing;
import graphql.schema.CoercingParseLiteralException;
import graphql.schema.CoercingParseValueException;
import graphql.schema.CoercingSerializeException;
import graphql.schema.GraphQLScalarType;

/**
 * Custom scalars declared in schema.graphqls: LocalDate (ISO-8601 date) and
 * DateTime (ISO-8601 instant). The DateTime coercing accepts both
 * {@link OffsetDateTime} and {@link Instant} values from data fetchers, since
 * JPA entities persist timestamps as {@code Instant} while some DTOs carry
 * {@code OffsetDateTime}.
 */
@Configuration
public class GraphqlScalarConfiguration {

	@Bean
	public RuntimeWiringConfigurer scalarWiring() {
		return builder -> builder
				.scalar(GraphQLScalarType.newScalar()
						.name("LocalDate")
						.coercing(graphql.scalars.ExtendedScalars.Date.getCoercing())
						.build())
				.scalar(GraphQLScalarType.newScalar()
						.name("DateTime")
						.coercing(new DateTimeCoercing())
						.build());
	}

	private static final class DateTimeCoercing implements Coercing<Object, String> {

		@Override
		public String serialize(Object dataFetcherResult) throws CoercingSerializeException {
			if (dataFetcherResult instanceof Instant instant) {
				return DateTimeFormatter.ISO_INSTANT.format(instant);
			}
			if (dataFetcherResult instanceof OffsetDateTime odt) {
				return odt.format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
			}
			if (dataFetcherResult instanceof String value) {
				return value;
			}
			throw new CoercingSerializeException(
					"Expected an Instant or OffsetDateTime but was " + typeOf(dataFetcherResult));
		}

		@Override
		public Object parseValue(Object input) throws CoercingParseValueException {
			if (input instanceof String value) {
				return parse(value);
			}
			throw new CoercingParseValueException("Expected a String value");
		}

		@Override
		public Object parseLiteral(Object input) throws CoercingParseLiteralException {
			if (input instanceof StringValue value) {
				return parse(value.getValue());
			}
			throw new CoercingParseLiteralException("Expected a String literal");
		}

		private static Object parse(String value) {
			try {
				return OffsetDateTime.parse(value);
			} catch (RuntimeException first) {
				try {
					return Instant.parse(value);
				} catch (RuntimeException second) {
					throw new GraphQLException(
							"Invalid DateTime value '" + value + "': expected ISO-8601");
				}
			}
		}

		private static String typeOf(Object value) {
			return value == null ? "null" : value.getClass().getSimpleName();
		}
	}
}