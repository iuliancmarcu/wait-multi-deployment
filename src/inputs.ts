import core from '@actions/core';

export interface IInputs {
    actorName: string;
    githubToken: string;
    environment: string;
    allowInactiveDeployment: boolean;
    maxTimeoutMs: number;
    checkIntervalMs: number;
    path: string;
    applications?: string;
    vercelPassword?: string;
}

export const ENV_PREVIEW = 'Preview';

export function getInputs(): IInputs {
    const githubToken = core.getInput('github_token', { required: true });
    const vercelPassword = core.getInput('vercel_password');
    const environment = core.getInput('environment') || ENV_PREVIEW;
    const allowInactiveDeployment =
        Boolean(core.getInput('allow_inactive_deployment')) || false;
    const path = core.getInput('path') || '/';
    const maxTimeoutMs = (Number(core.getInput('max_timeout')) || 60) * 1000;
    const checkIntervalMs = (Number(core.getInput('check_interval')) || 2) * 1000;
    const actorName = core.getInput('actor_name') || 'vercel[bot]';
    const applications = core.getInput('applications');

    if (!githubToken) {
        throw new Error('Input error: Required field `github_token` was not provided');
    }

    if (!applications) {
        throw new Error('Input error: Required field `applications` was not provided');
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
        applications,
    };
}
