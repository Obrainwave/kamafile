# Qdrant Healthcheck Fix

## Issue
Qdrant container was failing healthcheck because `wget` was not available in the base Qdrant Docker image.

## Solution

### 1. Created Custom Qdrant Dockerfile
Created `Dockerfile.qdrant` that extends the base Qdrant image and installs `wget`:

```dockerfile
FROM qdrant/qdrant:v1.11.2

# Install wget for healthcheck
RUN apt-get update && \
    apt-get install -y wget && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

### 2. Updated docker-compose.yml
- Changed from `image: qdrant/qdrant:v1.11.2` to `build` with custom Dockerfile
- Updated healthcheck to use `CMD-SHELL` with proper pipe support:
  ```yaml
  healthcheck:
    test: ["CMD-SHELL", "wget -q -O - http://localhost:6333/healthz | grep -q 'healthz check passed' || exit 1"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 20s
  ```

## Healthcheck Details

- **Endpoint**: `/healthz`
- **Expected Response**: "healthz check passed" (200 OK)
- **Command**: `wget -q -O - http://localhost:6333/healthz | grep -q 'healthz check passed'`

## Verification

Check container health:
```bash
docker ps | grep qdrant
# Should show: (healthy)

docker inspect kamafile_qdrant --format='{{json .State.Health.Status}}'
# Should output: "healthy"
```

## Access Qdrant Web UI

Once healthy, access at:
- **Web UI**: http://localhost:6333/dashboard
- **REST API**: http://localhost:6333
- **gRPC**: http://localhost:6334
