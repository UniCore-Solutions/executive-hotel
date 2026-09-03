package com.hotelcollection.hotel.security;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ContentSecurityPolicyHeaderWriter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.security.web.header.writers.XContentTypeOptionsHeaderWriter;
import org.springframework.security.web.header.writers.frameoptions.XFrameOptionsHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.hotelcollection.hotel.exception.ErrorCode;
import com.hotelcollection.hotel.exception.ErrorResponseWriter;

/**
 * Stateless security (ADR-007). The /graphql endpoint is reachable without
 * credentials; authorization is enforced per resolver via hotel-scope checks
 * in application services (IDOR -> 403, not 200). All filter-level responses
 * (401/403/429) use the standard {@link com.hotelcollection.hotel.exception.ApiError}
 * envelope via {@link ErrorResponseWriter}.
 */
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

	private static final org.slf4j.Logger log =
			org.slf4j.LoggerFactory.getLogger(SecurityConfig.class);

	private final JwtAuthFilter jwtAuthFilter;
	private final RateLimitFilter rateLimitFilter;
	private final TraceIdFilter traceIdFilter;
	private final ErrorResponseWriter errorWriter;

	public SecurityConfig(JwtAuthFilter jwtAuthFilter, RateLimitFilter rateLimitFilter,
			TraceIdFilter traceIdFilter, ErrorResponseWriter errorWriter) {
		this.jwtAuthFilter = jwtAuthFilter;
		this.rateLimitFilter = rateLimitFilter;
		this.traceIdFilter = traceIdFilter;
		this.errorWriter = errorWriter;
	}

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http,
			CorsConfigurationSource corsConfigurationSource,
			@Value("${app.security.headers.content-security-policy:}") String contentSecurityPolicy)
			throws Exception {
		http
				.csrf(csrf -> csrf.disable())
				.cors(cors -> cors.configurationSource(corsConfigurationSource))
				.sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.exceptionHandling(ex -> ex
						.authenticationEntryPoint((request, response, authException) -> {
							// Security-relevant and previously unlogged: without this
							// a credential-stuffing run leaves no trace at all. Never
							// log credentials — method and path only (trace id comes
							// from the MDC via TraceIdFilter).
							log.warn("unauthenticated request rejected: method={} path={}",
									request.getMethod(), request.getRequestURI());
							errorWriter.write(request, response, ErrorCode.UNAUTHORIZED,
									"authentication required");
						})
						.accessDeniedHandler((request, response, accessDeniedException) -> {
							log.warn("access denied: method={} path={}",
									request.getMethod(), request.getRequestURI());
							errorWriter.write(request, response, ErrorCode.FORBIDDEN,
									"access denied");
						}))
				.headers(headers -> {
					headers.addHeaderWriter(new XFrameOptionsHeaderWriter(
									XFrameOptionsHeaderWriter.XFrameOptionsMode.DENY))
							.addHeaderWriter(new XContentTypeOptionsHeaderWriter())
							.addHeaderWriter(new ReferrerPolicyHeaderWriter(
									ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN));
					// Content-Security-Policy only when configured (prod sets it;
					// dev leaves it off so GraphiQL's inline assets keep working).
					if (contentSecurityPolicy != null && !contentSecurityPolicy.isBlank()) {
						headers.addHeaderWriter(
								new ContentSecurityPolicyHeaderWriter(contentSecurityPolicy));
					}
				})
				.authorizeHttpRequests(auth -> auth
						.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
						.requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
						.requestMatchers("/actuator/prometheus").permitAll()
						.requestMatchers("/graphql", "/graphiql", "/graphiql/**").permitAll()
						.requestMatchers("/media/**").permitAll()
						.requestMatchers("/api/v1/auth/login", "/api/v1/auth/register").permitAll()
						.requestMatchers("/api/v1/reservations",
								"/api/v1/reservations/*/cancel",
								"/api/v1/reservations/*/invoice",
								"/api/v1/reservations/*/invoice/pdf",
								"/api/v1/reservations/*/credit-note",
								"/api/v1/reservations/*/credit-note/pdf").permitAll()
						// Accountless booking: payments are created/captured with
						// the guest email as proof of possession. The filter chain
						// stays open like the reservation endpoints; PaymentService
						// enforces owner-or-staff-or-guest-email authorization
						// itself (see PaymentServiceImpl.ensurePaymentAccess).
						.requestMatchers("/api/v1/payments",
								"/api/v1/payments/*",
								"/api/v1/payments/*/capture").permitAll()
						// Simulated-provider webhook: no user session at all (a real
						// PSP callback wouldn't have one either) — authenticated
						// instead by a shared secret checked inside the controller.
						// Never called by the guest-facing frontend.
						.requestMatchers("/api/v1/payments/*/webhook",
								"/api/v1/payments/by-reservation/*/webhook").permitAll()
						.requestMatchers("/api/v1/**").authenticated()
						.anyRequest().denyAll())
				.addFilterBefore(traceIdFilter, UsernamePasswordAuthenticationFilter.class)
				.addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class)
				.addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
		return http.build();
	}

	@Bean
	PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder(12);
	}

	@Bean
	CorsConfigurationSource corsConfigurationSource(
			@Value("${app.cors.allowed-origins:*}") String allowedOrigins) {
		// Header-based bearer auth with no credentials, so a permissive origin
		// list does not grant cookies/credentials. Restrict via CORS_ALLOWED_ORIGINS
		// in deployment.
		CorsConfiguration cfg = new CorsConfiguration();
		cfg.setAllowedOrigins(java.util.Arrays.stream(allowedOrigins.split(","))
				.map(String::trim)
				.filter(s -> !s.isBlank())
				.toList());
		cfg.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
		// Idempotency-Key is required by POST /api/v1/reservations. Today the
		// guest site reaches the backend through its own server-side BFF proxy
		// (no CORS involved), but omitting it here silently breaks any direct
		// browser->backend call.
		cfg.setAllowedHeaders(List.of("Authorization", "Content-Type", "Idempotency-Key"));
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", cfg);
		return source;
	}
}