package com.hotelcollection.hotel.storage;

/**
 * Binary storage abstraction for generated documents (invoice/credit-note
 * PDFs). Metadata (storage key, generated-at) lives in PostgreSQL on the
 * owning entity; the bytes live behind this abstraction (local filesystem
 * now, S3-compatible object storage later — same shape as
 * {@link MediaStorageProvider}).
 *
 * <p>Unlike media, document keys are deterministic and caller-supplied
 * (derived from the owning entity's id, e.g. {@code invoices/<id>.pdf}) so
 * generation is idempotent and lookups don't need a separate index. The
 * caller is always internal service code, never a client-supplied value.
 */
public interface DocumentStorageProvider {

	/** Persist document bytes under the given key, returning it unchanged for
	 * chaining. Implementations must never resolve outside their configured root. */
	String store(byte[] content, String storageKey);

	/** Read back previously stored bytes; {@code null} if the key is unknown. */
	byte[] read(String storageKey);

	/** Remove the stored object; no-op when the key is unknown or empty. */
	void delete(String storageKey);

	boolean exists(String storageKey);
}
