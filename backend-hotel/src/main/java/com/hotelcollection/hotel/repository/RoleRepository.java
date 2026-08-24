package com.hotelcollection.hotel.repository;

import java.util.Optional;
import java.util.UUID;

import com.hotelcollection.hotel.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoleRepository extends JpaRepository<Role, UUID> {

	Optional<Role> findByName(String name);
}