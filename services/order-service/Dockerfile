# ---- build ----
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
# Download dependencies first so this layer is cached between code changes.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B -q package -DskipTests

# ---- runtime ----
FROM eclipse-temurin:21-jre
RUN useradd --uid 10001 --no-create-home app
WORKDIR /app
COPY --from=build /build/target/order-service.jar app.jar
USER 10001
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
