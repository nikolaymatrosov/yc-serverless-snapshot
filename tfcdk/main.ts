import {App, TerraformStack} from "cdktf";
import {Construct} from "constructs";
import * as fs from "fs";
import {IamServiceAccount} from "@yc/iam-service-account"
import {IamServiceAccountStaticAccessKey} from "@yc/iam-service-account-static-access-key";
import {MessageQueue} from "@yc/message-queue"
import {YandexProvider} from "@yc/provider"
import {ResourcemanagerFolderIamBinding} from "@yc/resourcemanager-folder-iam-binding";
import {CronTrigger} from "./lib/CronTrigger";
import {NodeFunction} from "./lib/NodeFunction";
import {YmqTrigger} from "./lib/YmqTrigger";

const folderId = process.env.FOLDER_ID as string;

class MyStack extends TerraformStack {
    constructor(scope: Construct, id: string) {
        super(scope, id);

        new YandexProvider(this, 'provider', {
            folderId,
            serviceAccountKeyFile: fs.readFileSync('../key.json').toString()
        })

        const qSA = new IamServiceAccount(this, "q-creator", {name: "q-creator"});

        const qBinding = new ResourcemanagerFolderIamBinding(this, "queue-admin", {
            members: [`serviceAccount:${qSA.id}`],
            folderId,
            role: 'editor',
            sleepAfter: 15,
        })

        const qSaKey = new IamServiceAccountStaticAccessKey(this, "q-creator-key", {serviceAccountId: qSA.id})

        const q = new MessageQueue(this, "snapshot-queue", {
            accessKey: qSaKey.accessKey,
            secretKey: qSaKey.secretKey,
            dependsOn: [qBinding]
        })

        const sa = new IamServiceAccount(this, "sls-cron", {name: "sls-cron"});

        const roles = [
            "serverless.functions.invoker",
            "ymq.reader",
            "compute.admin",
        ]
        roles.forEach((role, index) => {
            new ResourcemanagerFolderIamBinding(this, `sa-roles-${index}`, {
                members: [`serviceAccount:${sa.id}`],
                folderId,
                role
            });
        });

        const spawnFunction = new NodeFunction(
            this,
            "spawn-snapshot-tasks",
            {
                entrypoint: "spawn-snapshot-tasks.handler",
                name: "spawn-snapshot-tasks",
                path: "../build",
                executionTimeout: "60",
                serviceAccountId: sa.id,
                environment: {
                    FOLDER_ID: folderId,
                    MODE: 'all',
                    TTL: `${60 * 60 * 24 * 7}`,
                    AWS_ACCESS_KEY_ID: qSaKey.accessKey,
                    AWS_SECRET_ACCESS_KEY: qSaKey.secretKey,
                    QUEUE_URL: q.id
                }
            }
        )

        const snapshotFunction = new NodeFunction(
            this,
            "snapshot-disks",
            {
                entrypoint: "snapshot-disks.handler",
                name: "snapshot-disks",
                path: "../build",
                executionTimeout: "60",
                serviceAccountId: sa.id,
                environment: {
                    TTL: `${60 * 60 * 24 * 7}`,
                }
            }
        )

        const deleteExpiredFunction = new NodeFunction(
            this,
            "delete-expired-snapshots",
            {
                entrypoint: "delete-expired-snapshots.handler",
                name: "delete-expired-snapshots",
                path: "../build",
                executionTimeout: "60",
                serviceAccountId: sa.id,
                environment: {
                    FOLDER_ID: folderId,
                }
            }
        )

        new CronTrigger(this, "spawn-trigger", {
            cron: "* * ? * * *",
            func: spawnFunction.getFunction(),
            name: "spawn-trigger",
            serviceAccountId: sa.id,
        })


        new CronTrigger(this, "delete-trigger", {
            cron: "* * ? * * *",
            func: deleteExpiredFunction.getFunction(),
            name: "delete-trigger",
            serviceAccountId: sa.id,
        })

        new YmqTrigger(this, "snapshot-trigger", {
            queueId: q.arn,
            func: snapshotFunction.getFunction(),
            name: "snapshot-trigger",
            serviceAccountId: sa.id
        })
    }
}

const app = new App();
new MyStack(app, "sls-snapshot");
app.synth();
