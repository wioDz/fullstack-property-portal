package com.interview.market.repository;

import com.interview.market.model.HouseRecord;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Repository;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.*;

/**
 * Repository that loads the housing dataset from a CSV file into memory.
 * Uses a simple manual parser to avoid third-party CSV library quirks.
 */
@Repository
public class CsvHouseRepository {

    private static final Logger logger = LoggerFactory.getLogger(CsvHouseRepository.class);

    @Value("${data.csv.path}")
    private String csvPath;

    private List<HouseRecord> records = Collections.emptyList();

    /**
     * Load the CSV once when the Spring context starts.
     */
    @PostConstruct
    public void init() {
        logger.info("Loading housing data from {}", csvPath);
        try (BufferedReader reader = new BufferedReader(new FileReader(csvPath))) {
            String headerLine = reader.readLine();
            if (headerLine == null) {
                throw new IllegalStateException("CSV file is empty: " + csvPath);
            }

            // Strip a leading UTF-8 BOM (﻿) if present so the first header matches.
            if (headerLine.length() > 0 && headerLine.charAt(0) == '﻿') {
                headerLine = headerLine.substring(1);
            }

            String[] headers = headerLine.split(",");
            Map<String, Integer> indexByHeader = new HashMap<>();
            for (int i = 0; i < headers.length; i++) {
                indexByHeader.put(headers[i].trim().toLowerCase(), i);
            }

            List<HouseRecord> loaded = new ArrayList<>();
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.trim().isEmpty()) continue;
                String[] values = line.split(",");
                HouseRecord record = mapRow(values, indexByHeader);
                loaded.add(record);
            }
            this.records = Collections.unmodifiableList(loaded);
            logger.info("Loaded {} house records", records.size());
        } catch (IOException e) {
            logger.error("Failed to load housing CSV from {}", csvPath, e);
            throw new IllegalStateException("Could not load housing dataset", e);
        }
    }

    private HouseRecord mapRow(String[] values, Map<String, Integer> indexByHeader) {
        HouseRecord r = new HouseRecord();
        r.setId(getInt(values, indexByHeader.get("id")));
        r.setSquareFootage(getDouble(values, indexByHeader.get("square_footage")));
        r.setBedrooms(getDouble(values, indexByHeader.get("bedrooms")));
        r.setBathrooms(getDouble(values, indexByHeader.get("bathrooms")));
        r.setYearBuilt(getInt(values, indexByHeader.get("year_built")));
        r.setLotSize(getDouble(values, indexByHeader.get("lot_size")));
        r.setDistanceToCityCenter(getDouble(values, indexByHeader.get("distance_to_city_center")));
        r.setSchoolRating(getDouble(values, indexByHeader.get("school_rating")));
        r.setPrice(getDouble(values, indexByHeader.get("price")));
        return r;
    }

    private Integer getInt(String[] values, Integer index) {
        if (index == null || index >= values.length) return null;
        String value = values[index].trim();
        return value.isEmpty() ? null : Integer.parseInt(value);
    }

    private Double getDouble(String[] values, Integer index) {
        if (index == null || index >= values.length) return null;
        String value = values[index].trim();
        return value.isEmpty() ? null : Double.parseDouble(value);
    }

    /**
     * Return all loaded records.
     */
    public List<HouseRecord> findAll() {
        return records;
    }
}
