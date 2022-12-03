import {FunctionResource} from '@yc/function-resource'
import {AssetType, TerraformAsset} from "cdktf";
import {Construct} from "constructs";
import * as fs from "fs";
import * as path from "path";

export const Node12Runtime: NodeRuntime = 'nodejs12';
export const Node14Runtime: NodeRuntime = 'nodejs14';
export const Node16Runtime: NodeRuntime = 'nodejs16';
// export const Node18Runtime: NodeRuntime = 'nodejs18';
export type NodeRuntime = 'nodejs12' | 'nodejs14' | 'nodejs16' | 'nodejs18';

export interface NodeFunctionConfig {
    entrypoint: string;
    name: string;
    path: string;
    memory?: number;
    runtime?: NodeRuntime;
    environment?: { [key: string]: string };
    executionTimeout?: string;
    serviceAccountId?: string;
}

const DefaultNodeFunctionConfig = {
    memory: 128,
    runtime: Node16Runtime,
}

function getAppRootDir() {
    let currentDir = __dirname
    while (!fs.existsSync(path.join(currentDir, 'package.json'))) {
        currentDir = path.join(currentDir, '..')
    }
    return currentDir
}

export class NodeFunction extends Construct {
    private readonly _function: FunctionResource;

    constructor(scope: Construct, name: string, config: NodeFunctionConfig) {
        super(scope, name);

        const asset = new TerraformAsset(this, `lambda-asset-${name}`, {
            path: path.resolve(getAppRootDir(), config.path),
            type: AssetType.ARCHIVE, // if left empty it infers directory and file
        })

        this._function = new FunctionResource(
            this,
            name,
            {
                ...config,
                runtime: config.runtime ?? DefaultNodeFunctionConfig.runtime,
                memory: config.memory ?? DefaultNodeFunctionConfig.memory,
                userHash: asset.assetHash,
                content: {
                    zipFilename: asset.path
                }
            }
        )
    }

    getFunction() {
        return this._function;
    }
}
