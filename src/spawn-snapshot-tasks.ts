import * as AWS from "aws-sdk";
import {SQS} from "aws-sdk";
import {AWSError} from "aws-sdk/lib/error";
import {cloudApi, serviceClients, Session} from "yandex-cloud";

import {CreateSnapshotParams} from "./interfaces";

const {compute: {disk_service: {ListDisksRequest}}} = cloudApi;

// Cloud id where snapshots will be created.
const FOLDER_ID = process.env.FOLDER_ID ?? "";
// If MODE is equal to 'only-marked' only disks with `snapshot` label will be snapshot.
const MODE = process.env.MODE ?? "";
const QUEUE_URL = process.env.QUEUE_URL ?? "";
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID ?? "";
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY ?? "";


// Create an SQS service object
const sqs = new AWS.SQS({
    region: "ru-central1",
    endpoint: "https://message-queue.api.cloud.yandex.net",
    credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
    }
});


function constructDiskMessage(data: CreateSnapshotParams): AWS.SQS.SendMessageRequest {
    return {
        MessageBody: JSON.stringify(data),
        QueueUrl: QUEUE_URL
    }
}

function messageSendResultHandler(err: AWSError, data: SQS.Types.SendMessageResult) {
    if (err) {
        console.log("Error", err);
    } else {
        console.log("Success", data.MessageId);
    }
}


/**
 * Function for spawning snapshot tasks to Message Queue.
 *
 * @param event {Object} request payload.
 * @param context {Object} information about current execution context.
 *
 * @return {Promise<void>} response to be serialized as JSON.
 */
export async function handler(event: any, context: any): Promise<void> {
    const session = new Session();
    const diskClient = session.client(serviceClients.DiskServiceClient);
    const onlyMarked = MODE === 'only-marked';

    let disksListResponse = await diskClient.list(ListDisksRequest.fromPartial({folderId: FOLDER_ID}));
    let {disks, nextPageToken} = disksListResponse;
    console.log(`disks.length ${disks.length}`)
    while (disks.length > 0) {
        console.log(`disks.length ${disks.length}`)
        disks.forEach(disk => {
            console.log(`disk ${JSON.stringify(disk)}`)
            if (!('snapshot' in disk.labels) && onlyMarked) {
                return;
            }
            const params = constructDiskMessage({
                folderId: FOLDER_ID,
                diskId: disk.id,
                diskName: disk.name,
            });
            console.log(params);
            sqs.sendMessage(params, messageSendResultHandler);
        });
        if (nextPageToken) {
            let disksListResponse = await diskClient.list(ListDisksRequest.fromPartial({
                folderId: FOLDER_ID,
                pageToken: nextPageToken
            }));
            disks = disksListResponse.disks;
            nextPageToken = disksListResponse.nextPageToken;
        } else {
            break;
        }
    }
}
