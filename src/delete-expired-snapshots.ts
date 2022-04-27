import {cloudApi, serviceClients, Session} from "@yandex-cloud/nodejs-sdk";
import {now} from "./time";

// Cloud id where snapshots will be created.
const FOLDER_ID = process.env.FOLDER_ID;

const {compute: {snapshot_service: {ListSnapshotsRequest, DeleteSnapshotRequest}}} = cloudApi;

/**
 * Cron-function that deletes snapshots that have `expiration_ts` label if it's value is less than
 * now timestamp.
 *
 * @param event {Object} request payload.
 * @param context {Object} information about current execution context.
 *
 * @return {Promise<Object>} response to be serialized as JSON.
 */
export async function handler(event: any, context: any) {
    const session = new Session();
    const snapshotClient = session.client(serviceClients.SnapshotServiceClient);

    const snapshotsListResponse = await snapshotClient.list(ListSnapshotsRequest.fromPartial({folderId: FOLDER_ID}));
    let {snapshots, nextPageToken} = snapshotsListResponse;
    while (snapshots.length > 0) {
        for (const snapshot of snapshots) {
            const {expiration_ts} = snapshot.labels;
            if (expiration_ts && now() > parseInt(expiration_ts, 10)) {
                snapshotClient.delete(DeleteSnapshotRequest.fromPartial({snapshotId: snapshot.id}));
            }
        }
        if (nextPageToken) {
            const snapshotsListResponse = await snapshotClient.list(
                ListSnapshotsRequest.fromPartial({
                    folderId: FOLDER_ID,
                    pageToken: nextPageToken
                }));
            snapshots = snapshotsListResponse.snapshots;
            nextPageToken = snapshotsListResponse.nextPageToken;
        } else {
            break;
        }
    }
}
