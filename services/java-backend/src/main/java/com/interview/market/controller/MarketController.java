package com.interview.market.controller;

import com.interview.market.model.FilterRequest;
import com.interview.market.model.HouseRecord;
import com.interview.market.model.MarketStatistics;
import com.interview.market.model.WhatIfRequest;
import com.interview.market.service.MarketAnalysisService;
import com.interview.market.service.PdfReportGenerator;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for the Property Market Analysis application.
 * Provides endpoints for statistics, filtering, what-if analysis, and exports.
 */
@RestController
@RequestMapping("/api/v1/market")
@CrossOrigin(origins = "*")
public class MarketController {

    private final MarketAnalysisService marketService;

    public MarketController(MarketAnalysisService marketService) {
        this.marketService = marketService;
    }

    /**
     * GET /api/v1/market/statistics
     * Returns aggregate statistics for the entire dataset.
     */
    @GetMapping("/statistics")
    public ResponseEntity<MarketStatistics> getStatistics() {
        return ResponseEntity.ok(marketService.getOverallStatistics());
    }

    /**
     * POST /api/v1/market/filter
     * Filters the dataset and optionally sorts the results.
     */
    @PostMapping("/filter")
    public ResponseEntity<List<HouseRecord>> filterRecords(@Valid @RequestBody FilterRequest request) {
        return ResponseEntity.ok(marketService.filterRecords(request));
    }

    /**
     * POST /api/v1/market/statistics/filtered
     * Returns aggregate statistics for a filtered segment.
     */
    @PostMapping("/statistics/filtered")
    public ResponseEntity<MarketStatistics> getFilteredStatistics(@Valid @RequestBody FilterRequest request) {
        return ResponseEntity.ok(marketService.getStatisticsForFilter(request));
    }

    /**
     * POST /api/v1/market/whatif
     * Runs a what-if analysis by predicting a hypothetical property price.
     */
    @PostMapping("/whatif")
    public ResponseEntity<WhatIfResponse> whatIf(@Valid @RequestBody WhatIfRequest request) {
        MarketAnalysisService.WhatIfResult result = marketService.runWhatIf(request);
        return ResponseEntity.ok(new WhatIfResponse(
                result.getPredictedPrice(),
                result.getComparables()
        ));
    }

    /**
     * GET /api/v1/market/export/csv
     * Exports the full dataset as a CSV file.
     */
    @GetMapping("/export/csv")
    public ResponseEntity<String> exportCsv() {
        List<HouseRecord> records = marketService.filterRecords(new FilterRequest());
        StringBuilder csv = new StringBuilder();
        csv.append("id,square_footage,bedrooms,bathrooms,year_built,lot_size,distance_to_city_center,school_rating,price\n");
        for (HouseRecord r : records) {
            csv.append(String.format("%d,%s,%s,%s,%d,%s,%s,%s,%s\n",
                    r.getId(),
                    r.getSquareFootage(),
                    r.getBedrooms(),
                    r.getBathrooms(),
                    r.getYearBuilt(),
                    r.getLotSize(),
                    r.getDistanceToCityCenter(),
                    r.getSchoolRating(),
                    r.getPrice()));
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=market_data.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.toString());
    }

    /**
     * GET /api/v1/market/export/pdf
     * Exports a simple PDF report of the market statistics.
     */
    @GetMapping("/export/pdf")
    public ResponseEntity<byte[]> exportPdf() {
        MarketStatistics stats = marketService.getOverallStatistics();
        byte[] pdfBytes = PdfReportGenerator.generate(stats);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=market_report.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    /**
     * Simple response DTO for the what-if endpoint.
     */
    public static class WhatIfResponse {
        private final double predictedPrice;
        private final List<HouseRecord> comparables;

        public WhatIfResponse(double predictedPrice, List<HouseRecord> comparables) {
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
