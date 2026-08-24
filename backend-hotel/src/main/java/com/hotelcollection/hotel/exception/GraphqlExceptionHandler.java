package com.hotelcollection.hotel.exception;

import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.convert.ConversionFailedException;
import org.springframework.graphql.execution.DataFetcherExceptionResolver;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Component;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import graphql.GraphQLError;
import graphql.GraphqlErrorBuilder;
import graphql.schema.DataFetchingEnvironment;
import reactor.core.publisher.Mono;

/**
 * Maps application exceptions to GraphQL errors. {@link ErrorCode} is surfaced
 * in the error's {@code code} extension so clients can branch without parsing
 * messages. Business and validation messages reach the client; technical
 * failures return a safe generic message and are logged with the cause.
 */
@Component
public class GraphqlExceptionHandler implements DataFetcherExceptionResolver {

	private static final Logger log = LoggerFactory.getLogger(GraphqlExceptionHandler.class);

	@Override
	public Mono<List<GraphQLError>> resolveException(Throwable ex, DataFetchingEnvironment env) {
		if (ex instanceof DomainException domain) {
			ErrorCode code = domain.getCode();
			ErrorType type = switch (code) {
				case NOT_FOUND -> ErrorType.NOT_FOUND;
				case FORBIDDEN -> ErrorType.FORBIDDEN;
				case CONFLICT, VALIDATION -> ErrorType.BAD_REQUEST;
				case UNAUTHORIZED -> ErrorType.UNAUTHORIZED;
				default -> ErrorType.INTERNAL_ERROR;
			};
			String message = domain instanceof TechnicalException
					? "internal error"
					: domain.getMessage();
			if (domain instanceof TechnicalException) {
				log.error("technical failure", domain);
			}
			return Mono.just(List.of(GraphqlErrorBuilder.newError(env)
					.message(message)
					.errorType(type)
					.extensions(Map.of("code", code.name()))
					.build()));
		}
		if (ex instanceof AuthenticationException) {
			return Mono.just(List.of(GraphqlErrorBuilder.newError(env)
					.message("authentication required")
					.errorType(ErrorType.UNAUTHORIZED)
					.extensions(Map.of("code", ErrorCode.UNAUTHORIZED.name()))
					.build()));
		}
		// Malformed scalar/argument input (e.g. a non-UUID passed to a UUID
		// argument) is a client error, not an internal failure. Spring GraphQL
		// surfaces argument conversion failures as a BindException wrapping an
		// ArgumentsBindingResult; framework conversion failures surface as
		// ConversionFailedException / MethodArgumentTypeMismatchException.
		if (ex instanceof ConversionFailedException || ex instanceof MethodArgumentTypeMismatchException
				|| ex instanceof org.springframework.validation.BindException) {
			return Mono.just(List.of(GraphqlErrorBuilder.newError(env)
					.message("invalid argument value")
					.errorType(ErrorType.BAD_REQUEST)
					.extensions(Map.of("code", ErrorCode.VALIDATION.name()))
					.build()));
		}
		log.error("unhandled GraphQL data-fetching failure at {}", env.getExecutionStepInfo().getPath(), ex);
		return Mono.just(List.of(GraphqlErrorBuilder.newError(env)
				.message("internal error")
				.errorType(ErrorType.INTERNAL_ERROR)
				.extensions(Map.of("code", ErrorCode.INTERNAL_ERROR.name()))
				.build()));
	}
}