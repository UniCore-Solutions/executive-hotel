package com.hotelcollection.hotel.architecture;

import com.tngtech.archunit.core.domain.JavaClass;
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