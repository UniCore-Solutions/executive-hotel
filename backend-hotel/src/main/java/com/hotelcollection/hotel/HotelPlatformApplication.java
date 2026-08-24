package com.hotelcollection.hotel;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class HotelPlatformApplication {

	public static void main(String[] args) {
		SpringApplication.run(HotelPlatformApplication.class, args);
	}

}