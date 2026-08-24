package com.hotelcollection.hotel.config;

import java.nio.file.Path;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Serves stored media bytes publicly at /media/** from the local storage root
 * (the URL stored on media rows is baseUrl + "/media/" + storageKey).
 */
@Configuration
public class MediaWebConfig implements WebMvcConfigurer {

	private final Path storageRoot;

	public MediaWebConfig(@Value("${app.media.storage-path:./data/media}") Path storageRoot) {
		this.storageRoot = storageRoot.toAbsolutePath().normalize();
	}

	@Override
	public void addResourceHandlers(ResourceHandlerRegistry registry) {
		String location = storageRoot.toUri().toString();
		if (!location.endsWith("/")) {
			location = location + "/";
		}
		registry.addResourceHandler("/media/**").addResourceLocations(location);
	}
}