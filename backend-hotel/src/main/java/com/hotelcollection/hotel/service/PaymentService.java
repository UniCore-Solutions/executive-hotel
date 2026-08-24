package com.hotelcollection.hotel.service;

import java.math.BigDecimal;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Payment;
import com.hotelcollection.hotel.dto.billing.CapturePaymentInput;
import com.hotelcollection.hotel.dto.billing.CreatePaymentInput;

/**
 * Payment use cases. Payments are always against a reservation; the amount
 * is server-validated against the remaining balance. Authorization (owner
 * or hotel staff) is enforced internally.
 */
public interface PaymentService {

	Payment createPayment(CreatePaymentInput in);

	Payment capture(CapturePaymentInput in);

	BigDecimal paidAmount(UUID reservationId);
}