import { getOctokit } from '@actions/github';
import { setOutput, setFailed } from '@actions/core';

import { getPRHeadCommitSha } from './lib/getPRHeadCommitSha';
import { getInputs } from './inputs';
import { logError } from './utils/log';
import { getContext } from './utils/context';
import { waitForDeployment } from './lib/waitForDeployment';

export async function run() {
    try {
        // Inputs
        const {
            actorName,
            allowInactiveDeployment,
            checkIntervalMs,
            environment,
            githubToken,
            maxTimeoutMs,
            path,
            vercelPassword,
            applications,
        } = getInputs();

        const octokit = getOctokit(githubToken);

        // Get context and extract repo and commit information
        const context = getContext();
        const {
            repo: { owner, repo },
            sha,
            payload,
        } = context;

        // Resolve the SHA of the commit to check
        let latestCommitSha = sha;
        if (payload && payload.pull_request) {
            const prNumber = payload.pull_request?.number;

            if (!prNumber) {
                throw new Error(
                    'Missing information: Pull request detected but no PR number was found in payload. Exiting...',
                );
            }

            try {
                latestCommitSha = await getPRHeadCommitSha({
                    octokit,
                    owner,
                    repo,
                    prNumber,
                });
            } catch (err) {
                throw new Error(
                    `Missing information: Failed to fetch the PR head commit SHA. Exiting...`,
                    { cause: err },
                );
            }
        }

        if (!latestCommitSha) {
            throw new Error(
                'Missing information: Unable to determine SHA of the commit to check. Exiting...',
            );
        }

        const { url, jwt } = await waitForDeployment({
            octokit,
            owner,
            repo,
            sha,
            environment,
            actorName,
            maxTimeoutMs,
            checkIntervalMs,
            allowInactiveDeployment,
            vercelPassword,
            path,
        });

        // Set outputs for the next steps
        setOutput('url', url);

        if (jwt) {
            setOutput('vercel_jwt', jwt);
        }
    } catch (error: any) {
        // Log the error for debugging
        logError(error);

        // Set the action as failed
        setFailed(error.message);
    }
}
