package com.hotelcollection.hotel.service;

import java.util.Map;
import java.util.UUID;

import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.dto.PageInput;
import com.hotelcollection.hotel.dto.audit.AuditLogPageResult;

/**
 * Audit use cases: low-level record used by every back-office write, and
 * the audit log listing (super_admin enforced internally).
 */
public interface AuditService {

	void record(CurrentUser actor, String action, String resourceType, UUID resourceId,
			UUID hotelId, Map<String, Object> metadata);

	AuditLogPageResult auditLogs(PageInput page);
}