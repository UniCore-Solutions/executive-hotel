package com.hotelcollection.hotel.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.UserRole;

public interface UserRoleRepository extends JpaRepository<UserRole, UUID> {

	@Query("""
			select ur from UserRole ur
			join fetch ur.role
			where ur.user.id = :userId
			""")
	List<UserRole> findByUserIdWithRole(@Param("userId") UUID userId);
}