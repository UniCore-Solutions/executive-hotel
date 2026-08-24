package com.hotelcollection.hotel.service.impl;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import org.springframework.context.annotation.Lazy;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.dto.audit.AuditLogPageResult;
import com.hotelcollection.hotel.dto.audit.AuditLogView;
import com.hotelcollection.hotel.service.AuditService;
import com.hotelcollection.hotel.entity.AuditLog;
import com.hotelcollection.hotel.repository.AuditLogRepository;
import com.hotelcollection.hotel.service.IdentityAdminService;
import com.hotelcollection.hotel.security.CurrentUser;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.dto.PageInput;
import com.hotelcollection.hotel.security.CurrentUserAccessor;

/**
 * Audit use cases: the low-level record used by every back-office write and
 * the platform-wide audit log listing (super_admin enforced internally).
 */
@Service
public class AuditServiceImpl implements AuditService {

	private final AuditLogRepository auditLogRepository;
	private final IdentityAdminService identityAdmin;
	private final CurrentUserAccessor currentUser;

	public AuditServiceImpl(AuditLogRepository auditLogRepository,
			@Lazy IdentityAdminService identityAdmin,
			CurrentUserAccessor currentUser) {
		this.auditLogRepository = auditLogRepository;
		this.identityAdmin = identityAdmin;
		this.currentUser = currentUser;
	}

	@Override
	@Transactional
	public void record(CurrentUser actor, String action, String resourceType, UUID resourceId,
			UUID hotelId, Map<String, Object> metadata) {
		AuditLog log = new AuditLog();
		log.setActorUserId(actor == null ? null : actor.userId());
		log.setAction(action);
		log.setResourceType(resourceType);
		log.setResourceId(resourceId);
		log.setHotelId(hotelId);
		log.setResult("success");
		log.setMetadata(metadata);
		log.setCreatedAt(Instant.now());
		auditLogRepository.save(log);
	}

	@Override
	@Transactional(readOnly = true)
	public AuditLogPageResult auditLogs(PageInput page) {
		CurrentUser actor = currentUser.require();
		if (!actor.hasRole("super_admin")) {
			throw DomainException.forbidden("super_admin role required");
		}
		int p = page == null || page.page() == null ? 0 : Math.max(page.page(), 0);
		int s = page == null || page.size() == null ? 20 : Math.min(Math.max(page.size(), 1), 100);
		Page<AuditLog> result = auditLogRepository.findAllByOrderByCreatedAtDesc(
				PageRequest.of(p, s));
		Map<UUID, String> emails = identityAdmin.userEmails();
		java.util.List<AuditLogView> items = result.getContent().stream()
				.map(log -> AuditLogView.of(log,
						log.getActorUserId() == null ? null : emails.get(log.getActorUserId())))
				.toList();
		return new AuditLogPageResult(result.getTotalElements(), result.getNumber(),
				result.getSize(), items);
	}
}