import { getRetryCount } from '../utils/getRetryCount';
import { log, logError } from '../utils/log';
import { Deployment, Octokit } from '../utils/types';
import { wait } from '../utils/wait';

export interface IWaitForDeploymentCreateOptions {
    octokit: Octokit;
    owner: string;
    repo: string;
    sha: string;
    environment: string;
    actorName: string;
    maxTimeoutMs: number;
    checkIntervalMs: number;
    application?: string;
}

async function getDeployment({
    octokit,
    owner,
    repo,
    sha,
    environment,
    actorName,
    application,
}: Pick<
    IWaitForDeploymentCreateOptions,
    'octokit' | 'owner' | 'repo' | 'sha' | 'environment' | 'actorName' | 'application'
>): Promise<Deployment | undefined> {
    let finalEnvironment = environment;
    if (application) {
        finalEnvironment = `${environment} – ${application}`;
    }

    const deployments = await octokit.rest.repos.listDeployments({
        owner,
        repo,
        sha,
        environment: finalEnvironment,
    });

    return deployments?.data?.find((d) => {
        return d.creator?.login === actorName;
    });
}

/**
 * Waits until the github API returns a deployment for
 * a given actor.
 *
 * Accounts for race conditions where this action starts
 * before the actor's action has started.
 */
export async function waitForDeploymentCreate({
    octokit,
    owner,
    repo,
    sha,
    environment,
    actorName,
    maxTimeoutMs,
    checkIntervalMs,
    application,
}: IWaitForDeploymentCreateOptions): Promise<Deployment> {
    const retries = getRetryCount(maxTimeoutMs, checkIntervalMs);

    for (let i = 0; i < retries; i++) {
        try {
            const deployment = await getDeployment({
                octokit,
                owner,
                repo,
                sha,
                environment,
                actorName,
                application,
            });

            if (deployment) {
                return deployment;
            }

            log(
                `Could not find any deployments for application "${application}", for actor "${actorName}", retrying (attempt ${
                    i + 1
                } / ${retries})`,
            );
        } catch (e) {
            log(
                `Error while fetching deployments, retrying (attempt ${
                    i + 1
                } / ${retries})`,
            );

            logError(e);
        }

        await wait(checkIntervalMs);
    }

    throw new Error('Timeout reached: No deployment was found');
}
