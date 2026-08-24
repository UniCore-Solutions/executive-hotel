package com.hotelcollection.hotel.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import com.hotelcollection.hotel.entity.User;

public interface UserRepository extends JpaRepository<User, UUID> {

	@Query("select u from User u where lower(u.email) = lower(:email)")
	Optional<User> findByEmailIgnoreCase(@Param("email") String email);

	@Query("select u from User u where lower(u.email) = lower(:email) and u.status = 'active'")
	Optional<User> findActiveByEmail(@Param("email") String email);

	@Query("""
			select u from User u
			left join fetch u.userRoles ur
			left join fetch ur.role
			where u.id = :id
			""")
	Optional<User> findByIdWithRoles(@Param("id") UUID id);

	@Query("""
			select u from User u
			left join fetch u.userRoles ur
			left join fetch ur.role
			where lower(u.email) = lower(:email) and u.status = 'active'
			""")
	Optional<User> findActiveWithRoles(@Param("email") String email);

	@Query("""
			select u from User u
			left join fetch u.userRoles ur
			left join fetch ur.role
			order by u.email
			""")
	List<User> findAllWithRoles();
}