package com.aeroclaim.service;

import com.aeroclaim.dto.Dtos.ClaimView;
import com.aeroclaim.dto.Dtos.TaskView;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/** Backs the custom Tasklist inbox: Camunda user tasks enriched with the claim they belong to. */
@Service
public class TaskService {
    private final ProcessGateway gateway;
    private final ClaimService claims;
    private final EventLogService log;

    public TaskService(ProcessGateway gateway, ClaimService claims, EventLogService log) {
        this.gateway = gateway;
        this.claims = claims;
        this.log = log;
    }

    public List<TaskView> list(String group, String state) {
        return gateway.searchUserTasks(group, state).stream().map(this::toView).toList();
    }

    public TaskView get(String key) {
        return toView(gateway.getUserTask(key));
    }

    public void assign(String key, String assignee) {
        gateway.assignUserTask(key, assignee);
        TaskView t = get(key);
        log.log(t.claimId(), "HUMAN", "TASK_ASSIGNED", "'" + t.name() + "' assigned to " + assignee);
    }

    public void complete(String key, Map<String, Object> variables, String assignee) {
        TaskView t = get(key);
        if (assignee != null && !assignee.isBlank()) gateway.assignUserTask(key, assignee);
        gateway.completeUserTask(key, variables);
        Object d = variables.get("decision") != null ? variables.get("decision") : variables.getOrDefault("resolution", "done");
        log.log(t.claimId(), "HUMAN", "TASK_COMPLETED", "'" + t.name() + "' completed by " + (assignee == null ? "user" : assignee) + " - " + d);
    }

    @SuppressWarnings("unchecked")
    private TaskView toView(Map<String, Object> m) {
        String piKey = str(m.get("processInstanceKey"));
        ClaimView claim = piKey == null ? null : claims.findByProcessInstanceKey(piKey).orElse(null);
        List<String> groups = m.get("candidateGroups") instanceof List<?> l ? (List<String>) l : List.of();
        String name = str(m.get("name")) != null ? str(m.get("name")) : str(m.get("elementId"));
        return new TaskView(str(m.get("userTaskKey")), name, str(m.get("elementId")), str(m.get("state")), str(m.get("assignee")), groups,
                ProcessGateway.instant(m.get("creationDate")), piKey, claim == null ? null : claim.claimId(), claim);
    }

    private static String str(Object o) {
        return o == null ? null : o.toString();
    }
}
