package com.hotelcollection.hotel.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.data.domain.Page;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import com.hotelcollection.hotel.dto.PageInput;
import com.hotelcollection.hotel.dto.admin.AdminDashboardView;
import com.hotelcollection.hotel.dto.audit.AuditLogPageResult;
import com.hotelcollection.hotel.dto.availability.AvailabilityRangeInput;
import com.hotelcollection.hotel.dto.availability.AvailabilityUpdateInput;
import com.hotelcollection.hotel.dto.billing.InvoicePageResult;
import com.hotelcollection.hotel.dto.billing.PaymentPageResult;
import com.hotelcollection.hotel.dto.catalog.AdminHotel;
import com.hotelcollection.hotel.dto.catalog.AdminHotelInput;
import com.hotelcollection.hotel.dto.catalog.AdminHotelPage;
import com.hotelcollection.hotel.dto.catalog.AdminRoomInput;
import com.hotelcollection.hotel.dto.catalog.AdminRoomTypeInput;
import com.hotelcollection.hotel.dto.catalog.HotelPolicyInput;
import com.hotelcollection.hotel.dto.identity.AdminCreateUserInput;
import com.hotelcollection.hotel.dto.identity.AdminRoleView;
import com.hotelcollection.hotel.dto.identity.AdminUserView;
import com.hotelcollection.hotel.dto.media.MediaInput;
import com.hotelcollection.hotel.dto.notification.NotificationPageResult;
import com.hotelcollection.hotel.dto.rate.AdminPromotionInput;
import com.hotelcollection.hotel.dto.rate.AdminPromotionView;
import com.hotelcollection.hotel.dto.rate.AdminRatePlanInput;
import com.hotelcollection.hotel.dto.rate.RatePlanPriceInfoView;
import com.hotelcollection.hotel.dto.rate.RatePlanPriceInput;
import com.hotelcollection.hotel.dto.rate.RoomTypeRatePlanInfoView;
import com.hotelcollection.hotel.dto.reservation.AdminGuestPage;
import com.hotelcollection.hotel.dto.review.ReviewPage;
import com.hotelcollection.hotel.entity.Amenity;
import com.hotelcollection.hotel.entity.Availability;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.HotelPolicy;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.entity.RatePlan;
import com.hotelcollection.hotel.entity.Review;
import com.hotelcollection.hotel.entity.ReviewModerationStatus;
import com.hotelcollection.hotel.entity.Room;
import com.hotelcollection.hotel.entity.RoomType;
import com.hotelcollection.hotel.service.AdminDashboardService;
import com.hotelcollection.hotel.service.AuditService;
import com.hotelcollection.hotel.service.AvailabilityAdminService;
import com.hotelcollection.hotel.service.BillingAdminService;
import com.hotelcollection.hotel.service.BookingService;
import com.hotelcollection.hotel.service.CatalogAdminService;
import com.hotelcollection.hotel.service.CatalogQueryService;
import com.hotelcollection.hotel.service.IdentityAdminService;
import com.hotelcollection.hotel.service.NotificationQueryService;
import com.hotelcollection.hotel.service.RateAdminService;
import com.hotelcollection.hotel.service.RateQueryService;
import com.hotelcollection.hotel.service.ReservationAdminService;
import com.hotelcollection.hotel.service.ReviewService;

/**
 * Back-office GraphQL root (queries + mutations). Thin controller over the
 * service layer — every authorization check (staff membership /
 * super_admin) lives in the services themselves.
 */
@Controller
public class AdminGraphQLController {

	private final AdminDashboardService dashboard;
	private final CatalogAdminService catalogAdmin;
	private final CatalogQueryService catalog;
	private final RateQueryService rate;
	private final RateAdminService rateAdmin;
	private final ReservationAdminService reservations;
	private final BillingAdminService billing;
	private final ReviewService review;
	private final IdentityAdminService identity;
	private final NotificationQueryService notifications;
	private final AuditService audit;
	private final AvailabilityAdminService availability;
	private final BookingService booking;

	public AdminGraphQLController(AdminDashboardService dashboard, CatalogAdminService catalogAdmin,
			CatalogQueryService catalog, RateQueryService rate, RateAdminService rateAdmin,
			ReservationAdminService reservations, BillingAdminService billing,
			ReviewService review, IdentityAdminService identity,
			NotificationQueryService notifications, AuditService audit,
			AvailabilityAdminService availability, BookingService booking) {
		this.dashboard = dashboard;
		this.catalogAdmin = catalogAdmin;
		this.catalog = catalog;
		this.rate = rate;
		this.rateAdmin = rateAdmin;
		this.reservations = reservations;
		this.billing = billing;
		this.review = review;
		this.identity = identity;
		this.notifications = notifications;
		this.audit = audit;
		this.availability = availability;
		this.booking = booking;
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
		return rate.promotions(hotelId);
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

	// ---------------------------------------------------------------- hotels

	@MutationMapping
	public Hotel createHotel(@Argument AdminHotelInput input) {
		return catalogAdmin.createHotel(input);
	}

	@MutationMapping
	public Hotel updateHotel(@Argument UUID id, @Argument AdminHotelInput input) {
		return catalogAdmin.updateHotel(id, input);
	}

	@MutationMapping
	public List<Amenity> setHotelAmenities(@Argument UUID hotelId,
			@Argument List<UUID> amenityIds) {
		return catalogAdmin.setHotelAmenities(hotelId, amenityIds);
	}

	@MutationMapping
	public List<Media> setHotelMedia(@Argument UUID hotelId, @Argument List<MediaInput> media) {
		return catalogAdmin.setHotelMedia(hotelId, media);
	}

	@MutationMapping
	public List<HotelPolicy> setHotelPolicies(@Argument UUID hotelId,
			@Argument List<HotelPolicyInput> policies) {
		return catalogAdmin.setHotelPolicies(hotelId, policies);
	}

	// ---------------------------------------------------------------- room types

	@MutationMapping
	public RoomType createRoomType(@Argument UUID hotelId, @Argument AdminRoomTypeInput input) {
		return catalogAdmin.createRoomType(hotelId, input);
	}

	@MutationMapping
	public RoomType updateRoomType(@Argument UUID id, @Argument AdminRoomTypeInput input) {
		return catalogAdmin.updateRoomType(id, input);
	}

	@MutationMapping
	public List<Amenity> setRoomTypeAmenities(@Argument UUID roomTypeId,
			@Argument List<UUID> amenityIds) {
		return catalogAdmin.setRoomTypeAmenities(roomTypeId, amenityIds);
	}

	@MutationMapping
	public List<Media> setRoomTypeMedia(@Argument UUID roomTypeId,
			@Argument List<MediaInput> media) {
		return catalogAdmin.setRoomTypeMedia(roomTypeId, media);
	}

	// ---------------------------------------------------------------- rooms

	@MutationMapping
	public Room createRoom(@Argument UUID hotelId, @Argument AdminRoomInput input) {
		return catalogAdmin.createRoom(hotelId, input);
	}

	@MutationMapping
	public Room updateRoom(@Argument UUID id, @Argument AdminRoomInput input) {
		return catalogAdmin.updateRoom(id, input);
	}

	// ---------------------------------------------------------------- rate plans

	@MutationMapping
	public RatePlan createRatePlan(@Argument UUID hotelId, @Argument AdminRatePlanInput input) {
		return rateAdmin.createRatePlan(hotelId, input);
	}

	@MutationMapping
	public RatePlan updateRatePlan(@Argument UUID id, @Argument AdminRatePlanInput input) {
		return rateAdmin.updateRatePlan(id, input);
	}

	@MutationMapping
	public RoomTypeRatePlanInfoView linkRoomTypeRatePlan(@Argument UUID roomTypeId,
			@Argument UUID ratePlanId) {
		return rateAdmin.linkRoomTypeRatePlan(roomTypeId, ratePlanId);
	}

	@MutationMapping
	public boolean unlinkRoomTypeRatePlan(@Argument UUID linkId) {
		return rateAdmin.unlinkRoomTypeRatePlan(linkId);
	}

	@MutationMapping
	public List<RatePlanPriceInfoView> setRatePlanPrices(@Argument UUID linkId,
			@Argument List<RatePlanPriceInput> prices) {
		return rateAdmin.setRatePlanPrices(linkId, prices);
	}

	// ---------------------------------------------------------------- availability

	@MutationMapping
	public List<Availability> updateAvailability(@Argument UUID hotelId,
			@Argument List<AvailabilityUpdateInput> rows) {
		return availability.updateAvailability(hotelId, rows);
	}

	@MutationMapping
	public List<Availability> updateAvailabilityRange(@Argument UUID hotelId,
			@Argument AvailabilityRangeInput input) {
		return availability.updateAvailabilityRange(hotelId, input);
	}

	// ---------------------------------------------------------------- promotions

	@MutationMapping
	public AdminPromotionView createPromotion(@Argument UUID hotelId,
			@Argument AdminPromotionInput input) {
		return rateAdmin.createPromotion(hotelId, input);
	}

	@MutationMapping
	public AdminPromotionView updatePromotion(@Argument UUID id,
			@Argument AdminPromotionInput input) {
		return rateAdmin.updatePromotion(id, input);
	}

	@MutationMapping
	public AdminPromotionView setPromotionStatus(@Argument UUID id, @Argument String status) {
		return rateAdmin.setPromotionStatus(id, status);
	}

	// ---------------------------------------------------------------- users & roles

	@MutationMapping
	public AdminUserView createUser(@Argument AdminCreateUserInput input) {
		return identity.createUser(input);
	}

	@MutationMapping
	public AdminUserView assignRole(@Argument UUID userId, @Argument String roleName,
			@Argument UUID hotelId) {
		return identity.assignRole(userId, roleName, hotelId);
	}

	@MutationMapping
	public AdminUserView revokeRole(@Argument UUID userRoleId) {
		return identity.revokeRole(userRoleId);
	}
}