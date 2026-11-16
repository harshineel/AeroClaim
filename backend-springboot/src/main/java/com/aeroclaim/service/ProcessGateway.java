package com.aeroclaim.service;

import io.camunda.client.CamundaClient;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.*;

/**
 * Only class that talks to the Camunda 8 engine from the web layer: starting instances through the Camunda Java client,
 * and user-task / element-instance / process-instance / incident queries through the Orchestration Cluster REST API (/v2).
 */
@Service
public class ProcessGateway {
    private static final Logger log = LoggerFactory.getLogger(ProcessGateway.class);
    private static final ParameterizedTypeReference<Map<String, Object>> MAP = new ParameterizedTypeReference<>() {};

    private final CamundaClient client;
    private final RestClient rest;

    public ProcessGateway(CamundaClient client, RestClient camundaRestClient) {
        this.client = client;
        this.rest = camundaRestClient;
    }

    public long startProcess(String bpmnProcessId, Map<String, Object> variables) {
        return client.newCreateInstanceCommand().bpmnProcessId(bpmnProcessId).latestVersion().variables(variables).send().join().getProcessInstanceKey();
    }

    public List<Map<String, Object>> searchUserTasks(String candidateGroup, String state) {
        Map<String, Object> filter = new LinkedHashMap<>();
        filter.put("state", state == null || state.isBlank() ? "CREATED" : state);
        if (candidateGroup != null && !candidateGroup.isBlank()) filter.put("candidateGroup", candidateGroup);
        return items(post("/v2/user-tasks/search", Map.of("filter", filter, "page", Map.of("limit", 100))));
    }

    public Map<String, Object> getUserTask(String key) {
        return rest.get().uri("/v2/user-tasks/{key}", key).retrieve().body(MAP);
    }

    public void assignUserTask(String key, String assignee) {
        rest.post().uri("/v2/user-tasks/{key}/assignment", key).contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("assignee", assignee, "allowOverride", true)).retrieve().toBodilessEntity();
    }

    public void completeUserTask(String key, Map<String, Object> variables) {
        rest.post().uri("/v2/user-tasks/{key}/completion", key).contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("variables", variables == null ? Map.of() : variables)).retrieve().toBodilessEntity();
    }

    public Map<String, Object> getProcessInstance(String key) {
        return rest.get().uri("/v2/process-instances/{key}", key).retrieve().body(MAP);
    }

    public List<Map<String, Object>> searchElementInstances(String processInstanceKey) {
        return items(post("/v2/element-instances/search", Map.of("filter", Map.of("processInstanceKey", processInstanceKey), "page", Map.of("limit", 500))));
    }

    public List<Map<String, Object>> searchChildInstances(String parentKey) {
        return items(post("/v2/process-instances/search", Map.of("filter", Map.of("parentProcessInstanceKey", parentKey), "page", Map.of("limit", 100))));
    }

    public List<Map<String, Object>> searchIncidents(String processInstanceKey) {
        return items(post("/v2/process-instances/" + processInstanceKey + "/incidents/search", Map.of("page", Map.of("limit", 50))));
    }

    private Map<String, Object> post(String uri, Object body) {
        return rest.post().uri(uri).contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(MAP);
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, Object>> items(Map<String, Object> response) {
        if (response == null || !(response.get("items") instanceof List<?> l)) return List.of();
        return (List<Map<String, Object>>) l;
    }

    public static Instant instant(Object iso) {
        if (iso == null) return null;
        try {
            return OffsetDateTime.parse(iso.toString()).toInstant();
        } catch (RuntimeException e) {
            log.debug("Unparseable timestamp {}", iso);
            return null;
        }
    }
}
