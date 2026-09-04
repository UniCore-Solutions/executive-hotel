package com.hotelcollection.hotel.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.hotelcollection.hotel.exception.DomainException;

/**
 * Local-filesystem media storage (dev default; the abstraction is S3-ready).
 *
 * Safety (approved in docs/archive/planning/client-platform-index-data-architecture.md §6):
 * - size limit (5 MB),
 * - declared content type must be an allowed image type AND the bytes must
 *   match the corresponding magic signature (rejects spoofed/executable
 *   content and "invalid images"),
 * - storage keys are server-generated (uuid + whitelisted extension) — no
 *   caller-supplied path can influence the location (no traversal),
 * - deletes resolve under the configured root only.
 */
@Component
public class LocalFilesystemMediaStorageProvider implements MediaStorageProvider {

	private static final Logger log = LoggerFactory.getLogger(LocalFilesystemMediaStorageProvider.class);

	public static final int MAX_SIZE_BYTES = 5 * 1024 * 1024;

	private static final Set<String> ALLOWED_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp", "gif");

	private final Path root;

	public LocalFilesystemMediaStorageProvider(
			@Value("${app.media.storage-path:./data/media}") Path root) {
		this.root = root.toAbsolutePath().normalize();
		try {
			Files.createDirectories(this.root);
		} catch (IOException ex) {
			throw new IllegalStateException("cannot create media storage root " + this.root, ex);
		}
	}

	@Override
	public String store(byte[] content, String originalName, String contentType) {
		if (content == null || content.length == 0) {
			throw DomainException.validation("empty file");
		}
		if (content.length > MAX_SIZE_BYTES) {
			throw DomainException.validation("file exceeds the 5 MB limit");
		}
		if (contentType != null && !contentType.isBlank() && !allowedContentType(contentType)) {
			throw DomainException.validation("unsupported content type: " + contentType);
		}
		Detected detected = detect(content);
		if (detected == null) {
			throw DomainException.validation("invalid image: unrecognized file signature");
		}

		String extension = extensionOf(originalName, detected);
		String key = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMM"))
				+ "/" + UUID.randomUUID() + "." + extension;
		Path target = resolve(key);
		try {
			Files.createDirectories(target.getParent());
			Files.write(target, content, java.nio.file.StandardOpenOption.CREATE_NEW);
		} catch (IOException ex) {
			try {
				Files.deleteIfExists(target);
			} catch (IOException ignored) {
				// best-effort cleanup
			}
			throw DomainException.unavailable("media storage unavailable");
		}
		return key;
	}

	@Override
	public byte[] read(String storageKey) {
		if (storageKey == null || storageKey.isBlank()) {
			return null;
		}
		Path target = resolve(storageKey);
		if (!Files.exists(target)) {
			return null;
		}
		try {
			return Files.readAllBytes(target);
		} catch (IOException ex) {
			log.warn("media file read failed for key {}", storageKey, ex);
			return null;
		}
	}

	@Override
	public void delete(String storageKey) {
		if (storageKey == null || storageKey.isBlank()) {
			return;
		}
		try {
			Files.deleteIfExists(resolve(storageKey));
		} catch (IOException ex) {
			log.warn("media file delete failed for key {}", storageKey, ex);
		}
	}

	@Override
	public boolean exists(String storageKey) {
		return storageKey != null && !storageKey.isBlank() && Files.exists(resolve(storageKey));
	}

	@Override
	public String mimeTypeOf(byte[] content) {
		Detected detected = detect(content);
		return detected == null ? null : detected.mimeType();
	}

	private Path resolve(String storageKey) {
		Path candidate = root.resolve(storageKey).normalize();
		if (!candidate.startsWith(root)) {
			throw DomainException.validation("invalid storage key");
		}
		return candidate;
	}

	private static boolean allowedContentType(String contentType) {
		return contentType.equalsIgnoreCase("image/jpeg")
				|| contentType.equalsIgnoreCase("image/png")
				|| contentType.equalsIgnoreCase("image/webp")
				|| contentType.equalsIgnoreCase("image/gif");
	}

	/** Magic-byte sniffing: the bytes are the truth, not the declared type. */
	private static Detected detect(byte[] content) {
		if (startsWith(content, 0xFF, 0xD8, 0xFF)) {
			return new Detected("image/jpeg", "jpg");
		}
		if (startsWith(content, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) {
			return new Detected("image/png", "png");
		}
		if (startsWith(content, 0x47, 0x49, 0x46, 0x38)) {
			return new Detected("image/gif", "gif");
		}
		if (content.length >= 12 && startsWith(content, 0x52, 0x49, 0x46, 0x46)
				&& matchesAt(content, 12, 0x57, 0x45, 0x42, 0x50)) {
			return new Detected("image/webp", "webp");
		}
		return null;
	}

	private static boolean startsWith(byte[] content, int... bytes) {
		if (content.length < bytes.length) {
			return false;
		}
		for (int i = 0; i < bytes.length; i++) {
			if ((content[i] & 0xFF) != bytes[i]) {
				return false;
			}
		}
		return true;
	}

	private static boolean matchesAt(byte[] content, int offset, int... bytes) {
		if (content.length < offset + bytes.length) {
			return false;
		}
		for (int i = 0; i < bytes.length; i++) {
			if ((content[offset + i] & 0xFF) != bytes[i]) {
				return false;
			}
		}
		return true;
	}

	/** Extension from the caller's filename only when it is whitelisted. */
	private static String extensionOf(String originalName, Detected detected) {
		if (originalName != null) {
			String name = originalName.replace('\\', '/');
			int slash = name.lastIndexOf('/');
			int dot = name.lastIndexOf('.');
			if (dot > slash) {
				String ext = name.substring(dot + 1).toLowerCase(Locale.ROOT);
				if (ALLOWED_EXTENSIONS.contains(ext)) {
					return ext;
				}
			}
		}
		return detected.extension();
	}

	private record Detected(String mimeType, String extension) {
	}
}