package com.aeroclaim.web;

import com.aeroclaim.dto.Dtos.TaskAssignRequest;
import com.aeroclaim.dto.Dtos.TaskCompleteRequest;
import com.aeroclaim.dto.Dtos.TaskView;
import com.aeroclaim.service.TaskService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Custom Tasklist API: wraps the Camunda user-task REST API so the browser never talks to the engine directly. */
@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskService tasks;

    public TaskController(TaskService tasks) {
        this.tasks = tasks;
    }

    @GetMapping
    public List<TaskView> list(@RequestParam(required = false) String group, @RequestParam(defaultValue = "CREATED") String state) {
        return tasks.list(group, state);
    }

    @GetMapping("/{key}")
    public TaskView get(@PathVariable String key) {
        return tasks.get(key);
    }

    @PostMapping("/{key}/assign")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void assign(@PathVariable String key, @Valid @RequestBody TaskAssignRequest body) {
        tasks.assign(key, body.assignee());
    }

    @PostMapping("/{key}/complete")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void complete(@PathVariable String key, @Valid @RequestBody TaskCompleteRequest body) {
        tasks.complete(key, body.variables(), body.assignee());
    }
}
