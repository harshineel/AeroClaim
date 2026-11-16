# ---- stage 1: build the jar (needs ../bpmn-models, so the build context is the repository root) ----
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /workspace
COPY backend-springboot/pom.xml backend-springboot/pom.xml
# Resolve dependencies first so this layer is cached until pom.xml changes
RUN mvn -q -f backend-springboot/pom.xml dependency:go-offline -DskipTests || true
COPY bpmn-models bpmn-models
COPY backend-springboot/src backend-springboot/src
RUN mvn -q -f backend-springboot/pom.xml package -DskipTests

# ---- stage 2: small runtime image, non-root ----
FROM eclipse-temurin:17-jre
WORKDIR /app
RUN useradd --system --uid 1001 aeroclaim
COPY --from=build /workspace/backend-springboot/target/parametric-claims-backend-1.0.0.jar app.jar
USER 1001
EXPOSE 8081
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
