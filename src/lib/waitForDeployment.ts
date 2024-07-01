import * as github from '@actions/github';

import { log } from '../utils/log';
import { PromiseValue } from '../utils/types';
import { waitForDeploymentCreate } from './waitForDeploymentCreate';
import { waitForDeploymentStatus } from './waitForDeploymentStatus';
import { waitForUrl } from './waitForUrl';

export interface IWaitForDeploymentOptions {
    octokit: ReturnType<typeof github.getOctokit>;
    owner: string;
    repo: string;
    sha: string;
    environment: string;
    actorName: string;
    maxTimeoutMs: number;
    checkIntervalMs: number;
    allowInactiveDeployment: boolean;
    path: string;
    vercelPassword?: string;
    application?: string;
}

export async function waitForDeployment(options: IWaitForDeploymentOptions) {
    // Get deployments associated with the pull request.
    let deployment: PromiseValue<ReturnType<typeof waitForDeploymentCreate>>;
    try {
        deployment = await waitForDeploymentCreate(options);
    } catch (err) {
        throw new Error(
            `Check failure: Failed to find a deployment for actor "${options.actorName}"`,
            { cause: err },
        );
    }

    let status: PromiseValue<ReturnType<typeof waitForDeploymentStatus>>;
    try {
        status = await waitForDeploymentStatus({
            ...options,
            deployment_id: deployment.id,
        });
    } catch (err) {
        throw new Error(
            `Check failure: Failed to find a deployment status for deployment "${deployment.id}"`,
            { cause: err },
        );
    }

    // Get target url
    const targetUrl = status?.target_url;

    if (!targetUrl) {
        throw new Error('Check failure: No `target_url` was found in the status check');
    }

    log(`Found target url » ${targetUrl}`);

    // Wait for url to respond with a success
    log(`Waiting for a status code 200 from: ${targetUrl}`);

    let urlCheckResult: PromiseValue<ReturnType<typeof waitForUrl>>;
    try {
        urlCheckResult = await waitForUrl({
            ...options,
            url: targetUrl,
        });
    } catch (err) {
        throw new Error(
            `Check failure: Failed to get a successful response from "${targetUrl}"`,
            { cause: err },
        );
    }

    return urlCheckResult;
}
