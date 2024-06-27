import { getOctokit } from '@actions/github';
import { setOutput, setFailed } from '@actions/core';

import { getPRHeadCommitSha } from './lib/getPRHeadCommitSha';
import { waitForDeploymentCreate } from './lib/waitForDeploymentCreate';
import { waitForDeploymentStatus } from './lib/waitForDeploymentStatus';
import { waitForUrl } from './lib/waitForUrl';
import { getInputs } from './inputs';
import { log, logError } from './utils/log';
import { getContext } from './utils/context';
import { PromiseValue } from './utils/types';

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
            expectedApplications,
            otherApplications,
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

        // Get deployments associated with the pull request.
        let deployment: PromiseValue<ReturnType<typeof waitForDeploymentCreate>>;
        try {
            deployment = await waitForDeploymentCreate({
                octokit,
                owner,
                repo,
                sha: latestCommitSha,
                environment,
                actorName,
                maxTimeoutMs,
                checkIntervalMs,
            });
        } catch (err) {
            throw new Error(
                `Check failure: Failed to find a deployment for actor "${actorName}". Exiting...`,
                { cause: err },
            );
        }

        let status: PromiseValue<ReturnType<typeof waitForDeploymentStatus>>;
        try {
            status = await waitForDeploymentStatus({
                octokit,
                owner,
                repo,
                deployment_id: deployment.id,
                maxTimeoutMs,
                allowInactive: allowInactiveDeployment,
                checkIntervalMs,
            });
        } catch (err) {
            throw new Error(
                `Check failure: Failed to find a deployment status for deployment "${deployment.id}". Exiting...`,
                { cause: err },
            );
        }

        // Get target url
        const targetUrl = status?.target_url;

        if (!targetUrl) {
            throw new Error(
                'Check failure: No `target_url` was found in the status check. Exiting...',
            );
        }

        log(`Found target url » ${targetUrl}`);

        // Wait for url to respond with a success
        log(`Waiting for a status code 200 from: ${targetUrl}`);

        let urlCheckResult: PromiseValue<ReturnType<typeof waitForUrl>>;
        try {
            urlCheckResult = await waitForUrl({
                url: targetUrl,
                maxTimeoutMs,
                checkIntervalMs,
                vercelPassword,
                path,
            });
        } catch (err) {
            throw new Error(
                `Check failure: Failed to get a successful response from "${targetUrl}". Exiting...`,
                { cause: err },
            );
        }

        // Set outputs for the next steps
        setOutput('url', urlCheckResult.url);

        if (urlCheckResult.jwt) {
            setOutput('vercel_jwt', urlCheckResult.jwt);
        }
    } catch (error: any) {
        // Log the error for debugging
        logError(error);

        // Set the action as failed
        setFailed(error.message);
    }
}
