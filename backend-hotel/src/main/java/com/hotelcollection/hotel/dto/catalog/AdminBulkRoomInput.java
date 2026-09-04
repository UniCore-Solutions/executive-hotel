package com.hotelcollection.hotel.dto.catalog;

import java.util.List;

/**
 * Bulk room creation for a room type — either an explicit {@code roomNumbers}
 * list (manual mode) or a generator spec ({@code prefix}/{@code startNumber}/
 * {@code count}, pattern mode: "DLX", 101, 10 -&gt; DLX-101..DLX-110, or
 * without a prefix, plain "101".."110"). Exactly one mode should be
 * supplied; {@code floor}/{@code status} apply to every room in the batch.
 */
public record AdminBulkRoomInput(List<String> roomNumbers, String prefix, Integer startNumber,
		Integer count, String floor, String status) {
}
