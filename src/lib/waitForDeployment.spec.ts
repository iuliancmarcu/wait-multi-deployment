import { getLatestDeployment } from './getLatestDeployment';
import { IWaitForDeploymentOptions, waitForDeployment } from './waitForDeployment';
import { waitForDeploymentCreate } from './waitForDeploymentCreate';
import { waitForDeploymentStatus } from './waitForDeploymentStatus';
import { waitForUrl } from './waitForUrl';

const options: IWaitForDeploymentOptions = {
    actorName: 'test-actorName',
    allowInactiveDeployment: false,
    useLatestDeployment: false,
    checkIntervalMs: 1000,
    environment: 'test-environment',
    maxTimeoutMs: 1000,
    octokit: {} as any,
    owner: 'test-owner',
    path: '/',
    repo: 'test-repo',
    sha: 'test-sha',
    vercelPassword: 'test-vercelPassword',
};

jest.mock('./waitForUrl');
jest.mock('./waitForDeploymentCreate');
jest.mock('./waitForDeploymentStatus');
jest.mock('./getLatestDeployment');

describe('waitForDeployment', () => {
    const mockWaitForDeploymentCreate = waitForDeploymentCreate as jest.MockedFunction<
        typeof waitForDeploymentCreate
    >;

    const mockWaitForDeploymentStatus = waitForDeploymentStatus as jest.MockedFunction<
        typeof waitForDeploymentStatus
    >;

    const mockWaitForUrl = waitForUrl as jest.MockedFunction<typeof waitForUrl>;

    const mockGetLatestDeployment = getLatestDeployment as jest.MockedFunction<
        typeof getLatestDeployment
    >;

    it('throws when the deployment is not found', async () => {
        mockWaitForDeploymentCreate.mockRejectedValue(new Error('timeout'));

        await expect(waitForDeployment(options)).rejects.toThrow(
            'Check failure: Failed to find a deployment for actor "test-actorName"',
        );
    });

    it('throws when the deployment status is not successful', async () => {
        mockWaitForDeploymentCreate.mockResolvedValue({ id: 'my-deployment' } as any);
        mockWaitForDeploymentStatus.mockRejectedValue(new Error('timeout'));

        await expect(waitForDeployment(options)).rejects.toThrow(
            'Check failure: Failed to find a deployment status for deployment "my-deployment"',
        );
    });

    it('throws when the deployment status has no target url', async () => {
        mockWaitForDeploymentCreate.mockResolvedValue({ id: 'my-deployment' } as any);
        mockWaitForDeploymentStatus.mockResolvedValue({} as any);

        await expect(waitForDeployment(options)).rejects.toThrow(
            'Check failure: No `target_url` was found in the status check',
        );
    });

    it('throws when the url check fails', async () => {
        mockWaitForDeploymentCreate.mockResolvedValue({ id: 'my-deployment' } as any);
        mockWaitForDeploymentStatus.mockResolvedValue({
            target_url: 'http://example.com',
        } as any);
        mockWaitForUrl.mockRejectedValue(new Error('timeout'));

        await expect(waitForDeployment(options)).rejects.toThrow(
            'Check failure: Failed to get a successful response from "http://example.com"',
        );
    });

    it('returns the url check results when successful', async () => {
        const urlCheckResult = { url: 'http://example.com', jwt: 'test-jwt', path: '/' };

        mockWaitForDeploymentCreate.mockResolvedValue({ id: 'my-deployment' } as any);
        mockWaitForDeploymentStatus.mockResolvedValue({
            target_url: 'http://example.com',
        } as any);
        mockWaitForUrl.mockResolvedValue(urlCheckResult);

        const result = await waitForDeployment(options);

        expect(result).toEqual(urlCheckResult);
    });

    describe('when useLatestDeployment is true', () => {
        it('uses the latest deployment', async () => {
            const deployment = { id: 'my-deployment' } as any;
            mockGetLatestDeployment.mockResolvedValue(deployment);

            await waitForDeployment({ ...options, useLatestDeployment: true });

            expect(mockGetLatestDeployment).toHaveBeenCalledWith({
                ...options,
                useLatestDeployment: true,
            });
            expect(waitForDeploymentCreate).not.toHaveBeenCalledWith({
                ...options,
                deployment_id: deployment.id,
            });
        });
    });
});
