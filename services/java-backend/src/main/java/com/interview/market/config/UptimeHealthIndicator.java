package com.interview.market.config;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;

import java.lang.management.ManagementFactory;
import java.time.Instant;

/**
 * Adds service uptime details to /actuator/health.
 */
@Component("uptime")
public class UptimeHealthIndicator implements HealthIndicator {

    private final long startedAtMillis = ManagementFactory.getRuntimeMXBean().getStartTime();

    @Override
    public Health health() {
        long uptimeMillis = Math.max(0, System.currentTimeMillis() - startedAtMillis);

        return Health.up()
                .withDetail("uptimeSeconds", Math.round(uptimeMillis / 1000.0 * 1000.0) / 1000.0)
                .withDetail("uptimeMillis", uptimeMillis)
                .withDetail("startedAt", Instant.ofEpochMilli(startedAtMillis).toString())
                .build();
    }
}
