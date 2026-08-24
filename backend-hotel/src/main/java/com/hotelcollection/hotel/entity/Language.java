package com.hotelcollection.hotel.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "languages")
@Getter
@NoArgsConstructor
public class Language {

	@Id
	private String code;

	private String name;

	private boolean isRtl;
}