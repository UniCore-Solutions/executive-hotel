package com.hotelcollection.hotel.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Path;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import com.hotelcollection.hotel.exception.DomainException;

/** Plain JUnit — no Spring context needed for filesystem behavior. */
class LocalFilesystemDocumentStorageProviderTest {

	private static final byte[] VALID_PDF = "%PDF-1.4\n...".getBytes();

	@Test
	void storesAndReadsBackAValidPdf(@TempDir Path tempDir) {
		DocumentStorageProvider storage = new LocalFilesystemDocumentStorageProvider(tempDir);

		storage.store(VALID_PDF, "invoices/abc.pdf");

		assertThat(storage.exists("invoices/abc.pdf")).isTrue();
		assertThat(storage.read("invoices/abc.pdf")).isEqualTo(VALID_PDF);
	}

	@Test
	void deleteRemovesTheFile(@TempDir Path tempDir) {
		DocumentStorageProvider storage = new LocalFilesystemDocumentStorageProvider(tempDir);
		storage.store(VALID_PDF, "invoices/abc.pdf");

		storage.delete("invoices/abc.pdf");

		assertThat(storage.exists("invoices/abc.pdf")).isFalse();
		assertThat(storage.read("invoices/abc.pdf")).isNull();
	}

	@Test
	void readOfAnUnknownKeyReturnsNullRatherThanThrowing(@TempDir Path tempDir) {
		DocumentStorageProvider storage = new LocalFilesystemDocumentStorageProvider(tempDir);

		assertThat(storage.read("invoices/never-existed.pdf")).isNull();
		assertThat(storage.exists("invoices/never-existed.pdf")).isFalse();
	}

	@Test
	void rejectsContentThatIsNotActuallyAPdf(@TempDir Path tempDir) {
		DocumentStorageProvider storage = new LocalFilesystemDocumentStorageProvider(tempDir);

		assertThatThrownBy(() -> storage.store("not a pdf".getBytes(), "invoices/abc.pdf"))
				.isInstanceOf(DomainException.class);
	}

	@Test
	void rejectsPathTraversalInTheStorageKey(@TempDir Path tempDir) {
		DocumentStorageProvider storage = new LocalFilesystemDocumentStorageProvider(tempDir);

		assertThatThrownBy(() -> storage.store(VALID_PDF, "../../etc/passwd"))
				.isInstanceOf(DomainException.class);
	}

	@Test
	void rejectsOversizedContent(@TempDir Path tempDir) {
		DocumentStorageProvider storage = new LocalFilesystemDocumentStorageProvider(tempDir);
		byte[] tooBig = new byte[LocalFilesystemDocumentStorageProvider.MAX_SIZE_BYTES + 1];
		System.arraycopy(VALID_PDF, 0, tooBig, 0, VALID_PDF.length);

		assertThatThrownBy(() -> storage.store(tooBig, "invoices/abc.pdf"))
				.isInstanceOf(DomainException.class);
	}
}
