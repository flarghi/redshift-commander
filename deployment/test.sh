#!/bin/bash

set -euo pipefail

# Configuration
DOCKER_HUB_IMAGE="flarghi/redshift-commander"
TAG="${TAG:-latest}"
IMAGE="${DOCKER_HUB_IMAGE}:${TAG}"
CONTAINER_NAME="redshift-commander-test"
HOST_PORT="${PORT:-8080}"

echo "=== Redshift Commander - Local Test ==="
echo "Image: ${IMAGE}"
echo "URL:   http://localhost:${HOST_PORT}"
echo ""

# Stop any existing test container
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "Stopping existing test container..."
    docker rm -f "${CONTAINER_NAME}" > /dev/null
fi

# Run the container locally (same config as ECS: port 80 inside)
echo "Starting container..."
docker run -d \
    --name "${CONTAINER_NAME}" \
    -p "${HOST_PORT}:80" \
    "${IMAGE}"

echo "Container started. Waiting for health..."

# Wait for the server to respond
MAX_RETRIES=15
for i in $(seq 1 ${MAX_RETRIES}); do
    if curl -sf "http://localhost:${HOST_PORT}" > /dev/null 2>&1; then
        echo ""
        echo "=== Server is up ==="
        echo "Open http://localhost:${HOST_PORT} to test"
        echo ""
        echo "When done, stop with:"
        echo "  docker rm -f ${CONTAINER_NAME}"
        exit 0
    fi
    printf "."
    sleep 2
done

echo ""
echo "Server did not respond after ${MAX_RETRIES} attempts."
echo "Logs:"
docker logs "${CONTAINER_NAME}"
docker rm -f "${CONTAINER_NAME}" > /dev/null
exit 1
