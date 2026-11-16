package com.aeroclaim;

import io.camunda.client.annotation.Deployment;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Entry point. The BPMN processes, the DMN decision table and the Camunda Forms from {@code bpmn-models/} are packaged
 * into the jar under {@code classpath:bpmn/} (see pom.xml) and deployed to the Camunda 8 cluster on start-up.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
@Deployment(resources = {"classpath*:bpmn/*.bpmn", "classpath*:bpmn/*.dmn", "classpath*:bpmn/*.form"})
public class ParametricClaimsApplication {
    public static void main(String[] args) {
        SpringApplication.run(ParametricClaimsApplication.class, args);
    }
}
