import { wait } from '../utils/wait';
import {
    waitForDeploymentCreate,
    IWaitForDeploymentCreateOptions,
} from './waitForDeploymentCreate';

const mockOctokit = {
    rest: {
        repos: {
            listDeployments: jest.fn(),
        },
    },
};

const options: IWaitForDeploymentCreateOptions = {
    octokit: mockOctokit as any,
    owner: 'test-owner',
    repo: 'test-repo',
    sha: 'test-sha',
    environment: 'test-environment',
    actorName: 'test-actor',
    maxTimeoutMs: 20000,
    checkIntervalMs: 2000,
};

jest.mock('../utils/wait', () => ({
    wait: jest.fn().mockImplementation(() => null),
}));

describe('waitForDeploymentCreate', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('checks for deployment until the number of retries is reached', async () => {
        await waitForDeploymentCreate({
            ...options,
            maxTimeoutMs: 5000,
            checkIntervalMs: 1000,
        }).catch(() => null);

        expect(wait).toHaveBeenCalledTimes(5);
    });

    it('throws if the deployment is not found', async () => {
        await expect(waitForDeploymentCreate(options)).rejects.toThrow(
            'Timeout reached: No deployment was found',
        );
    });

    it('returns the deployment if it is found', async () => {
        mockOctokit.rest.repos.listDeployments.mockResolvedValueOnce({ data: [] });
        mockOctokit.rest.repos.listDeployments.mockResolvedValueOnce({
            data: [
                {
                    deploymentData: 'foobar',
                    creator: {
                        login: 'test-actor',
                    },
                },
            ],
        });

        const result = await waitForDeploymentCreate(options);

        expect(result).toEqual({
            deploymentData: 'foobar',
            creator: {
                login: 'test-actor',
            },
        });
    });

    it('uses special environment if application is provided', async () => {
        mockOctokit.rest.repos.listDeployments.mockResolvedValueOnce({
            data: [
                {
                    deploymentData: 'foobar',
                    creator: {
                        login: 'test-actor',
                    },
                },
            ],
        });

        await waitForDeploymentCreate({
            ...options,
            application: 'test-application',
        });

        const expectedEnvironment = 'test-environment – test-application';

        expect(mockOctokit.rest.repos.listDeployments).toHaveBeenCalledWith({
            owner: 'test-owner',
            repo: 'test-repo',
            sha: 'test-sha',
            environment: expectedEnvironment,
        });
    });
});
