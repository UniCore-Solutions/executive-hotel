package com.hotelcollection.hotel.service;

import com.hotelcollection.hotel.entity.Invoice;

/** Invoice use cases: idempotent on-demand generation for a reservation. */
public interface InvoiceService {

	Invoice getOrCreateInvoice(String reservationReference, String guestEmail);
}