import * as github from '@actions/github';
import { Deployment } from '../utils/types';

export interface IGetLatestDeploymentOptions {
    octokit: ReturnType<typeof github.getOctokit>;
    owner: string;
    repo: string;
    environment: string;
    actorName: string;
}

export async function getLatestDeployment({
    octokit,
    owner,
    repo,
    environment,
    actorName,
}: IGetLatestDeploymentOptions): Promise<Deployment> {
    try {
        const deployments = await octokit.rest.repos.listDeployments({
            owner,
            repo,
            environment,
        });

        const sortedDeployments = [...(deployments?.data ?? [])];
        sortedDeployments.sort((a, b) => {
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });

        const latestDeployment = sortedDeployments.find(
            (d) => d.creator?.login === actorName,
        );

        if (!latestDeployment) {
            throw new Error('No deployments found');
        }

        return latestDeployment;
    } catch (err) {
        throw new Error(
            `Fetch failure: Failed to find latest deployment for environment "${environment}" and actor "${actorName}"`,
            { cause: err },
        );
    }
}
