#!/bin/bash

set -euo pipefail

# Configuration
AWS_REGION="eu-central-1"
ECS_CLUSTER="prod-ecs-cluster"
ECS_SERVICE="sv-redshift-commander"
TASK_FAMILY="td-redshift-commander"
CONTAINER_NAME="main"
DOCKER_HUB_IMAGE="flarghi/redshift-commander"
TAG="${TAG:-latest}"
IMAGE="${DOCKER_HUB_IMAGE}:${TAG}"

echo "=== Redshift Commander - ECS Deploy ==="
echo "Image:   ${IMAGE}"
echo "Cluster: ${ECS_CLUSTER}"
echo "Service: ${ECS_SERVICE}"
echo ""

# 1. Get the current task definition as a base
echo "Fetching current task definition..."
CURRENT_TD=$(aws ecs describe-task-definition \
    --task-definition "${TASK_FAMILY}" \
    --region "${AWS_REGION}" \
    --query 'taskDefinition' \
    --output json)

# 2. Build a new task definition JSON with the updated image tag
echo "Registering new task definition with image: ${IMAGE}..."
NEW_TD=$(echo "${CURRENT_TD}" | jq \
    --arg IMAGE "${IMAGE}" \
    --arg CONTAINER "${CONTAINER_NAME}" \
    'del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .compatibilities, .registeredAt, .registeredBy, .enableFaultInjection)
     | .containerDefinitions |= map(if .name == $CONTAINER then .image = $IMAGE else . end)')

NEW_TD_ARN=$(aws ecs register-task-definition \
    --region "${AWS_REGION}" \
    --cli-input-json "${NEW_TD}" \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

echo "New task definition: ${NEW_TD_ARN}"

# 3. Update the ECS service to use the new task definition
echo "Updating ECS service..."
aws ecs update-service \
    --cluster "${ECS_CLUSTER}" \
    --service "${ECS_SERVICE}" \
    --task-definition "${NEW_TD_ARN}" \
    --force-new-deployment \
    --region "${AWS_REGION}" \
    --query 'service.deployments[0].{status:status,desired:desiredCount,running:runningCount}' \
    --output table

# 4. Wait for deployment to stabilize
echo ""
echo "Waiting for deployment to stabilize (this may take a few minutes)..."
aws ecs wait services-stable \
    --cluster "${ECS_CLUSTER}" \
    --services "${ECS_SERVICE}" \
    --region "${AWS_REGION}"

echo ""
echo "=== Deploy complete ==="
echo "Task definition: ${NEW_TD_ARN}"
echo "Image deployed:  ${IMAGE}"
