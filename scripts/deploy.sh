#!/bin/sh

npx tsc --build tsconfig.json
cp package.json ./build

yc serverless function version create \
  --function-name=spawn-snapshot-tasks \
  --runtime nodejs16 \
  --entrypoint spawn-snapshot-tasks.handler \
  --memory 128m \
  --execution-timeout 30s \
  --source-path ./build\
  --service-account-id $SERVICE_ACCOUNT_ID \
  --environment FOLDER_ID=$FOLDER_ID,MODE=$MODE,TTL=$TTL,\
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY,\
QUEUE_URL=$QUEUE_URL


yc serverless function version create \
  --function-name=snapshot-disks \
  --runtime nodejs16 \
  --entrypoint snapshot-disks.handler \
  --memory 128m \
  --execution-timeout 60s \
  --source-path ./build\
  --service-account-id $SERVICE_ACCOUNT_ID \
  --environment TTL=$TTL

yc serverless function version create \
  --function-name=delete-expired-snapshots \
  --runtime nodejs16 \
  --entrypoint delete-expired-snapshots.handler \
  --memory 128m \
  --execution-timeout 60s \
  --source-path ./build\
  --service-account-id $SERVICE_ACCOUNT_ID \
  --environment FOLDER_ID=$FOLDER_ID

