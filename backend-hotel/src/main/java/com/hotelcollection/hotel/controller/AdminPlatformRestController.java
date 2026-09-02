package com.hotelcollection.hotel.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.hotelcollection.hotel.dto.media.MediaInput;
import com.hotelcollection.hotel.dto.platform.AdminPlatformInput;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.entity.Platform;
import com.hotelcollection.hotel.service.PlatformAdminService;

/**
 * Back-office platform (brand) write endpoints. There is exactly one
 * platform row in this single-tenant deployment; authorization (super_admin
 * only) is enforced inside {@link PlatformAdminService}.
 */
@RestController
@RequestMapping("/api/v1/admin/platform")
public class AdminPlatformRestController {

	private final PlatformAdminService platformAdmin;

	public AdminPlatformRestController(PlatformAdminService platformAdmin) {
		this.platformAdmin = platformAdmin;
	}

	@PutMapping("/{id}")
	public Platform updatePlatform(@PathVariable UUID id, @RequestBody AdminPlatformInput in) {
		return platformAdmin.updatePlatform(id, in);
	}

	@PutMapping("/{id}/media")
	public List<Media> setPlatformMedia(@PathVariable UUID id, @RequestBody List<MediaInput> media) {
		return platformAdmin.setPlatformMedia(id, media);
	}
}
