import {SnapshotService} from "yandex-cloud/api/compute/v1";
import {CreateSnapshotParams} from "./interfaces";
import {now} from "./time";
import {MessageQueueEvent} from "./MessageQueueEvent";

// TTL for snapshot. Other function will delete expired snapshot that have `expiration_ts` gt now.
const TTL = process.env.TTL;


/**
 * Entry-point function.
 *
 * @param event {MessageQueueEvent} request payload.
 * @param context {Object} information about current execution context.
 *
 * @return {Promise<Object>} response to be serialized as JSON.
 */
export async function handler(event: MessageQueueEvent, context) {
    const snapshotService = new SnapshotService();
    const expiration_ts = String(now() + parseInt(TTL));
    console.log(JSON.stringify(event));
    const {details: {message: {body}}} = event.messages[0];

    const {folderId, diskId} = JSON.parse(body) as CreateSnapshotParams;

    const operation = await snapshotService.create({
        folderId,
        diskId,
        labels: {
            expiration_ts
        }
    });

    if (operation.error) {
        throw Error(operation.error?.message);
    }
}
