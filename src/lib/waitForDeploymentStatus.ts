import { getRetryCount } from '../utils/getRetryCount';
import { log } from '../utils/log';
import { wait } from '../utils/wait';

export interface IWaitForStatusOptions {
    octokit: ReturnType<typeof import('@actions/github').getOctokit>;
    owner: string;
    repo: string;
    deployment_id: number;
    maxTimeoutMs: number;
    allowInactive?: boolean;
    checkIntervalMs: number;
}

export class DeploymentStatusError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export async function waitForDeploymentStatus({
    octokit,
    owner,
    repo,
    deployment_id,
    maxTimeoutMs,
    allowInactive,
    checkIntervalMs,
}: IWaitForStatusOptions) {
    const retries = getRetryCount(maxTimeoutMs, checkIntervalMs);

    for (let i = 0; i < retries; i++) {
        try {
            const statuses = await octokit.rest.repos.listDeploymentStatuses({
                owner,
                repo,
                deployment_id,
            });

            const status = statuses.data.length > 0 && statuses.data[0];

            if (!status) {
                throw new DeploymentStatusError('No status was available');
            }

            if (status && allowInactive === true && status.state === 'inactive') {
                return status;
            }

            if (status && status.state !== 'success') {
                throw new DeploymentStatusError(
                    'No status with state "success" was available',
                );
            }

            if (status && status.state === 'success') {
                return status;
            }

            throw new DeploymentStatusError('Unknown status error');
        } catch (e) {
            log(
                `Deployment unavailable or not successful, retrying (attempt ${
                    i + 1
                } / ${retries})`,
            );

            if (e instanceof DeploymentStatusError) {
                if (e.message.includes('No status with state "success"')) {
                    // TODO: does anything actually need to be logged in this case?
                } else {
                    log(e.message);
                }
            } else if (e instanceof Error) {
                log(e.message);
            } else {
                log(String(e));
            }

            await wait(checkIntervalMs);
        }
    }

    throw new Error(`Timeout reached: Unable to wait for an deployment to be successful`);
}
