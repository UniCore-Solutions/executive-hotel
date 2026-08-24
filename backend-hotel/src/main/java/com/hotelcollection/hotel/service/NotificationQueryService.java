package com.hotelcollection.hotel.service;
import java.util.UUID;

import com.hotelcollection.hotel.dto.PageInput;
import com.hotelcollection.hotel.dto.notification.NotificationPageResult;
import com.hotelcollection.hotel.entity.Notification;

/** Notification reads (back-office listing). Staff scoping enforced internally. */
public interface NotificationQueryService {

	NotificationPageResult notifications(UUID hotelId, PageInput page);
}