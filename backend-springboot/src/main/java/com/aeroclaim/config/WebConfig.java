package com.aeroclaim.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final AppProperties props;

    public WebConfig(AppProperties props) {
        this.props = props;
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(props.corsOrigins().toArray(new String[0]))
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }

    /** Protects the endpoints that Camunda's REST connector calls (flight data provider + payment gateway). */
    @Bean
    public FilterRegistrationBean<ApiKeyFilter> apiKeyFilter() {
        FilterRegistrationBean<ApiKeyFilter> reg = new FilterRegistrationBean<>(new ApiKeyFilter(props.security()));
        reg.addUrlPatterns("/api/oracle/*", "/api/payments", "/api/payments/*");
        return reg;
    }

    /** Client for the Camunda 8 Orchestration Cluster REST API (/v2). */
    @Bean
    public RestClient camundaRestClient(@Value("${camunda.client.rest-address}") String restAddress) {
        return RestClient.builder().baseUrl(restAddress).build();
    }
}
