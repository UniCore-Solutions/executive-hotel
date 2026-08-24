package com.hotelcollection.hotel.dto.notification;

import java.util.List;

import com.hotelcollection.hotel.entity.Notification;

public record NotificationPageResult(long total, int page, int size,
		List<Notification> items) {
}
