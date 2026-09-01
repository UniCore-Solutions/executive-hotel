package com.hotelcollection.hotel.service.impl;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.hotelcollection.hotel.security.CurrentUserAccessor;
import com.hotelcollection.hotel.dto.notification.NotificationPageResult;
import com.hotelcollection.hotel.service.NotificationQueryService;
import com.hotelcollection.hotel.entity.Notification;
import com.hotelcollection.hotel.repository.NotificationRepository;
import com.hotelcollection.hotel.dto.PageInput;

/** Notification reads (back-office listing; staff scoping enforced internally). */
@Service
public class NotificationQueryServiceImpl implements NotificationQueryService {

	private final NotificationRepository notificationRepository;
	private final CurrentUserAccessor currentUser;

	public NotificationQueryServiceImpl(NotificationRepository notificationRepository,
			CurrentUserAccessor currentUser) {
		this.notificationRepository = notificationRepository;
		this.currentUser = currentUser;
	}

	@Override
	@Transactional(readOnly = true)
	public NotificationPageResult notifications(UUID hotelId, PageInput page) {
		currentUser.requireHotelAccess(hotelId);
		int p = page == null || page.page() == null ? 0 : Math.max(page.page(), 0);
		int s = page == null || page.size() == null ? 20 : Math.min(Math.max(page.size(), 1), 100);
		Page<Notification> result = notificationRepository
				.findByHotelIdOrderByCreatedAtDesc(hotelId, PageRequest.of(p, s));
		return new NotificationPageResult(result.getTotalElements(), result.getNumber(),
				result.getSize(), result.getContent());
	}
}