package com.hotelcollection.hotel.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import com.hotelcollection.hotel.dto.PageInput;
import com.hotelcollection.hotel.dto.admin.AdminDashboardView;
import com.hotelcollection.hotel.dto.audit.AuditLogPageResult;
import com.hotelcollection.hotel.dto.billing.InvoicePageResult;
import com.hotelcollection.hotel.dto.billing.PaymentPageResult;
import com.hotelcollection.hotel.dto.catalog.AdminHotel;
import com.hotelcollection.hotel.dto.catalog.AdminHotelPage;
import com.hotelcollection.hotel.dto.identity.AdminRoleView;
import com.hotelcollection.hotel.dto.identity.AdminUserView;
import com.hotelcollection.hotel.dto.notification.NotificationPageResult;
import com.hotelcollection.hotel.dto.rate.AdminPromotionView;
import com.hotelcollection.hotel.dto.reservation.AdminGuestPage;
import com.hotelcollection.hotel.dto.review.ReviewPage;
import com.hotelcollection.hotel.entity.Amenity;
import com.hotelcollection.hotel.entity.Review;
import com.hotelcollection.hotel.entity.ReviewModerationStatus;
import com.hotelcollection.hotel.service.AdminDashboardService;
import com.hotelcollection.hotel.service.AuditService;
import com.hotelcollection.hotel.service.BillingAdminService;
import com.hotelcollection.hotel.service.CatalogAdminService;
import com.hotelcollection.hotel.service.IdentityAdminService;
import com.hotelcollection.hotel.service.NotificationQueryService;
import com.hotelcollection.hotel.service.RateQueryService;
import com.hotelcollection.hotel.service.ReservationAdminService;
import com.hotelcollection.hotel.service.ReviewService;

/**
 * Back-office GraphQL root — READ side only (API rule: GraphQL = READ,
 * REST = WRITE/ACTION; the admin writes live under /api/v1/admin/**).
 * Thin controller over the service layer — every authorization check
 * (staff membership / super_admin) lives in the services themselves.
 */
@Controller
public class AdminGraphQLController {

	private final AdminDashboardService dashboard;
	private final CatalogAdminService catalogAdmin;
	private final RateQueryService rateQuery;
	private final ReservationAdminService reservations;
	private final BillingAdminService billing;
	private final ReviewService review;
	private final IdentityAdminService identity;
	private final NotificationQueryService notifications;
	private final AuditService audit;

	public AdminGraphQLController(AdminDashboardService dashboard, CatalogAdminService catalogAdmin,
			RateQueryService rateQuery, ReservationAdminService reservations,
			BillingAdminService billing,
			ReviewService review, IdentityAdminService identity,
			NotificationQueryService notifications, AuditService audit) {
		this.dashboard = dashboard;
		this.catalogAdmin = catalogAdmin;
		this.rateQuery = rateQuery;
		this.reservations = reservations;
		this.billing = billing;
		this.review = review;
		this.identity = identity;
		this.notifications = notifications;
		this.audit = audit;
	}

	// ---------------------------------------------------------------- queries

	@QueryMapping
	public List<Amenity> adminAmenities() {
		return catalogAdmin.amenityCatalog();
	}

	@QueryMapping
	public AdminHotel adminHotel(@Argument UUID hotelId) {
		return dashboard.hotelWorkspace(hotelId);
	}

	@QueryMapping
	public AdminHotelPage adminHotels(@Argument PageInput page) {
		return dashboard.hotels(page);
	}

	@QueryMapping
	public AdminGuestPage adminGuests(@Argument UUID hotelId, @Argument String query,
			@Argument PageInput page) {
		return reservations.guests(hotelId, query, page);
	}

	@QueryMapping
	public PaymentPageResult adminPayments(@Argument UUID hotelId, @Argument PageInput page) {
		return billing.payments(hotelId, page);
	}

	@QueryMapping
	public InvoicePageResult adminInvoices(@Argument UUID hotelId, @Argument PageInput page) {
		return billing.invoices(hotelId, page);
	}

	@QueryMapping
	public List<AdminPromotionView> adminPromotions(@Argument UUID hotelId) {
		return rateQuery.promotions(hotelId);
	}

	@QueryMapping
	public ReviewPage adminReviews(@Argument UUID hotelId,
			@Argument ReviewModerationStatus status, @Argument PageInput page) {
		Page<Review> rows = review.adminReviews(hotelId, status, page);
		return new ReviewPage(rows.getTotalElements(), rows.getNumber(), rows.getSize(),
				rows.getContent());
	}

	@QueryMapping
	public List<AdminUserView> adminUsers() {
		return identity.users();
	}

	@QueryMapping
	public List<AdminRoleView> adminRoles() {
		return identity.roles();
	}

	@QueryMapping
	public NotificationPageResult adminNotifications(@Argument UUID hotelId,
			@Argument PageInput page) {
		return notifications.notifications(hotelId, page);
	}

	@QueryMapping
	public AuditLogPageResult adminAuditLogs(@Argument PageInput page) {
		return audit.auditLogs(page);
	}

	@QueryMapping
	public AdminDashboardView adminDashboard(@Argument UUID hotelId) {
		return dashboard.dashboard(hotelId);
	}
}
