import {SnapshotService} from "yandex-cloud/api/compute/v1";
import {now} from "./time";

// Cloud id where snapshots will be created.
const FOLDER_ID = process.env.FOLDER_ID;

/**
 * Cron-function that deletes snapshots that have `expiration_ts` label if it's value is less than
 * now timestamp.
 *
 * @param event {Object} request payload.
 * @param context {Object} information about current execution context.
 *
 * @return {Promise<Object>} response to be serialized as JSON.
 */
export async function handler(event, context) {
    const snapshotService = new SnapshotService();

    const {snapshots} = await snapshotService.list({folderId: FOLDER_ID});

    const operations = [];
    for (const snapshot of snapshots) {
        const {expiration_ts} = snapshot.labels;
        if (expiration_ts && now() > parseInt(expiration_ts)) {
            operations.push(snapshotService.delete({snapshotId: snapshot.id}));
        }
    }
    const results = await Promise.all(operations);
    const errors = results.map(op => op.error).filter(x => x !== undefined && x !== null);
    if (errors.length) {
        throw Error(JSON.stringify(errors));
    }
    return results
}
