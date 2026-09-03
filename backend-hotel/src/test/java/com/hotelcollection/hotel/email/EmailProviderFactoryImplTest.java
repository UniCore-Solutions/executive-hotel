package com.hotelcollection.hotel.email;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;

/**
 * Mandatory provider-switching coverage (§32): the factory resolves purely
 * from {@code app.email.provider} against whatever {@link EmailProvider}
 * beans exist — no Spring context needed, since
 * {@link EmailProviderFactoryImpl} takes its collaborators as plain
 * constructor arguments. Proves the architecture is decoupled: swapping
 * {@code simulated} for {@code smtp} changes nothing except which
 * already-registered adapter gets selected.
 */
class EmailProviderFactoryImplTest {

	private final EmailProvider simulated = new StubProvider(EmailProvider.ProviderType.SIMULATED);
	private final EmailProvider smtp = new StubProvider(EmailProvider.ProviderType.SMTP);

	@Test
	void resolvesTheConfiguredProvider() {
		EmailProviderFactory factory = new EmailProviderFactoryImpl(List.of(simulated, smtp), "simulated");
		assertThat(factory.resolve()).isSameAs(simulated);
	}

	@Test
	void switchingConfigurationSwitchesTheResolvedProviderWithNoOtherChange() {
		EmailProviderFactory before = new EmailProviderFactoryImpl(List.of(simulated, smtp), "simulated");
		EmailProviderFactory after = new EmailProviderFactoryImpl(List.of(simulated, smtp), "smtp");

		assertThat(before.resolve().type()).isEqualTo(EmailProvider.ProviderType.SIMULATED);
		assertThat(after.resolve().type()).isEqualTo(EmailProvider.ProviderType.SMTP);
	}

	@Test
	void configurationIsCaseInsensitive() {
		EmailProviderFactory factory = new EmailProviderFactoryImpl(List.of(smtp), "SMTP");
		assertThat(factory.resolve()).isSameAs(smtp);
	}

	@Test
	void failsFastWhenNoProviderMatchesTheConfiguredType() {
		assertThatThrownBy(() -> new EmailProviderFactoryImpl(List.of(simulated), "smtp"))
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("SMTP");
	}

	@Test
	void failsFastOnAnUnknownProviderName() {
		assertThatThrownBy(() -> new EmailProviderFactoryImpl(List.of(simulated), "sendgrid"))
				.isInstanceOf(IllegalStateException.class);
	}

	private record StubProvider(EmailProvider.ProviderType type) implements EmailProvider {
		@Override
		public SendResult send(EmailMessage message) {
			return new SendResult(true, "STUB-REF", null);
		}
	}
}
