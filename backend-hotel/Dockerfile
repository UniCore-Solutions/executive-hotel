# syntax=docker/dockerfile:1
# Hotel-platform backend — Spring Boot 4.1 / Java 21 / Maven
#
# Stages:
#   build       — compiles the boot jar (Maven deps cached via BuildKit cache mount)
#   development — full toolchain for `./mvnw spring-boot:run` with bind-mounted sources
#   runtime     — minimal JRE image, non-root, curl for container health checks

FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml mvnw ./
COPY .mvn ./.mvn
RUN chmod +x mvnw
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -q dependency:go-offline || true
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -q package -DskipTests \
    && mv target/hotel-platform-*.jar /workspace/app.jar


FROM maven:3.9-eclipse-temurin-21 AS development
WORKDIR /workspace
ENV SPRING_OUTPUT_ANSI_ENABLED=ALWAYS
COPY pom.xml mvnw ./
COPY .mvn ./.mvn
RUN chmod +x mvnw
RUN --mount=type=cache,target=/root/.m2 ./mvnw -B -q dependency:go-offline || true
EXPOSE 8080 5005
CMD ["./mvnw", "spring-boot:run"]


FROM eclipse-temurin:21-jre-jammy AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*
RUN groupadd -r -g 1001 spring && useradd -r -u 1001 -g spring -m spring
WORKDIR /app
COPY --from=build /workspace/app.jar app.jar
RUN mkdir -p /app/media && chown -R spring:spring /app
USER spring
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
