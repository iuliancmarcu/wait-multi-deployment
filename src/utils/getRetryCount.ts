export function getRetryCount(totalTimeMs: number, tryIntervalMs: number) {
    return Math.floor(totalTimeMs / tryIntervalMs);
}
