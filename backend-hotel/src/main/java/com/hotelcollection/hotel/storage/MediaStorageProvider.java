package com.hotelcollection.hotel.storage;

/**
 * Binary storage abstraction for media. Metadata lives in PostgreSQL; the bytes live
 * behind this abstraction (local filesystem now, S3-compatible object storage
 * later — same abstraction, per docs/archive/planning/client-platform-index-data-architecture.md §6).
 */
public interface MediaStorageProvider {

	/**
	 * Persist media bytes and return the storage key (a relative, safe
	 * identifier usable to delete or re-resolve the object). Implementations
	 * validate content (size, type, magic bytes) and must never accept a
	 * caller-supplied path.
	 */
	String store(byte[] content, String originalName, String contentType);

	/** Read back previously stored bytes; {@code null} if the key is unknown
	 * or empty. */
	byte[] read(String storageKey);

	/** Remove the stored object; no-op when the key is unknown or empty. */
	void delete(String storageKey);

	boolean exists(String storageKey);

	/** Resolve the actual content type of the bytes (magic-byte based). */
	String mimeTypeOf(byte[] content);
}