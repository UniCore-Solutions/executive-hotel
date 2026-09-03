package com.hotelcollection.hotel.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.hotelcollection.hotel.exception.DomainException;

/**
 * Local-filesystem document storage (dev default; the abstraction is
 * S3-ready). Same safety posture as {@link LocalFilesystemMediaStorageProvider}:
 * a size limit, magic-byte content verification (here, the PDF header), and
 * storage keys resolved strictly under the configured root — a key is never
 * allowed to escape it via {@code ..} traversal, even though callers are
 * always internal service code rather than user input.
 */
@Component
public class LocalFilesystemDocumentStorageProvider implements DocumentStorageProvider {

	private static final Logger log = LoggerFactory.getLogger(LocalFilesystemDocumentStorageProvider.class);

	public static final int MAX_SIZE_BYTES = 10 * 1024 * 1024;

	private static final byte[] PDF_MAGIC = { '%', 'P', 'D', 'F' };

	private final Path root;

	public LocalFilesystemDocumentStorageProvider(
			@Value("${app.documents.storage-path:./data/documents}") Path root) {
		this.root = root.toAbsolutePath().normalize();
		try {
			Files.createDirectories(this.root);
		} catch (IOException ex) {
			throw new IllegalStateException("cannot create document storage root " + this.root, ex);
		}
	}

	@Override
	public String store(byte[] content, String storageKey) {
		if (content == null || content.length == 0) {
			throw DomainException.validation("empty document");
		}
		if (content.length > MAX_SIZE_BYTES) {
			throw DomainException.validation("generated document exceeds the 10 MB limit");
		}
		if (!startsWith(content, PDF_MAGIC)) {
			throw DomainException.validation("generated content is not a valid PDF");
		}
		Path target = resolve(storageKey);
		try {
			Files.createDirectories(target.getParent());
			Files.write(target, content, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
		} catch (IOException ex) {
			throw DomainException.unavailable("document storage unavailable");
		}
		return storageKey;
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
			log.warn("document read failed for key {}", storageKey, ex);
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
			log.warn("document delete failed for key {}", storageKey, ex);
		}
	}

	@Override
	public boolean exists(String storageKey) {
		return storageKey != null && !storageKey.isBlank() && Files.exists(resolve(storageKey));
	}

	private Path resolve(String storageKey) {
		if (storageKey == null || storageKey.isBlank()) {
			throw DomainException.validation("invalid storage key");
		}
		Path candidate = root.resolve(storageKey).normalize();
		if (!candidate.startsWith(root)) {
			throw DomainException.validation("invalid storage key");
		}
		return candidate;
	}

	private static boolean startsWith(byte[] content, byte[] prefix) {
		if (content.length < prefix.length) {
			return false;
		}
		for (int i = 0; i < prefix.length; i++) {
			if (content[i] != prefix[i]) {
				return false;
			}
		}
		return true;
	}
}
