import { getRetryCount } from './getRetryCount';

describe('getRetryCount', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 0 retries if totalTimeMs is 0', () => {
        const totalTimeMs = 0;
        const tryIntervalMs = 1000;
        const retries = getRetryCount(totalTimeMs, tryIntervalMs);
        expect(retries).toBe(0);
    });

    it('should return 10 retries if totalTimeMs is ten times tryIntervalMs', () => {
        const totalTimeMs = 10000;
        const tryIntervalMs = 1000;
        const retries = getRetryCount(totalTimeMs, tryIntervalMs);
        expect(retries).toBe(10);
    });
});
