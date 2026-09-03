package com.hotelcollection.hotel.dto.billing;

/** A PDF document ready to stream back to the client, with the filename to
 * present it as — never the internal storage path. */
public record GeneratedDocument(byte[] content, String filename) {
}
