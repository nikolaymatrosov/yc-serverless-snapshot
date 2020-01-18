#!/bin/sh

npx tsc --build tsconfig.json

if [[ ! -e "build" ]]; then
    mkdir "build"
fi

cp package.json ./build/package.json
(
    cd build;
    npm install --arch=x64 --platform=linux --target=12.14.0 --production
)
npx tsc --build tsconfig.json
cp src/*.js ./build
rm build.zip || echo '';
(
    cd build;
    zip -r9 ../build.zip .
)

s3cmd put ./build.zip s3://$DEPLOY_BUCKET/build.zip \
  --access_key=$AWS_ACCESS_KEY_ID \
  --secret_key=$AWS_SECRET_ACCESS_KEY \
  --region=ru-central1 \
  --host=storage.yandexcloud.net \
  --host-bucket=\%\(bucket\)s.storage.yandexcloud.net

yc serverless function version create \
  --function-name=spawn-snapshot-tasks \
  --runtime nodejs12 \
  --entrypoint spawn-snapshot-tasks.handler \
  --memory 128m \
  --execution-timeout 30s \
  --package-bucket-name $DEPLOY_BUCKET \
  --package-object-name build.zip\
  --service-account-id $SERVICE_ACCOUNT_ID \
  --environment FOLDER_ID=$FOLDER_ID,MODE=$MODE,TTL=$TTL,\
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID,AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY,\
QUEUE_URL=$QUEUE_URL


yc serverless function version create \
  --function-name=snapshot-disks \
  --runtime nodejs12 \
  --entrypoint snapshot-disks.handler \
  --memory 128m \
  --execution-timeout 60s \
  --package-bucket-name $DEPLOY_BUCKET \
  --package-object-name build.zip\
  --service-account-id $SERVICE_ACCOUNT_ID \
  --environment TTL=$TTL

yc serverless function version create \
  --function-name=delete-expired-snapshots \
  --runtime nodejs12 \
  --entrypoint delete-expired-snapshots.handler \
  --memory 128m \
  --execution-timeout 60s \
  --package-bucket-name $DEPLOY_BUCKET \
  --package-object-name build.zip\
  --service-account-id $SERVICE_ACCOUNT_ID \
  --environment FOLDER_ID=$FOLDER_ID

