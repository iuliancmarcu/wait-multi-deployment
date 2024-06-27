import { getRetryCount } from '../utils/getRetryCount';
import { log, logError } from '../utils/log';
import { wait } from '../utils/wait';

export interface IWaitForDeploymentCreateOptions {
    octokit: ReturnType<typeof import('@actions/github').getOctokit>;
    owner: string;
    repo: string;
    sha: string;
    environment: string;
    actorName: string;
    maxTimeoutMs: number;
    checkIntervalMs: number;
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
}: IWaitForDeploymentCreateOptions) {
    const retries = getRetryCount(maxTimeoutMs, checkIntervalMs);

    for (let i = 0; i < retries; i++) {
        try {
            const deployments = await octokit.rest.repos.listDeployments({
                owner,
                repo,
                sha,
                environment,
            });

            const deployment =
                deployments.data.length > 0 &&
                deployments.data.find((d) => {
                    return d.creator?.login === actorName;
                });

            if (deployment) {
                return deployment;
            }

            log(
                `Could not find any deployments for actor ${actorName}, retrying (attempt ${
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
