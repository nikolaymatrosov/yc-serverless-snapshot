import {DiskService} from "yandex-cloud/api/compute/v1";
import {CreateSnapshotParams} from "./interfaces";
import * as AWS from "aws-sdk";

// Cloud id where snapshots will be created.
const FOLDER_ID = process.env.FOLDER_ID;
// If MODE is equal to 'only-marked' olny disks with `snapshot` label will be snapshoot.
const MODE = process.env.MODE;
const QUEUE_URL = process.env.QUEUE_URL;


// Create an SQS service object
const sqs = new AWS.SQS({
    region: "ru-central1",
    endpoint: "https://message-queue.api.cloud.yandex.net"
});


function constructDiskMessage(data: CreateSnapshotParams): AWS.SQS.SendMessageRequest {
    return {
        MessageBody: JSON.stringify(data),
        QueueUrl: QUEUE_URL
    }
}

function messageSendResultHandler(err, data) {
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
export async function handler(event, context): Promise<void> {
    const diskService = new DiskService();
    const onlyMarked = MODE === 'only-marked';

    const disks = (await diskService.list({folderId: FOLDER_ID})).disks;

    disks.forEach(disk => {
        if (!('snapshot' in disk.labels) && onlyMarked) {
            return;
        }
        const params = constructDiskMessage({
            folderId: FOLDER_ID,
            diskId: disk.id
        });
        console.log(params);
        sqs.sendMessage(params, messageSendResultHandler);
    });

}
