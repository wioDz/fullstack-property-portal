package com.interview.market.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Configuration;

/**
 * Enables Spring's declarative caching abstraction.
 * Caffeine is configured in application.properties.
 */
@Configuration
@EnableCaching
public class CacheConfig {
}
