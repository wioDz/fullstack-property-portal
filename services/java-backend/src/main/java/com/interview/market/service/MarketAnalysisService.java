package com.interview.market.service;

import com.interview.market.model.*;
import com.interview.market.repository.CsvHouseRepository;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service layer for market analysis operations.
 * Computes aggregate statistics, filters the dataset, and delegates ML calls.
 */
@Service
public class MarketAnalysisService {

    private final CsvHouseRepository repository;
    private final MlClientService mlClientService;

    public MarketAnalysisService(CsvHouseRepository repository, MlClientService mlClientService) {
        this.repository = repository;
        this.mlClientService = mlClientService;
    }

    /**
     * Compute overall market statistics from the full dataset.
     * Result is cached by Caffeine to speed up repeated dashboard loads.
     */
    @Cacheable("marketStatistics")
    public MarketStatistics getOverallStatistics() {
        return computeStatistics(repository.findAll());
    }

    /**
     * Filter the dataset based on the provided criteria and return matching records.
     * The filter result is cached using a hash of the request to avoid recomputation.
     */
    @Cacheable(value = "filteredRecords", key = "#request.hashCode()")
    public List<HouseRecord> filterRecords(FilterRequest request) {
        return repository.findAll().stream()
                .filter(r -> inRange(r.getBedrooms(), request.getMinBedrooms(), request.getMaxBedrooms()))
                .filter(r -> inRange(r.getBathrooms(), request.getMinBathrooms(), request.getMaxBathrooms()))
                .filter(r -> inRange(r.getYearBuilt(), request.getMinYearBuilt(), request.getMaxYearBuilt()))
                .filter(r -> inRange(r.getSchoolRating(), request.getMinSchoolRating(), request.getMaxSchoolRating()))
                .sorted(comparatorFor(request.getSortBy(), request.getSortDirection()))
                .collect(Collectors.toList());
    }

    /**
     * Compute statistics for a filtered segment.
     */
    public MarketStatistics getStatisticsForFilter(FilterRequest request) {
        return computeStatistics(filterRecords(request));
    }

    /**
     * Run a what-if scenario: predict the price of a hypothetical property.
     */
    public WhatIfResult runWhatIf(WhatIfRequest request) {
        double predictedPrice = mlClientService.predict(request);

        // Find comparable properties: same bedroom count (if integer) and similar square footage.
        List<HouseRecord> comparables = repository.findAll().stream()
                .filter(r -> Objects.equals(r.getBedrooms(), request.getBedrooms()))
                .filter(r -> Math.abs(r.getSquareFootage() - request.getSquareFootage()) <= 300)
                .sorted(Comparator.comparing(r -> Math.abs(r.getSquareFootage() - request.getSquareFootage())))
                .limit(5)
                .collect(Collectors.toList());

        return new WhatIfResult(predictedPrice, comparables);
    }

    /**
     * Core statistics computation shared by overall and filtered queries.
     */
    private MarketStatistics computeStatistics(List<HouseRecord> records) {
        if (records.isEmpty()) {
            return new MarketStatistics(0, 0, 0, 0, 0, 0, 0);
        }

        List<Double> prices = records.stream()
                .map(HouseRecord::getPrice)
                .sorted()
                .collect(Collectors.toList());

        double avgPrice = prices.stream().mapToDouble(Double::doubleValue).average().orElse(0);
        double medianPrice = median(prices);
        double minPrice = prices.get(0);
        double maxPrice = prices.get(prices.size() - 1);
        double avgSqft = records.stream().mapToDouble(HouseRecord::getSquareFootage).average().orElse(0);
        double avgSchool = records.stream().mapToDouble(HouseRecord::getSchoolRating).average().orElse(0);

        return new MarketStatistics(
                records.size(),
                round(avgPrice),
                round(medianPrice),
                round(minPrice),
                round(maxPrice),
                round(avgSqft),
                round(avgSchool)
        );
    }

    private double median(List<Double> sortedValues) {
        int size = sortedValues.size();
        if (size % 2 == 1) {
            return sortedValues.get(size / 2);
        }
        return (sortedValues.get(size / 2 - 1) + sortedValues.get(size / 2)) / 2.0;
    }

    private boolean inRange(Double value, Double min, Double max) {
        if (value == null) return true;
        if (min != null && value < min) return false;
        if (max != null && value > max) return false;
        return true;
    }

    private boolean inRange(Integer value, Integer min, Integer max) {
        if (value == null) return true;
        if (min != null && value < min) return false;
        if (max != null && value > max) return false;
        return true;
    }

    private Comparator<HouseRecord> comparatorFor(String sortBy, String sortDirection) {
        Comparator<HouseRecord> comparator;
        if ("price".equalsIgnoreCase(sortBy)) {
            comparator = Comparator.comparing(HouseRecord::getPrice, Comparator.nullsLast(Comparator.naturalOrder()));
        } else if ("squareFootage".equalsIgnoreCase(sortBy)) {
            comparator = Comparator.comparing(HouseRecord::getSquareFootage, Comparator.nullsLast(Comparator.naturalOrder()));
        } else if ("yearBuilt".equalsIgnoreCase(sortBy)) {
            comparator = Comparator.comparing(HouseRecord::getYearBuilt, Comparator.nullsLast(Comparator.naturalOrder()));
        } else if ("schoolRating".equalsIgnoreCase(sortBy)) {
            comparator = Comparator.comparing(HouseRecord::getSchoolRating, Comparator.nullsLast(Comparator.naturalOrder()));
        } else {
            comparator = Comparator.comparing(HouseRecord::getId, Comparator.nullsLast(Comparator.naturalOrder()));
        }
        if ("desc".equalsIgnoreCase(sortDirection)) {
            comparator = comparator.reversed();
        }
        return comparator;
    }

    private double round(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    /**
     * Local DTO for what-if responses.
     */
    public static class WhatIfResult {
        private final double predictedPrice;
        private final List<HouseRecord> comparables;

        public WhatIfResult(double predictedPrice, List<HouseRecord> comparables) {
            this.predictedPrice = predictedPrice;
            this.comparables = comparables;
        }

        public double getPredictedPrice() {
            return predictedPrice;
        }

        public List<HouseRecord> getComparables() {
            return comparables;
        }
    }
}
