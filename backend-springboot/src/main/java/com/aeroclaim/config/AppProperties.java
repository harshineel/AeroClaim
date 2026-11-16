package com.aeroclaim.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "aeroclaim")
public record AppProperties(Security security, List<String> corsOrigins, String defaultSla) {
    public record Security(String flightApiKey, String paymentApiKey) {}
}
