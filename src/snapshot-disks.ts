import {cloudApi, serviceClients, Session} from "@yandex-cloud/nodejs-sdk";
import {CreateSnapshotParams} from "./interfaces";
import {MessageQueueEvent} from "./MessageQueueEvent";
import {now} from "./time";

// TTL for snapshot. Other function will delete expired snapshot that have `expiration_ts` gt now.
// Default 1 day
const TTL = process.env.TTL ?? "86400";


const {compute: {snapshot_service: {CreateSnapshotRequest}}} = cloudApi;

/**
 * Entry-point function.
 *
 * @param event {MessageQueueEvent} request payload.
 * @param context {Object} information about current execution context.
 *
 * @return {Promise<Object>} response to be serialized as JSON.
 */
export async function handler(event: MessageQueueEvent, context: any) {
    const session = new Session();
    const snapshotClient = session.client(serviceClients.SnapshotServiceClient);

    const expirationTs = String(now() + parseInt(TTL, 10));

    const {details: {message: {body}}} = event.messages[0];

    const {folderId, diskId, diskName} = JSON.parse(body) as CreateSnapshotParams;

    // Генерируем Name для снепшота
    // Значение не может быть длиннее 63 символов
    const name = `snapshot-${expirationTs}-${diskName || diskId}`.slice(0, 63);
    console.log(name)

    // Генерируем Description для снепшота
    const date = new Date(parseInt(expirationTs, 10) * 1000);
    const description = `Expiration:  ${date.toISOString()}`

    const operation = await snapshotClient.create(
        CreateSnapshotRequest.fromPartial({
            folderId,
            diskId,
            name,
            description,
            labels: {
                expiration_ts: expirationTs
            }
        })
    );

    if (operation.error) {
        throw Error(operation.error?.message);
    }
}
