package com.hotelcollection.hotel.dto.email;

/**
 * Presentation-only branding for an email — the single place the visual
 * language (colors, fonts) is defined, so no template hard-codes a hex
 * value. The palette mirrors {@code frontend-hotel}'s actual design tokens
 * (@theme block in {@code src/app/globals.css} — navy/gold/paper/ink) so the
 * emails read as the same product as the guest site, not a bolted-on
 * "system email" look.
 *
 * <p>Colors are fixed constants, not read from the database — neither
 * {@code Hotel} nor {@code Platform} has theme columns today. {@code
 * hotelName}/{@code logoUrl}/footer fields <em>are</em> real data (see the
 * {@link #forHotel}/{@link #forPlatform} factories in
 * {@code NotificationServiceImpl}), never invented. If per-hotel theming is
 * ever needed, only this record and its factories change — no template does.
 *
 * <p>Fonts are email-safe system stacks that approximate the site's
 * Fraunces/Inter pairing (a serif display face is rarely available in mail
 * clients — Outlook desktop and most webmail strip {@code @font-face}/
 * {@code <link>} entirely) rather than the literal families.
 */
public record EmailTheme(
		String hotelName,
		String logoUrl,
		String logoAlt,
		String primaryColor,
		String primaryDarkColor,
		String accentColor,
		String textColor,
		String mutedTextColor,
		String backgroundColor,
		String cardBackgroundColor,
		String borderColor,
		String successColor,
		String warningColor,
		String headingFontFamily,
		String bodyFontFamily,
		String footerAddress,
		String footerPhone,
		String footerEmail,
		String footerWebsite) {

	private static final String HEADING_FONT = "Georgia, 'Times New Roman', Times, serif";
	private static final String BODY_FONT =
			"-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

	public static EmailTheme forHotel(String hotelName, String logoUrl, String address, String phone,
			String email, String website) {
		return new EmailTheme(hotelName, logoUrl, hotelName,
				"#142639", "#0d1c29", "#b98b3e", "#20242c", "#5b6472", "#f7f4ee", "#ffffff", "#e6e2da",
				"#3c6e52", "#a2543a", HEADING_FONT, BODY_FONT, address, phone, email, website);
	}

	public static EmailTheme forPlatform(String platformName, String logoUrl, String contactEmail,
			String contactPhone, String website) {
		return forHotel(platformName, logoUrl, null, contactPhone, contactEmail, website);
	}
}
