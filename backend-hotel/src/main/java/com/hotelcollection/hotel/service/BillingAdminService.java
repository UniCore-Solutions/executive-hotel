package com.hotelcollection.hotel.service;
import java.util.UUID;

import com.hotelcollection.hotel.dto.PageInput;
import com.hotelcollection.hotel.dto.billing.InvoicePageResult;
import com.hotelcollection.hotel.dto.billing.PaymentPageResult;

/**
 * Back-office billing reads (payments/invoices listings and dashboard
 * counters). Authorization (hotel staff) is enforced internally.
 */
public interface BillingAdminService {

	/**
	 * {@code search} matches the payment's reservation reference or guest
	 * name/email. {@code sort} is {@code "<field>-<asc|desc>"} over
	 * {@code amount}/{@code status}/{@code createdAt}; anything else
	 * (including blank) defaults to {@code createdAt desc}.
	 */
	PaymentPageResult payments(UUID hotelId, String search, String sort, PageInput page);

	InvoicePageResult invoices(UUID hotelId, PageInput page);

	long countInvoices(UUID hotelId);

	java.math.BigDecimal sumCaptured(UUID hotelId);
}