# ---- build ----
FROM golang:1.24-alpine AS build
WORKDIR /src
COPY . .
# 'tidy' writes go.sum on the first build. Running `make test-payment` saves it to the repo; commit it.
RUN go mod tidy && go mod download
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/payment-service ./cmd/payment-service

# ---- runtime: distroless, non-root, no shell ----
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/payment-service /payment-service
EXPOSE 8083
ENTRYPOINT ["/payment-service"]
