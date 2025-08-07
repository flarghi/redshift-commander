#!/bin/bash

set -euo pipefail

# Configuration
DOCKER_HUB_USERNAME="flarghi"
IMAGE_NAME="redshift-commander"
TAG="${TAG:-latest}"
FULL_IMAGE_NAME="${DOCKER_HUB_USERNAME}/${IMAGE_NAME}"

echo "🚀 Building and pushing multi-architecture Docker image: ${FULL_IMAGE_NAME}:${TAG}"

# Ensure buildx is available and create/use multiarch builder
BUILDER_NAME="multiarch-$(date +%s)"
echo "📦 Creating multiarch builder: ${BUILDER_NAME}..."
docker buildx create --name "${BUILDER_NAME}" --driver docker-container --use
docker buildx inspect --bootstrap

# Check if logged into Docker Hub
echo "🔐 Checking Docker Hub authentication..."
if ! docker system info --format '{{.RegistryConfig.IndexConfigs}}' | grep -q "docker.io"; then
    echo "⚠️  Not logged into Docker Hub. Please run: docker login"
    echo "ℹ️  If you are logged in, you can skip this check by setting SKIP_LOGIN_CHECK=1"
    if [ "${SKIP_LOGIN_CHECK:-0}" != "1" ]; then
        exit 1
    fi
else
    echo "✅ Docker Hub authentication confirmed"
fi

# Build and push for both ARM64 and AMD64 architectures
echo "🔨 Building and pushing for linux/amd64,linux/arm64..."
docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --tag "${FULL_IMAGE_NAME}:${TAG}" \
    --tag "${FULL_IMAGE_NAME}:latest" \
    --load \
    --push \
    .

echo "✅ Multi-architecture build and push completed successfully!"
echo "📋 Pushed image: ${FULL_IMAGE_NAME}:${TAG}"
echo "📋 Pushed image: ${FULL_IMAGE_NAME}:latest"
echo ""
echo "🐳 To run the container:"
echo "   docker run -p 80:80 ${FULL_IMAGE_NAME}:${TAG}"
echo ""
echo "🔗 Docker Hub URL:"
echo "   https://hub.docker.com/r/${DOCKER_HUB_USERNAME}/${IMAGE_NAME}"