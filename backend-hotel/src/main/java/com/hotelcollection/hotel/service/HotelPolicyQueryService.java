package com.hotelcollection.hotel.service;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.entity.HotelPolicy;

/** Hotel policy reads. Split out from CatalogQueryService (not folded into
    it) to keep that service under the ArchUnit constructor-count limit —
    mirrors how Media already has its own MediaQueryService/MediaAdminService
    pair rather than living on the catalog services. */
public interface HotelPolicyQueryService {

	List<HotelPolicy> policies(UUID hotelId);
}
