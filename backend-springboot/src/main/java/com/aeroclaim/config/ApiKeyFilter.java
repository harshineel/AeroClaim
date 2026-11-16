package com.aeroclaim.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Bearer-token check for machine-to-machine endpoints. The token equals the secret the Camunda connector runtime receives
 * ({{secrets.FLIGHT_API_KEY}} / {{secrets.PAYMENT_API_KEY}}), so no credential is ever stored in a BPMN file.
 */
public class ApiKeyFilter extends OncePerRequestFilter {
    private final AppProperties.Security security;

    public ApiKeyFilter(AppProperties.Security security) {
        this.security = security;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain) throws ServletException, IOException {
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
            chain.doFilter(req, res);
            return;
        }
        String expected = req.getRequestURI().startsWith("/api/oracle") ? security.flightApiKey() : security.paymentApiKey();
        String header = req.getHeader("Authorization");
        if (header == null || !header.equals("Bearer " + expected)) {
            res.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            res.setContentType("application/json");
            res.getWriter().write("{\"message\":\"Missing or invalid API key\"}");
            return;
        }
        chain.doFilter(req, res);
    }
}
