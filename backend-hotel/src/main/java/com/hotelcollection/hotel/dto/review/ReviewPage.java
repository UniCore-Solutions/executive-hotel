package com.hotelcollection.hotel.dto.review;

import java.util.List;

import com.hotelcollection.hotel.entity.Review;

public record ReviewPage(long total, int page, int size, List<Review> items) {
}