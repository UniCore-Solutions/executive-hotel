package com.hotelcollection.hotel.integration;

import org.springframework.boot.SpringApplication;

import com.hotelcollection.hotel.HotelPlatformApplication;

public class TestHotelPlatformApplication {

	public static void main(String[] args) {
		SpringApplication.from(HotelPlatformApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
