import axios, { AxiosError } from 'axios';
import { waitForUrl, IWaitForUrlOptions } from '../lib/waitForUrl';
import { wait } from '../utils/wait';

jest.mock('../utils/wait', () => ({
    wait: jest.fn().mockImplementation(() => null),
}));

jest.mock('./getVercelJWT', () => ({
    getVercelJWT: jest.fn().mockResolvedValue('myverceljwt'),
}));

jest.mock('axios');

const options: IWaitForUrlOptions = {
    url: 'https://example.com',
    path: '/path',
    maxTimeoutMs: 5000,
    checkIntervalMs: 1000,
};

describe('waitForUrl', () => {
    const mockAxios = axios as jest.Mocked<typeof axios>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('checks the deployment until the number of retries is reached', async () => {
        mockAxios.get.mockRejectedValue(new Error('error'));

        await waitForUrl({
            ...options,
            maxTimeoutMs: 5000,
            checkIntervalMs: 1000,
        }).catch(() => null);

        expect(wait).toHaveBeenCalledTimes(5);
    });

    it('throws if the status check fails', async () => {
        mockAxios.get.mockRejectedValue(new Error('error'));

        await expect(waitForUrl(options)).rejects.toThrow(
            'Timeout reached: Unable to connect to https://example.com',
        );
    });

    it('returns if the status check is successful', async () => {
        mockAxios.get.mockRejectedValueOnce(new AxiosError('error', '404'));
        mockAxios.get.mockRejectedValueOnce(new AxiosError('error', '404'));
        mockAxios.get.mockResolvedValueOnce({ status: 200 });

        const result = await waitForUrl(options);

        expect(wait).toHaveBeenCalledTimes(2);
        expect(result).toEqual({
            url: 'https://example.com',
            path: '/path',
        });
    });

    it('uses the vercel jwt if a password is provided', async () => {
        mockAxios.get.mockResolvedValueOnce({ status: 200 });

        const result = await waitForUrl({
            ...options,
            vercelPassword: 'password',
        });

        expect(mockAxios.get).toHaveBeenCalledWith('https://example.com/path', {
            headers: {
                Cookie: '_vercel_jwt=myverceljwt',
            },
        });

        expect(result).toEqual({
            url: 'https://example.com',
            path: '/path',
            jwt: 'myverceljwt',
        });
    });
});
