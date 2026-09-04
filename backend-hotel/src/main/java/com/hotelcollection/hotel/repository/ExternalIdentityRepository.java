package com.hotelcollection.hotel.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.hotelcollection.hotel.entity.ExternalIdentity;
import com.hotelcollection.hotel.identity.IdentityProviderType;

public interface ExternalIdentityRepository extends JpaRepository<ExternalIdentity, UUID> {

	Optional<ExternalIdentity> findByProviderAndProviderSubject(IdentityProviderType provider, String providerSubject);

	List<ExternalIdentity> findByUserId(UUID userId);
}
