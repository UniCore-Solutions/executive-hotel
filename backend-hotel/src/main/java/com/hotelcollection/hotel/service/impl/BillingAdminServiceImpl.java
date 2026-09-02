package com.hotelcollection.hotel.service.impl;

import java.math.BigDecimal;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.service.BillingAdminService;
import com.hotelcollection.hotel.dto.billing.InvoicePageResult;
import com.hotelcollection.hotel.dto.billing.PaymentPageResult;
import com.hotelcollection.hotel.entity.Invoice;
import com.hotelcollection.hotel.entity.Payment;
import com.hotelcollection.hotel.repository.InvoiceRepository;
import com.hotelcollection.hotel.repository.PaymentRepository;
import com.hotelcollection.hotel.security.CurrentUserAccessor;
import com.hotelcollection.hotel.dto.PageInput;

/** Back-office billing reads (staff scoping enforced internally). */
@Service
public class BillingAdminServiceImpl implements BillingAdminService {

	private final PaymentRepository paymentRepository;
	private final InvoiceRepository invoiceRepository;
	private final CurrentUserAccessor currentUser;

	public BillingAdminServiceImpl(PaymentRepository paymentRepository,
			InvoiceRepository invoiceRepository, CurrentUserAccessor currentUser) {
		this.paymentRepository = paymentRepository;
		this.invoiceRepository = invoiceRepository;
		this.currentUser = currentUser;
	}

	private static final java.util.Set<String> PAYMENT_SORTABLE_FIELDS = java.util.Set.of(
			"amount", "status", "createdAt");

	private static Sort resolvePaymentSort(String sort) {
		if (sort == null || sort.isBlank()) {
			return Sort.by(Sort.Direction.DESC, "createdAt");
		}
		int idx = sort.lastIndexOf('-');
		String field = idx > 0 ? sort.substring(0, idx) : sort;
		String dir = idx > 0 ? sort.substring(idx + 1) : "asc";
		if (!PAYMENT_SORTABLE_FIELDS.contains(field)) {
			return Sort.by(Sort.Direction.DESC, "createdAt");
		}
		return Sort.by("desc".equalsIgnoreCase(dir) ? Sort.Direction.DESC : Sort.Direction.ASC, field);
	}

	@Override
	@Transactional(readOnly = true)
	public PaymentPageResult payments(UUID hotelId, String search, String sort, PageInput page) {
		requireStaffAccess(hotelId);
		int p = page == null || page.page() == null ? 0 : Math.max(page.page(), 0);
		int s = page == null || page.size() == null ? 20 : Math.min(Math.max(page.size(), 1), 100);
		Page<Payment> result = paymentRepository.findByHotelId(hotelId, search,
				PageRequest.of(p, s, resolvePaymentSort(sort)));
		return new PaymentPageResult(result.getTotalElements(), result.getNumber(),
				result.getSize(), result.getContent());
	}

	@Override
	@Transactional(readOnly = true)
	public InvoicePageResult invoices(UUID hotelId, PageInput page) {
		requireStaffAccess(hotelId);
		int p = page == null || page.page() == null ? 0 : Math.max(page.page(), 0);
		int s = page == null || page.size() == null ? 20 : Math.min(Math.max(page.size(), 1), 100);
		Page<Invoice> result = invoiceRepository.findByHotelId(hotelId, PageRequest.of(p, s));
		return new InvoicePageResult(result.getTotalElements(), result.getNumber(),
				result.getSize(), result.getContent());
	}

	@Override
	@Transactional(readOnly = true)
	public long countInvoices(UUID hotelId) {
		return invoiceRepository.countByHotelId(hotelId);
	}

	@Override
	@Transactional(readOnly = true)
	public BigDecimal sumCaptured(UUID hotelId) {
		return paymentRepository.sumCapturedByHotelId(hotelId);
	}

	private void requireStaffAccess(UUID hotelId) {
		currentUser.requireHotelAccess(hotelId);
	}
}