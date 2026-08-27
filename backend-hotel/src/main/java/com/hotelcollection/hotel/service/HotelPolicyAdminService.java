package com.hotelcollection.hotel.service;

import java.util.List;
import java.util.UUID;

import com.hotelcollection.hotel.dto.catalog.HotelPolicyInput;
import com.hotelcollection.hotel.entity.HotelPolicy;

/** Back-office hotel-policy writes: replace the policy set of a hotel
    (delete-then-insert, mirroring MediaAdminService). Authorization is
    checked by the caller (CatalogAdminServiceImpl), not here — same split
    setHotelMedia uses. */
public interface HotelPolicyAdminService {

	List<HotelPolicy> replaceHotelPolicies(UUID hotelId, List<HotelPolicyInput> policies);
}
