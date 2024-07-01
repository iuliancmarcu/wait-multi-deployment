import { info, error } from '@actions/core';

export function log(message: string) {
    if (process.env.NODE_ENV === 'test') {
        return;
    }

    info(`[wait-vercel-mono-deployment] ${message}`);
}

export function logError(e: any) {
    if (process.env.NODE_ENV === 'test') {
        return;
    }

    error(`[wait-vercel-mono-deployment]`, e);
}
