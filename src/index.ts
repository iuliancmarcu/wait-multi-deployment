import * as github from '@actions/github';
import * as core from '@actions/core';

import { getPRHeadCommitSha } from './lib/getPRHeadCommitSha';
import { getInputs } from './inputs';
import { log, logError } from './utils/log';
import { getContext } from './utils/context';
import { waitForDeployment } from './lib/waitForDeployment';
import { toConstantCase } from './utils/toConstantCase';

export async function run() {
    try {
        // Inputs
        const {
            actorName,
            allowInactiveDeployment,
            useLatestDeployment,
            checkIntervalMs,
            environment,
            githubToken,
            maxTimeoutMs,
            path,
            vercelPassword,
            applications,
            applicationPrefix,
        } = getInputs();

        const octokit = github.getOctokit(githubToken);

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

        if (applications && applications.length > 0) {
            const actualApplications = applications.split(',').map((app) => app.trim());

            await Promise.all(
                actualApplications.map(async (application) => {
                    const { url, jwt } = await waitForDeployment({
                        octokit,
                        owner,
                        repo,
                        sha: latestCommitSha,
                        environment,
                        actorName,
                        maxTimeoutMs,
                        checkIntervalMs,
                        allowInactiveDeployment,
                        useLatestDeployment,
                        vercelPassword,
                        path,
                        application: `${applicationPrefix ?? ''}${application}`,
                    });

                    await setActionOutputs({
                        url,
                        jwt,
                        application,
                    });
                }),
            );
        } else {
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
                useLatestDeployment,
                vercelPassword,
                path,
            });

            await setActionOutputs({
                url,
                jwt,
            });
        }
    } catch (error: any) {
        // Log the error for debugging
        logError(error);

        // Set the action as failed
        core.setFailed(error.message);
    }
}

async function setActionOutputs({
    url,
    jwt,
    application,
}: {
    url: string;
    jwt?: string;
    application?: string;
}) {
    const urlOutputKey = toConstantCase(application ? `${application}_url` : 'url');
    const vercelJwtOutputKey = toConstantCase(
        application ? `${application}_vercel_jwt` : 'vercel_jwt',
    );

    log(`Setting env variable: ${urlOutputKey}=${url}`);
    core.exportVariable(urlOutputKey, url);
    if (jwt) {
        log(`Setting env variable: ${urlOutputKey}=${url}`);
        core.exportVariable(vercelJwtOutputKey, jwt);
    }
    log('');
}

run();
