export function log(message: string) {
    if (process.env.NODE_ENV === 'test') {
        return;
    }

    console.log(`[wait-vercel-mono-deployment] ${message}`);
}

export function logError(e: any) {
    if (process.env.NODE_ENV === 'test') {
        return;
    }

    console.error(`[wait-vercel-mono-deployment]`, e);
}
