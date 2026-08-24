package com.hotelcollection.hotel.service;
import java.util.UUID;

import com.hotelcollection.hotel.dto.PageInput;
import com.hotelcollection.hotel.dto.admin.AdminDashboardView;
import com.hotelcollection.hotel.dto.catalog.AdminHotel;
import com.hotelcollection.hotel.dto.catalog.AdminHotelPage;

/**
 * Back-office facade use cases (composes services across layers only):
 * hotel list, hotel workspace and the operational dashboard. Authorization
 * (hotel scoping / super_admin) is enforced internally.
 */
public interface AdminDashboardService {

	AdminHotelPage hotels(PageInput page);

	AdminHotel hotelWorkspace(UUID hotelId);

	AdminDashboardView dashboard(UUID hotelId);
}