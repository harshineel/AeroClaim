package com.aeroclaim.web;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> validation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (FieldError fe : ex.getBindingResult().getFieldErrors()) errors.put(fe.getField(), fe.getDefaultMessage());
        return ResponseEntity.badRequest().body(Map.of("message", "Validation failed", "errors", errors));
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, Object>> notFound(NoSuchElementException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> status(ResponseStatusException ex) {
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("message", ex.getReason() == null ? "Error" : ex.getReason()));
    }

    /** The Camunda REST API answered with an error (e.g. 404 for an already completed task). */
    @ExceptionHandler(RestClientResponseException.class)
    public ResponseEntity<Map<String, Object>> engineError(RestClientResponseException ex) {
        log.warn("Camunda API error {}: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
        int code = ex.getStatusCode().value();
        HttpStatus status = code == 404 ? HttpStatus.NOT_FOUND : code == 409 ? HttpStatus.CONFLICT : HttpStatus.BAD_GATEWAY;
        return ResponseEntity.status(status).body(Map.of("message", "Workflow engine: " + ex.getStatusText(), "detail", ex.getResponseBodyAsString()));
    }

    @ExceptionHandler({RestClientException.class, io.camunda.client.api.command.ClientException.class})
    public ResponseEntity<Map<String, Object>> engineDown(Exception ex) {
        log.error("Workflow engine unreachable", ex);
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of("message", "Workflow engine (Camunda 8) is not reachable", "detail", String.valueOf(ex.getMessage())));
    }
}
