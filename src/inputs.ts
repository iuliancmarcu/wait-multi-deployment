import core from '@actions/core';

export interface IInputs {
    actorName: string;
    githubToken: string;
    environment: string;
    allowInactiveDeployment: boolean;
    maxTimeoutMs: number;
    checkIntervalMs: number;
    path: string;
    expectedApplications?: string;
    otherApplications?: string;
    vercelPassword?: string;
}

export const ENV_PREVIEW = 'Preview';

export function getInputs(): IInputs {
    const githubToken = core.getInput('github_token', { required: true });
    const vercelPassword = core.getInput('vercel_password');
    const environment = core.getInput('environment') || ENV_PREVIEW;
    const maxTimeoutMs = Number(core.getInput('max_timeout_ms')) || 60;
    const allowInactiveDeployment =
        Boolean(core.getInput('allow_inactive_deployment')) || false;
    const path = core.getInput('path') || '/';
    const checkIntervalMs = Number(core.getInput('check_interval_ms')) || 2000;
    const actorName = core.getInput('actor_name') || 'vercel[bot]';
    const expectedApplications = core.getInput('expected_applications');
    const otherApplications = core.getInput('other_applications');

    if (!githubToken) {
        // Fail if we have don't have a github token
        throw new Error('Input error: Required field `token` was not provided');
    }

    return {
        actorName,
        githubToken,
        vercelPassword,
        environment,
        maxTimeoutMs,
        allowInactiveDeployment,
        path,
        checkIntervalMs,
        expectedApplications,
        otherApplications,
    };
}
