# Dockerfile for the Property Market Analysis Java backend (App 2).
# Multi-stage build keeps the final image small.

# Stage 1: Build the application with Maven.
FROM maven:3.9-eclipse-temurin-21-alpine AS builder

WORKDIR /build

# Copy only the pom.xml first to cache dependencies.
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copy source and package the application.
COPY src ./src
RUN mvn clean package -DskipTests -B

# Stage 2: Run the application with a slim JRE.
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

# Install curl for the Docker healthcheck.
RUN apk add --no-cache curl

# Copy the packaged jar from the builder stage.
COPY --from=builder /build/target/*.jar app.jar

# Create directory for the CSV data mount.
RUN mkdir -p /app/data

ENV DATA_PATH=/app/data/housing_train.csv
ENV ML_SERVICE_URL=http://ml-service:8001

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
