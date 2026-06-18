package com.interview.market.model;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * Request body for filtering the housing market dataset.
 * All fields are optional; null means "no filter" for that dimension.
 */
public class FilterRequest {

    @Min(0)
    private Double minBedrooms;

    @Min(0)
    private Double maxBedrooms;

    @Min(0)
    private Double minBathrooms;

    @Min(0)
    private Double maxBathrooms;

    @Min(1800)
    private Integer minYearBuilt;

    @Min(1800)
    private Integer maxYearBuilt;

    @Min(0)
    @Max(10)
    private Double minSchoolRating;

    @Min(0)
    @Max(10)
    private Double maxSchoolRating;

    private String sortBy;
    private String sortDirection; // "asc" or "desc"

    public Double getMinBedrooms() {
        return minBedrooms;
    }

    public void setMinBedrooms(Double minBedrooms) {
        this.minBedrooms = minBedrooms;
    }

    public Double getMaxBedrooms() {
        return maxBedrooms;
    }

    public void setMaxBedrooms(Double maxBedrooms) {
        this.maxBedrooms = maxBedrooms;
    }

    public Double getMinBathrooms() {
        return minBathrooms;
    }

    public void setMinBathrooms(Double minBathrooms) {
        this.minBathrooms = minBathrooms;
    }

    public Double getMaxBathrooms() {
        return maxBathrooms;
    }

    public void setMaxBathrooms(Double maxBathrooms) {
        this.maxBathrooms = maxBathrooms;
    }

    public Integer getMinYearBuilt() {
        return minYearBuilt;
    }

    public void setMinYearBuilt(Integer minYearBuilt) {
        this.minYearBuilt = minYearBuilt;
    }

    public Integer getMaxYearBuilt() {
        return maxYearBuilt;
    }

    public void setMaxYearBuilt(Integer maxYearBuilt) {
        this.maxYearBuilt = maxYearBuilt;
    }

    public Double getMinSchoolRating() {
        return minSchoolRating;
    }

    public void setMinSchoolRating(Double minSchoolRating) {
        this.minSchoolRating = minSchoolRating;
    }

    public Double getMaxSchoolRating() {
        return maxSchoolRating;
    }

    public void setMaxSchoolRating(Double maxSchoolRating) {
        this.maxSchoolRating = maxSchoolRating;
    }

    public String getSortBy() {
        return sortBy;
    }

    public void setSortBy(String sortBy) {
        this.sortBy = sortBy;
    }

    public String getSortDirection() {
        return sortDirection;
    }

    public void setSortDirection(String sortDirection) {
        this.sortDirection = sortDirection;
    }
}
