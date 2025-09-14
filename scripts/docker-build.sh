#!/bin/bash

# Script de build et push Docker pour TeamMove
# Usage: ./scripts/docker-build.sh [tag]

set -e

# Configuration
DOCKER_USERNAME="lthebest"
IMAGE_NAME="TeamMove"
DEFAULT_TAG="latest"

# Utilise le tag passé en paramètre ou le tag par défaut
TAG=${1:-$DEFAULT_TAG}
FULL_IMAGE_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}:${TAG}"

echo "🏗️  Building Docker image for TeamMove..."
echo "📦 Image: ${FULL_IMAGE_NAME}"

# Build l'image
docker build -t ${FULL_IMAGE_NAME} .

echo "✅ Build completed successfully!"

# Demande de confirmation pour le push
read -p "🚀 Push to Docker Hub? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🔐 Logging in to Docker Hub..."
    docker login
    
    echo "📤 Pushing image to Docker Hub..."
    docker push ${FULL_IMAGE_NAME}
    
    echo "✅ Image pushed successfully!"
    echo "🌐 Pull command: docker pull ${FULL_IMAGE_NAME}"
else
    echo "⏸️  Skipping push to Docker Hub"
fi

# Afficher la taille de l'image
echo "📊 Image size:"
docker images ${FULL_IMAGE_NAME} --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}"

echo ""
echo "🎉 Docker build completed!"
echo "🚀 Run locally with: docker run -p 3000:3000 ${FULL_IMAGE_NAME}"