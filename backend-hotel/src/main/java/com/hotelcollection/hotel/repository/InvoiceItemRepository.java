package com.hotelcollection.hotel.repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.InvoiceItem;

public interface InvoiceItemRepository extends JpaRepository<InvoiceItem, UUID> {

	@Query("select i from InvoiceItem i where i.invoiceId in :ids order by i.sortOrder")
	List<InvoiceItem> findByInvoiceIds(@Param("ids") Collection<UUID> ids);
}