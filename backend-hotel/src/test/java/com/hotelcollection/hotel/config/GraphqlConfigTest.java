package com.hotelcollection.hotel.config;
import com.hotelcollection.hotel.config.GraphqlConfig;

import static org.assertj.core.api.Assertions.assertThat;


import org.junit.jupiter.api.Test;

import graphql.GraphQL;
import graphql.Scalars;
import graphql.execution.instrumentation.Instrumentation;
import graphql.schema.GraphQLFieldDefinition;
import graphql.schema.GraphQLObjectType;
import graphql.schema.GraphQLSchema;
import graphql.schema.GraphQLTypeReference;

/**
 * The configured depth instrumentation actually rejects queries deeper than
 * {@link GraphqlConfig#MAX_QUERY_DEPTH} (cyclic types in a throwaway schema
 * make any depth reachable) and lets shallow queries through.
 */
class GraphqlConfigTest {

	@Test
	void queriesDeeperThanFifteenLevelsAreRejected() {
		GraphQLObjectType typeA = GraphQLObjectType.newObject().name("A")
				.field(GraphQLFieldDefinition.newFieldDefinition().name("a")
						.type(GraphQLTypeReference.typeRef("B")))
				.build();
		GraphQLObjectType typeB = GraphQLObjectType.newObject().name("B")
				.field(GraphQLFieldDefinition.newFieldDefinition().name("b")
						.type(GraphQLTypeReference.typeRef("C")))
				.field(GraphQLFieldDefinition.newFieldDefinition().name("id")
						.type(Scalars.GraphQLString))
				.build();
		GraphQLObjectType typeC = GraphQLObjectType.newObject().name("C")
				.field(GraphQLFieldDefinition.newFieldDefinition().name("c")
						.type(GraphQLTypeReference.typeRef("A")))
				.field(GraphQLFieldDefinition.newFieldDefinition().name("id")
						.type(Scalars.GraphQLString))
				.build();
		GraphQLSchema schema = GraphQLSchema.newSchema().query(typeA)
				.additionalType(typeB).additionalType(typeC).build();
		GraphQL graphql = GraphQL.newGraphQL(schema)
				.instrumentation(
						(Instrumentation) new graphql.analysis.MaxQueryDepthInstrumentation(
								GraphqlConfig.MAX_QUERY_DEPTH))
				.build();

		String deep = "query { "
				+ "a { b { c { ".repeat(6) + "a { b { id } } "
				+ "} } }".repeat(6) + "}";
		var deepResult = graphql.execute(deep);
		assertThat(deepResult.getErrors()).isNotEmpty();
		assertThat(deepResult.getErrors().get(0).getMessage()).containsIgnoringCase("depth");

		String shallow = "query { " + "a { b { c { ".repeat(2) + "a { b { id } } "
				+ "} } }".repeat(2) + "}";
		assertThat(graphql.execute(shallow).getErrors()).isEmpty();
	}
}