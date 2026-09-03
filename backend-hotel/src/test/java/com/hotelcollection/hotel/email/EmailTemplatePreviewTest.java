package com.hotelcollection.hotel.email;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.thymeleaf.context.Context;
import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.templatemode.TemplateMode;
import org.thymeleaf.templateresolver.ClassLoaderTemplateResolver;

import com.hotelcollection.hotel.dto.email.BookingConfirmationEmailData;
import com.hotelcollection.hotel.dto.email.CancellationEmailData;
import com.hotelcollection.hotel.dto.email.EmailTheme;
import com.hotelcollection.hotel.dto.email.InvoiceEmailData;
import com.hotelcollection.hotel.dto.email.OtpEmailData;
import com.hotelcollection.hotel.dto.email.PaymentFailedEmailData;
import com.hotelcollection.hotel.dto.email.RefundEmailData;
import com.hotelcollection.hotel.dto.email.WelcomeEmailData;

/**
 * Renders every {@code templates/email/*.html} template with realistic and
 * edge-case data, without sending anything — the practical "preview
 * mechanism" for developing/reviewing the email design (§20). Not a
 * production endpoint: this is a plain JUnit test, run locally, that writes
 * the rendered HTML to {@code target/email-previews/} for a developer (or a
 * browser) to open directly. Real Thymeleaf, real templates and fragments —
 * only the Spring context is skipped, the same posture
 * {@code DocumentGenerationServiceImplTest} already takes for the invoice
 * PDF pipeline.
 *
 * <p>Also asserts basic rendering correctness: every template must resolve
 * cleanly (no leftover {@code ${...}} expressions, a sign of a typo or a
 * missing variable), must contain its key content, and — the escaping proof
 * — a guest-supplied name containing HTML must appear neutralized, never as
 * live markup.
 */
class EmailTemplatePreviewTest {

	private static SpringTemplateEngine templateEngine;
	private static final Path OUTPUT_DIR = Path.of("target", "email-previews");

	@BeforeAll
	static void setUpEngine() throws IOException {
		templateEngine = new SpringTemplateEngine();
		ClassLoaderTemplateResolver resolver = new ClassLoaderTemplateResolver();
		// Mirrors Spring Boot's default spring.thymeleaf.prefix.
		resolver.setPrefix("templates/");
		resolver.setTemplateMode(TemplateMode.XML);
		resolver.setSuffix(".html");
		templateEngine.setTemplateResolver(resolver);
		Files.createDirectories(OUTPUT_DIR);
	}

	// ---------------------------------------------------------------- themes

	private EmailTheme fullTheme() {
		return EmailTheme.forHotel("Executive Hotel", "https://images.unsplash.com/photo-logo.png",
				"Avenida da Liberdade 12, Lisbon", "+351 21 000 0000", "reservations@executivehotel.example",
				"http://localhost:3000");
	}

	/** No logo, no address/phone/email — proves the header/footer degrade
	 * gracefully instead of rendering broken placeholders. */
	private EmailTheme minimalTheme() {
		return EmailTheme.forHotel("The Grand Royal Executive Palace Hotel & Spa Resort International",
				null, null, null, null, "http://localhost:3000");
	}

	// ---------------------------------------------------------------- tests

	@Test
	void welcomeRendersWithFullDataAndEscapesGuestInput() {
		EmailTheme theme = fullTheme();
		WelcomeEmailData data = new WelcomeEmailData("<script>alert(1)</script>", "http://localhost:3000/account");

		String html = render("email/welcome", theme, data);

		assertClean(html);
		assertThat(html).contains("Welcome").contains(theme.hotelName());
		assertThat(html).doesNotContain("<script>alert(1)</script>");
		assertThat(html).contains("&lt;script&gt;");
		write("welcome-full.html", html);
	}

	@Test
	void welcomeRendersWithMinimalThemeNoLogoNoContact() {
		String html = render("email/welcome", minimalTheme(),
				new WelcomeEmailData("Maria-Concepción", "http://localhost:3000/account"));
		assertClean(html);
		write("welcome-minimal-theme.html", html);
	}

	@Test
	void otpRendersProminently() {
		String html = render("email/otp", fullTheme(), new OtpEmailData("Jean", "482913", "10 minutes"));
		assertClean(html);
		assertThat(html).contains("482913").contains("10 minutes");
		write("otp.html", html);
	}

	@Test
	void otpRendersWithoutFirstName() {
		String html = render("email/otp", fullTheme(), new OtpEmailData(null, "013579", "5 minutes"));
		assertClean(html);
		write("otp-no-name.html", html);
	}

	@Test
	void bookingConfirmationRendersFullDataPaidWithArrivalSlot() {
		BookingConfirmationEmailData data = new BookingConfirmationEmailData(
				"Amine", "RC-7F3KQ2", "Deluxe Sea View, Family Suite", "15 Sep 2026", "18 Sep 2026",
				"3 nights", "2 Adults, 1 Child", "15:00–18:00", "MAD 12,450", "Paid", true,
				"http://localhost:3000/reservation?ref=RC-7F3KQ2&email=guest%40example.com");
		String html = render("email/booking-confirmation", fullTheme(), data);
		assertClean(html);
		assertThat(html).contains("RC-7F3KQ2").contains("Deluxe Sea View, Family Suite")
				.contains("15:00–18:00").contains("MAD 12,450");
		write("booking-confirmation-full.html", html);
	}

	@Test
	void bookingConfirmationRendersPendingPaymentNoArrivalSlot() {
		BookingConfirmationEmailData data = new BookingConfirmationEmailData(
				"Yuki", "RC-Q1W2E3", "Garden Twin", "1 Jan 2027", "2 Jan 2027",
				"1 night", "1 Adult", null, "USD 210", "Payment pending", false,
				"http://localhost:3000/reservation?ref=RC-Q1W2E3&email=yuki%40example.com");
		String html = render("email/booking-confirmation", fullTheme(), data);
		assertClean(html);
		assertThat(html).contains("Payment pending");
		write("booking-confirmation-pending.html", html);
	}

	@Test
	void invoiceRendersWithAttachmentNotice() {
		InvoiceEmailData data = new InvoiceEmailData("Fatima", "RC-9Z8Y7X", "INV-RC-9Z8Y7X", "3 Sep 2026",
				"EUR 890", "Paid", true);
		String html = render("email/invoice", fullTheme(), data);
		assertClean(html);
		assertThat(html).contains("INV-RC-9Z8Y7X").contains("attached to this email");
		write("invoice-full.html", html);
	}

	@Test
	void cancellationRendersWithPenaltyAndRefund() {
		CancellationEmailData data = new CancellationEmailData("Omar", "RC-CANC01", "20 Oct 2026", "22 Oct 2026",
				"MAD 500", true, "MAD 3,660", true, true);
		String html = render("email/booking-cancellation", fullTheme(), data);
		assertClean(html);
		assertThat(html).contains("MAD 500").contains("MAD 3,660");
		write("cancellation-with-refund.html", html);
	}

	@Test
	void cancellationRendersNonRefundableNoPenaltyNoRefund() {
		CancellationEmailData data = new CancellationEmailData("Omar", "RC-CANC02", "1 Nov 2026", "3 Nov 2026",
				"MAD 0", false, "MAD 0", false, false);
		String html = render("email/booking-cancellation", fullTheme(), data);
		assertClean(html);
		assertThat(html).contains("non-refundable");
		write("cancellation-non-refundable.html", html);
	}

	@Test
	void cancellationRendersNeverChargedNothingToRefund() {
		CancellationEmailData data = new CancellationEmailData("Omar", "RC-CANC03", "5 Dec 2026", "6 Dec 2026",
				"MAD 0", false, "MAD 0", false, true);
		String html = render("email/booking-cancellation", fullTheme(), data);
		assertClean(html);
		assertThat(html).contains("nothing to refund");
		write("cancellation-nothing-to-refund.html", html);
	}

	@Test
	void refundRendersWithCreditNoteAttached() {
		RefundEmailData data = new RefundEmailData("Nadia", "RC-REF001", "MAD 2,240", "3 Sep 2026", true);
		String html = render("email/refund", fullTheme(), data);
		assertClean(html);
		assertThat(html).contains("MAD 2,240").contains("credit note");
		write("refund-with-credit-note.html", html);
	}

	@Test
	void refundRendersWithoutCreditNote() {
		RefundEmailData data = new RefundEmailData("Nadia", "RC-REF002", "USD 75", "3 Sep 2026", false);
		String html = render("email/refund", fullTheme(), data);
		assertClean(html);
		assertThat(html).doesNotContain("credit note");
		write("refund-without-credit-note.html", html);
	}

	@Test
	void paymentFailedRendersWithHoldExpiry() {
		PaymentFailedEmailData data = new PaymentFailedEmailData("Karim", "RC-PAYFAIL",
				"MAD 4,860.18", "http://localhost:3000/booking/retry?ref=RC-PAYFAIL&email=karim%40example.com",
				"3 Sep 2026, 15:45");
		String html = render("email/payment-failed", fullTheme(), data);
		assertClean(html);
		assertThat(html).contains("3 Sep 2026, 15:45").contains("Try another card");
		write("payment-failed-with-hold.html", html);
	}

	@Test
	void paymentFailedRendersWithoutHoldExpiry() {
		PaymentFailedEmailData data = new PaymentFailedEmailData("Karim", "RC-PAYFAIL2",
				"EUR 300", "http://localhost:3000/booking/retry?ref=RC-PAYFAIL2", null);
		String html = render("email/payment-failed", minimalTheme(), data);
		assertClean(html);
		write("payment-failed-no-hold-minimal-theme.html", html);
	}

	// ---------------------------------------------------------------- helpers

	private String render(String template, EmailTheme theme, Object data) {
		Context ctx = new Context();
		ctx.setVariable("theme", theme);
		ctx.setVariable("data", data);
		return templateEngine.process(template, ctx);
	}

	/** A leftover unresolved {@code ${...}} in the output is always a bug —
	 * a missing variable or a typo Thymeleaf silently failed to bind. */
	private void assertClean(String html) {
		assertThat(html).doesNotContain("${").doesNotContain("Exception");
	}

	private void write(String filename, String html) {
		try {
			Files.writeString(OUTPUT_DIR.resolve(filename), html, StandardCharsets.UTF_8);
		} catch (IOException ex) {
			throw new UncheckedIOException(ex);
		}
	}
}
