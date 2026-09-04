package com.hotelcollection.hotel.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.exception.ErrorCode;

class IdentityProviderRegistryImplTest {

	@Test
	void resolvesARegisteredProviderCaseInsensitively() {
		ExternalIdentityProvider google = new StubProvider(IdentityProviderType.GOOGLE);
		IdentityProviderRegistry registry = new IdentityProviderRegistryImpl(List.of(google));

		assertThat(registry.resolve("google")).isSameAs(google);
		assertThat(registry.resolve("GOOGLE")).isSameAs(google);
	}

	@Test
	void unknownProviderNameIsNotFound() {
		IdentityProviderRegistry registry = new IdentityProviderRegistryImpl(List.of());

		assertThatThrownBy(() -> registry.resolve("bogus"))
				.isInstanceOf(DomainException.class)
				.satisfies(ex -> assertThat(((DomainException) ex).getCode()).isEqualTo(ErrorCode.NOT_FOUND));
	}

	@Test
	void aKnownButUnconfiguredProviderIsIndistinguishableFromUnknown() {
		// No GOOGLE bean registered at all — mirrors a blank GOOGLE_CLIENT_ID,
		// where GoogleIdentityProvider's @ConditionalOnProperty bean never exists.
		IdentityProviderRegistry registry = new IdentityProviderRegistryImpl(List.of());

		assertThatThrownBy(() -> registry.resolve("google"))
				.isInstanceOf(DomainException.class)
				.satisfies(ex -> assertThat(((DomainException) ex).getCode()).isEqualTo(ErrorCode.NOT_FOUND));
	}

	private record StubProvider(IdentityProviderType type) implements ExternalIdentityProvider {
		@Override
		public String buildAuthorizationUrl(String state, String nonce) {
			return "https://example.test/authorize";
		}

		@Override
		public ExternalUserInfo exchangeCode(String code, String expectedNonce) {
			throw new UnsupportedOperationException();
		}
	}
}
