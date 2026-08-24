package com.hotelcollection.hotel.entity;

import java.util.UUID;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "cancellation_reasons")
@Getter
@NoArgsConstructor
public class CancellationReason {

	@Id
	@GeneratedValue(strategy = GenerationType.UUID)
	private UUID id;

	private String code;

	private String label;

	private String status;
}