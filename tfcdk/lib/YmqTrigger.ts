import {FunctionResource} from '@yc/function-resource'
import {FunctionTrigger} from '@yc/function-trigger'
import {Construct} from "constructs";

export interface YmqTriggerConfig {
    name: string;
    queueId: string;
    func: FunctionResource;
    serviceAccountId: string;
}


export class YmqTrigger extends Construct {
    constructor(scope: Construct, name: string, config: YmqTriggerConfig) {
        super(scope, name);

        new FunctionTrigger(this, name, {
            function: {
                id: config.func.id,
                serviceAccountId: config.serviceAccountId
            },
            messageQueue: {
                batchCutoff: '10',
                batchSize: '10',
                serviceAccountId: config.serviceAccountId,
                queueId: config.queueId,
            },
            name: config.name
        })

    }
}
