package com.hotelcollection.hotel.dto.audit;

import java.util.List;

public record AuditLogPageResult(long total, int page, int size, List<AuditLogView> items) {
}
