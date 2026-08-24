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

	PaymentPageResult payments(UUID hotelId, PageInput page);

	InvoicePageResult invoices(UUID hotelId, PageInput page);

	long countInvoices(UUID hotelId);

	java.math.BigDecimal sumCaptured(UUID hotelId);
}