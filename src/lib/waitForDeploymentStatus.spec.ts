import { wait } from '../utils/wait';
import {
    waitForDeploymentStatus,
    DeploymentStatusError,
    IWaitForStatusOptions,
} from './waitForDeploymentStatus';

const mockOctokit = {
    rest: {
        repos: {
            listDeploymentStatuses: jest.fn(),
        },
    },
};

const options: IWaitForStatusOptions = {
    octokit: mockOctokit as any,
    owner: 'your-repo-owner',
    repo: 'your-repo-name',
    deployment_id: 123,
    maxTimeoutMs: 5000,
    checkIntervalMs: 1000,
};

jest.mock('../utils/wait', () => ({
    wait: jest.fn().mockImplementation(() => null),
}));

describe('waitForDeploymentStatus', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('checks the deployment until the number of retries is reached', async () => {
        await waitForDeploymentStatus({
            ...options,
            maxTimeoutMs: 5000,
            checkIntervalMs: 1000,
        }).catch(() => {});

        expect(wait).toHaveBeenCalledTimes(5);
    });

    it('throws if the status check fails', async () => {
        await expect(
            waitForDeploymentStatus({
                ...options,
                maxTimeoutMs: 5000,
                checkIntervalMs: 1000,
            }),
        ).rejects.toThrow(
            'Timeout reached: Unable to wait for an deployment to be successful',
        );
    });

    it('retries and returns deployment until the status is inactive if allowed', async () => {
        mockOctokit.rest.repos.listDeploymentStatuses.mockResolvedValueOnce({
            data: [
                {
                    state: 'pending',
                },
            ],
        });

        mockOctokit.rest.repos.listDeploymentStatuses.mockResolvedValueOnce({
            data: [
                {
                    url: 'deployment-url',
                    state: 'inactive',
                },
            ],
        });

        const result = await waitForDeploymentStatus({
            ...options,
            allowInactive: true,
        });

        expect(result).toEqual({
            url: 'deployment-url',
            state: 'inactive',
        });
    });

    it('retries and returns deployment until status is success', async () => {
        mockOctokit.rest.repos.listDeploymentStatuses.mockResolvedValueOnce({
            data: [
                {
                    state: 'pending',
                },
            ],
        });

        mockOctokit.rest.repos.listDeploymentStatuses.mockResolvedValueOnce({
            data: [
                {
                    url: 'deployment-url',
                    state: 'success',
                },
            ],
        });

        const result = await waitForDeploymentStatus(options);

        expect(result).toEqual({
            url: 'deployment-url',
            state: 'success',
        });
    });
});
