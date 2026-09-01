package com.hotelcollection.hotel.architecture;

import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaMethod;
import com.tngtech.archunit.core.domain.JavaMethodCall;
import com.tngtech.archunit.core.domain.JavaModifier;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchCondition;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.lang.ConditionEvents;
import com.tngtech.archunit.lang.SimpleConditionEvent;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;

@AnalyzeClasses(packages = "com.hotelcollection.hotel",
		importOptions = ImportOption.DoNotIncludeTests.class)
public class ModuleArchitectureTest {

	/**
	 * Layered architecture (ADR-009): controllers → services → repositories,
	 * with entities/dto shared as the API contract. Cross-module access goes
	 * through the service interfaces in {@code service/} — never through
	 * implementations or persistence.
	 */

	@ArchTest
	static final ArchRule NO_LEGACY_HEXAGONAL_PACKAGES = noClasses()
			.should().resideInAPackage("..api..")
			.orShould().resideInAPackage("..application..")
			.orShould().resideInAPackage("..domain..")
			.orShould().resideInAPackage("..adapter..")
			.because("the hexagonal module layout (api/application/domain/adapter) was replaced by a layered layout");

	@ArchTest
	static final ArchRule IMPLEMENTATIONS_ARE_ONLY_ACCESSED_FROM_SERVICES = noClasses()
			.that().resideOutsideOfPackage("com.hotelcollection.hotel.service.impl..")
			.should().accessClassesThat().resideInAPackage("com.hotelcollection.hotel.service.impl..")
			.because("controllers and other modules depend on the service interfaces, never on implementations");

	@ArchTest
	static final ArchRule REPOSITORIES_ARE_ONLY_ACCESSED_FROM_SERVICES = noClasses()
			.that().resideOutsideOfPackages("com.hotelcollection.hotel.service..",
					"com.hotelcollection.hotel.repository..")
			.should().accessClassesThat().resideInAPackage("com.hotelcollection.hotel.repository..")
			.because("persistence access belongs to the service layer only");

	@ArchTest
	static final ArchRule CONTROLLERS_DELEGATE_TO_SERVICES = noClasses()
			.that().resideInAPackage("com.hotelcollection.hotel.controller..")
			.should().accessClassesThat().resideInAPackage("com.hotelcollection.hotel.repository..")
			.orShould().accessClassesThat().resideInAPackage("com.hotelcollection.hotel.service.impl..")
			.because("controllers are thin: they delegate to service interfaces");

	@ArchTest
	static final ArchRule SERVICES_ARE_NOT_GOD_CLASSES = classes()
			.that().resideInAPackage("com.hotelcollection.hotel.service.impl..")
			.should(haveAtMostConstructorDependencies(11))
			.because("services above 11 collaborators should be split");

	/**
	 * API rule: GraphQL = READ, REST = WRITE/ACTION. No GraphQL mutation
	 * handlers may exist anywhere in main source — every state change goes
	 * through the REST controllers (/api/v1/**).
	 */
	@ArchTest
	static final ArchRule NO_GRAPHQL_MUTATIONS = noClasses()
			.that().resideOutsideOfPackages("com.hotelcollection.hotel.test",
					"com.hotelcollection.hotel.integration")
			.should().dependOnClassesThat()
			.haveSimpleName("MutationMapping")
			.because("writes are REST (/api/v1/**); the GraphQL schema has no Mutation root");

	/**
	 * Authorization is structural, not conventional.
	 *
	 * <p>{@code /graphql} is {@code permitAll} at the filter chain (ADR-007) and
	 * the admin resolvers carry no declarative guard — every back-office read is
	 * authorized inside the service it delegates to. That works only for as long
	 * as every contributor remembers to do it, and forgetting is silent: the
	 * resolver simply returns another hotel's data to an anonymous caller.
	 *
	 * <p>This rule removes the need to remember. Each {@code @QueryMapping} on
	 * {@code AdminGraphQLController} is followed into its service interface, on
	 * to the implementation, and through that implementation's own private
	 * helpers, looking for a {@link com.hotelcollection.hotel.security.CurrentUserAccessor}
	 * call. No guard anywhere on that path fails the build.
	 */
	@ArchTest
	static final ArchRule ADMIN_GRAPHQL_READS_ARE_AUTHORIZED = classes()
			.that().haveSimpleName("AdminGraphQLController")
			.should(delegateOnlyToAuthorizedServiceMethods())
			.because("/graphql is permitAll — an admin resolver whose service does not "
					+ "call CurrentUserAccessor exposes back-office data anonymously");

	private static final String CURRENT_USER_ACCESSOR =
			"com.hotelcollection.hotel.security.CurrentUserAccessor";

	private static ArchCondition<JavaClass> delegateOnlyToAuthorizedServiceMethods() {
		return new ArchCondition<>("delegate only to service methods that enforce authorization") {
			@Override
			public void check(JavaClass controller, ConditionEvents events) {
				for (JavaMethod resolver : controller.getMethods()) {
					boolean isResolver = resolver.getAnnotations().stream()
							.anyMatch(a -> a.getRawType().getSimpleName().equals("QueryMapping"));
					if (!isResolver) {
						continue;
					}
					Set<JavaMethod> targets = serviceImplementationsCalledBy(resolver);
					if (targets.isEmpty()) {
						// A resolver that calls no service at all cannot be checked
						// here; flag it rather than silently passing.
						events.add(SimpleConditionEvent.violated(controller, String.format(
								"%s.%s() delegates to no service method, so its authorization "
										+ "cannot be verified", controller.getSimpleName(),
								resolver.getName())));
						continue;
					}
					for (JavaMethod target : targets) {
						if (!reachesAuthorizationGuard(target, new HashSet<>(), 0)) {
							events.add(SimpleConditionEvent.violated(controller, String.format(
									"%s.%s() delegates to %s.%s(), which never calls "
											+ "CurrentUserAccessor — /graphql is permitAll, so this "
											+ "resolver is reachable anonymously",
									controller.getSimpleName(), resolver.getName(),
									target.getOwner().getSimpleName(), target.getName())));
						}
					}
				}
			}
		};
	}

	/** Service-interface methods called by a resolver, resolved to their implementations. */
	private static Set<JavaMethod> serviceImplementationsCalledBy(JavaMethod resolver) {
		Set<JavaMethod> impls = new HashSet<>();
		for (JavaMethodCall call : resolver.getMethodCallsFromSelf()) {
			call.getTarget().resolveMember().ifPresent(called -> {
				JavaClass owner = called.getOwner();
				if (!owner.getPackageName().startsWith("com.hotelcollection.hotel.service")) {
					return;
				}
				if (!owner.isInterface()) {
					impls.add(called);
					return;
				}
				for (JavaClass subclass : owner.getAllSubclasses()) {
					subclass.tryGetMethod(called.getName(),
							called.getRawParameterTypes().stream()
									.map(JavaClass::getName).toArray(String[]::new))
							.ifPresent(impls::add);
				}
			});
		}
		return impls;
	}

	/**
	 * True when {@code method} calls CurrentUserAccessor, or reaches it through
	 * a helper on the same class (e.g. a private {@code requireStaffAccess}).
	 */
	private static boolean reachesAuthorizationGuard(JavaMethod method, Set<String> seen, int depth) {
		if (depth > 4 || !seen.add(method.getFullName())) {
			return false;
		}
		for (JavaMethodCall call : method.getMethodCallsFromSelf()) {
			if (call.getTargetOwner().getName().equals(CURRENT_USER_ACCESSOR)) {
				return true;
			}
			// Follow calls within the same class (private helpers) and to other
			// services the implementation composes (a facade may delegate the
			// check to the service it wraps).
			boolean worthFollowing = call.getTargetOwner().equals(method.getOwner())
					|| call.getTargetOwner().getPackageName()
							.startsWith("com.hotelcollection.hotel.service");
			if (!worthFollowing) {
				continue;
			}
			Optional<JavaMethod> next = call.getTarget().resolveMember();
			if (next.isPresent() && reachesAuthorizationGuard(next.get(), seen, depth + 1)) {
				return true;
			}
		}
		return false;
	}

	private static ArchCondition<JavaClass> haveAtMostConstructorDependencies(int max) {
		return new ArchCondition<>("have at most " + max + " constructor dependencies") {
			@Override
			public void check(JavaClass item, ConditionEvents events) {
				int deps = item.getConstructors().stream()
						.filter(c -> c.getModifiers().contains(JavaModifier.PUBLIC))
						.mapToInt(c -> c.getParameters().size())
						.max().orElse(0);
				if (deps > max) {
					String message = String.format("%s has %d constructor dependencies (max %d)",
							item.getName(), deps, max);
					events.add(SimpleConditionEvent.violated(item, message));
				}
			}
		};
	}
}