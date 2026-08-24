package com.hotelcollection.hotel.controller;

import java.util.List;

import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.graphql.data.method.annotation.SchemaMapping;
import org.springframework.stereotype.Controller;

import com.hotelcollection.hotel.dto.platform.ContentBlockView;
import com.hotelcollection.hotel.entity.Hotel;
import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.entity.Platform;
import com.hotelcollection.hotel.service.PlatformService;

/**
 * Platform read resolvers (see schema.graphqls). Thin: all assembly happens in
 * PlatformService; field resolvers delegate to batch loaders.
 */
@Controller
public class PlatformGraphQLController {

	private final PlatformService platformService;

	public PlatformGraphQLController(PlatformService platformService) {
		this.platformService = platformService;
	}

	@QueryMapping
	public Platform platform(@Argument String slug) {
		return platformService.getPlatform(slug);
	}

	@SchemaMapping(typeName = "Platform", field = "contentBlocks")
	public List<ContentBlockView> contentBlocks(Platform platform) {
		return platformService.contentBlocks(platform.getId());
	}

	@SchemaMapping(typeName = "Platform", field = "media")
	public List<Media> media(Platform platform) {
		return platformService.mediaByPlatformId(platform.getId());
	}

	@SchemaMapping(typeName = "Platform", field = "hotels")
	public List<Hotel> hotels(Platform platform) {
		return platformService.hotelsByPlatformId(platform.getId());
	}
}