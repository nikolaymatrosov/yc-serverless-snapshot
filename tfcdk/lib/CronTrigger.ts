import {FunctionResource} from '@yc/function-resource'
import {FunctionTrigger} from '@yc/function-trigger'
import {Construct} from "constructs";

export interface CronTriggerConfig {
    name: string;
    cron: string;
    func: FunctionResource;
    serviceAccountId: string;
}


export class CronTrigger extends Construct {
    constructor(scope: Construct, name: string, config: CronTriggerConfig) {
        super(scope, name);

        new FunctionTrigger(this, name, {
            function: {
                id: config.func.id,
                serviceAccountId: config.serviceAccountId
            },
            timer: {
                cronExpression: config.cron,
            },
            name: config.name
        })

    }
}
