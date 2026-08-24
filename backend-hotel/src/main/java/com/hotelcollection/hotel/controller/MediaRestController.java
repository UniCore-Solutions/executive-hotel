package com.hotelcollection.hotel.controller;
import java.util.UUID;

import com.hotelcollection.hotel.util.Validation;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.hotelcollection.hotel.entity.Media;
import com.hotelcollection.hotel.exception.DomainException;
import com.hotelcollection.hotel.service.MediaStorageService;

/**
 * Media upload/delete (multipart doesn't fit GraphQL — approved split).
 * Uploads are JWT-authenticated (SecurityConfig /api/v1/**); reads of the
 * stored bytes are public via /media/** (resource handler). Validation and
 * binary safety live in the media storage service + provider.
 */
@RestController
@RequestMapping("/api/v1/media")
public class MediaRestController {

	private final MediaStorageService mediaStorageService;

	public MediaRestController(MediaStorageService mediaStorageService) {
		this.mediaStorageService = mediaStorageService;
	}

	@PostMapping("/upload")
	public ResponseEntity<Media> upload(@RequestParam("file") MultipartFile file,
			@RequestParam("ownerType") String ownerType,
			@RequestParam("ownerId") UUID ownerId,
			@RequestParam(value = "altText", required = false) String altText,
			@RequestParam(value = "caption", required = false) String caption,
			@RequestParam(value = "category", required = false) String category,
			@RequestParam(value = "isPrimary", defaultValue = "false") boolean isPrimary) {
		try {
			Media media = mediaStorageService.upload(file.getBytes(), file.getOriginalFilename(),
					file.getContentType(), ownerType, ownerId, altText, caption, category, isPrimary);
			return ResponseEntity.status(HttpStatus.CREATED).body(media);
		} catch (java.io.IOException ex) {
			throw DomainException
					.validation("could not read uploaded file");
		}
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(@PathVariable UUID id) {
		mediaStorageService.delete(id);
		return ResponseEntity.noContent().build();
	}
}