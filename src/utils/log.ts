import * as core from '@actions/core';

export function log(message: string) {
    if (process.env.NODE_ENV === 'test') {
        return;
    }

    core.info(`[wait-vercel-mono-deployment] ${message}`);
}

export function logError(e: any) {
    if (process.env.NODE_ENV === 'test') {
        return;
    }

    core.error(`[wait-vercel-mono-deployment]`, e);
}
