package com.interview.market.model;

/**
 * Aggregate market statistics for a segment of properties.
 */
public class MarketStatistics {

    private long count;
    private double averagePrice;
    private double medianPrice;
    private double minPrice;
    private double maxPrice;
    private double averageSquareFootage;
    private double averageSchoolRating;

    public MarketStatistics() {
    }

    public MarketStatistics(long count, double averagePrice, double medianPrice,
                            double minPrice, double maxPrice,
                            double averageSquareFootage, double averageSchoolRating) {
        this.count = count;
        this.averagePrice = averagePrice;
        this.medianPrice = medianPrice;
        this.minPrice = minPrice;
        this.maxPrice = maxPrice;
        this.averageSquareFootage = averageSquareFootage;
        this.averageSchoolRating = averageSchoolRating;
    }

    public long getCount() {
        return count;
    }

    public void setCount(long count) {
        this.count = count;
    }

    public double getAveragePrice() {
        return averagePrice;
    }

    public void setAveragePrice(double averagePrice) {
        this.averagePrice = averagePrice;
    }

    public double getMedianPrice() {
        return medianPrice;
    }

    public void setMedianPrice(double medianPrice) {
        this.medianPrice = medianPrice;
    }

    public double getMinPrice() {
        return minPrice;
    }

    public void setMinPrice(double minPrice) {
        this.minPrice = minPrice;
    }

    public double getMaxPrice() {
        return maxPrice;
    }

    public void setMaxPrice(double maxPrice) {
        this.maxPrice = maxPrice;
    }

    public double getAverageSquareFootage() {
        return averageSquareFootage;
    }

    public void setAverageSquareFootage(double averageSquareFootage) {
        this.averageSquareFootage = averageSquareFootage;
    }

    public double getAverageSchoolRating() {
        return averageSchoolRating;
    }

    public void setAverageSchoolRating(double averageSchoolRating) {
        this.averageSchoolRating = averageSchoolRating;
    }
}
