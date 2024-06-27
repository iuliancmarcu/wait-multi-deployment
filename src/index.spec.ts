import github from '@actions/github';
import core, { setFailed, setOutput } from '@actions/core';

import { IInputs, getInputs } from './inputs';
import { getPRHeadCommitSha } from './lib/getPRHeadCommitSha';
import { waitForDeploymentCreate } from './lib/waitForDeploymentCreate';
import { waitForDeploymentStatus } from './lib/waitForDeploymentStatus';
import { waitForUrl } from './lib/waitForUrl';
import { getContext } from './utils/context';

import { run } from './index';

jest.mock('@actions/github', () => ({
    getOctokit: jest.fn(),
}));
jest.mock('@actions/core', () => ({
    setOutput: jest.fn(),
    setFailed: jest.fn(),
}));

jest.mock('./inputs');
jest.mock('./lib/getPRHeadCommitSha');
jest.mock('./lib/waitForDeploymentCreate');
jest.mock('./lib/waitForDeploymentStatus');
jest.mock('./lib/waitForUrl');
jest.mock('./utils/context');

const defaultInputs: IInputs = {
    actorName: 'actorName',
    allowInactiveDeployment: true,
    checkIntervalMs: 1000,
    environment: 'environment',
    githubToken: 'githubToken',
    maxTimeoutMs: 1000,
    path: '/',
};

const octokit: ReturnType<typeof import('@actions/github').getOctokit> = {} as any;

describe('index - waitMultiDeployment', () => {
    const mockGithub = github as jest.Mocked<typeof github>;
    const mockCore = core as jest.Mocked<typeof core>;
    const mockGetInputs = getInputs as jest.MockedFunction<typeof getInputs>;
    const mockGetPRHeadCommitSha = getPRHeadCommitSha as jest.MockedFunction<
        typeof getPRHeadCommitSha
    >;
    const mockWaitForDeploymentCreate = waitForDeploymentCreate as jest.MockedFunction<
        typeof waitForDeploymentCreate
    >;
    const mockWaitForDeploymentStatus = waitForDeploymentStatus as jest.MockedFunction<
        typeof waitForDeploymentStatus
    >;
    const mockWaitForUrl = waitForUrl as jest.MockedFunction<typeof waitForUrl>;
    const mockGetContext = getContext as jest.MockedFunction<typeof getContext>;

    const mockGetOctokit = mockGithub.getOctokit;
    const mockSetOutput = mockCore.setOutput;
    const mockSetFailed = mockCore.setFailed;

    beforeEach(() => {
        jest.clearAllMocks();

        mockGetOctokit.mockReturnValue(octokit);
        mockGetInputs.mockReturnValue(defaultInputs);
    });

    it('should fetch the PR head commit SHA when context has PR payload', async () => {
        mockGetContext.mockReturnValue({
            repo: {
                owner: 'owner',
                repo: 'repo',
            },
            sha: 'sha',
            payload: {
                pull_request: {
                    number: 123,
                },
            },
        } as any);

        await run();

        expect(mockGetPRHeadCommitSha).toHaveBeenCalledWith({
            octokit,
            owner: 'owner',
            repo: 'repo',
            prNumber: 123,
        });
    });

    it('fails the action when PR payload has no PR number', async () => {
        mockGetContext.mockReturnValue({
            repo: {
                owner: 'owner',
                repo: 'repo',
            },
            sha: 'sha',
            payload: {
                pull_request: {},
            },
        } as any);

        await run();

        expect(setFailed).toHaveBeenCalledWith(
            'Missing information: Pull request detected but no PR number was found in payload. Exiting...',
        );
    });

    it('should not fetch the PR head commit SHA when context has no PR payload', async () => {
        mockGetContext.mockReturnValue({
            repo: {
                owner: 'owner',
                repo: 'repo',
            },
            sha: 'sha',
        } as any);

        await run();

        expect(mockGetPRHeadCommitSha).not.toHaveBeenCalled();
    });

    it('should fail the action when failing to get PR head SHA', async () => {
        mockGetContext.mockReturnValue({
            repo: {
                owner: 'owner',
                repo: 'repo',
            },
            sha: 'sha',
            payload: {
                pull_request: {
                    number: 123,
                },
            },
        } as any);

        mockGetPRHeadCommitSha.mockRejectedValue(new Error('failed to fetch'));

        await run();

        expect(setFailed).toHaveBeenCalledWith(
            'Missing information: Failed to fetch the PR head commit SHA. Exiting...',
        );
    });

    it('should fail the action when SHA is not determined', async () => {
        mockGetContext.mockReturnValue({
            repo: {
                owner: 'owner',
                repo: 'repo',
            },
            sha: '',
        } as any);

        await run();

        expect(setFailed).toHaveBeenCalledWith(
            'Missing information: Unable to determine SHA of the commit to check. Exiting...',
        );
    });

    it('should fail the action when the deployment is not found', async () => {
        mockGetContext.mockReturnValue({
            repo: {
                owner: 'owner',
                repo: 'repo',
            },
            sha: 'sha',
        } as any);

        mockWaitForDeploymentCreate.mockRejectedValue(new Error('timeout'));

        await run();

        expect(setFailed).toHaveBeenCalledWith(
            'Check failure: Failed to find a deployment for actor "actorName". Exiting...',
        );
    });

    it('should fail the action when the deployment status is not successful', async () => {
        mockGetContext.mockReturnValue({
            repo: {
                owner: 'owner',
                repo: 'repo',
            },
            sha: 'sha',
        } as any);

        mockWaitForDeploymentCreate.mockResolvedValue({ id: 'my-deployment' } as any);
        mockWaitForDeploymentStatus.mockRejectedValue(new Error('timeout'));

        await run();

        expect(setFailed).toHaveBeenCalledWith(
            'Check failure: Failed to find a deployment status for deployment "my-deployment". Exiting...',
        );
    });

    it('should fail the action when the deployment status has no target url', async () => {
        mockGetContext.mockReturnValue({
            repo: {
                owner: 'owner',
                repo: 'repo',
            },
            sha: 'sha',
        } as any);

        mockWaitForDeploymentCreate.mockResolvedValue({ id: 'my-deployment' } as any);
        mockWaitForDeploymentStatus.mockResolvedValue({} as any);

        await run();

        expect(setFailed).toHaveBeenCalledWith(
            'Check failure: No `target_url` was found in the status check. Exiting...',
        );
    });

    it('should fail the action when the url check fails', async () => {
        mockGetContext.mockReturnValue({
            repo: {
                owner: 'owner',
                repo: 'repo',
            },
            sha: 'sha',
        } as any);

        mockWaitForDeploymentCreate.mockResolvedValue({ id: 'my-deployment' } as any);
        mockWaitForDeploymentStatus.mockResolvedValue({
            target_url: 'http://example.com',
        } as any);
        mockWaitForUrl.mockRejectedValue(new Error('timeout'));

        await run();

        expect(setFailed).toHaveBeenCalledWith(
            'Check failure: Failed to get a successful response from "http://example.com". Exiting...',
        );
    });

    it('should set the vercel_jwt output when one is returned', async () => {
        mockGetContext.mockReturnValue({
            repo: {
                owner: 'owner',
                repo: 'repo',
            },
            sha: 'sha',
        } as any);

        mockWaitForDeploymentCreate.mockResolvedValue({ id: 'my-deployment' } as any);
        mockWaitForDeploymentStatus.mockResolvedValue({
            target_url: 'http://example.com',
        } as any);
        mockWaitForUrl.mockResolvedValue({
            url: 'http://example.com',
            path: '/',
            jwt: 'jwt',
        });

        await run();

        expect(mockSetOutput).toHaveBeenCalledWith('vercel_jwt', 'jwt');
    });

    it('should set the url output when one is returned', async () => {
        mockGetContext.mockReturnValue({
            repo: {
                owner: 'owner',
                repo: 'repo',
            },
            sha: 'sha',
        } as any);

        mockWaitForDeploymentCreate.mockResolvedValue({ id: 'my-deployment' } as any);
        mockWaitForDeploymentStatus.mockResolvedValue({
            target_url: 'http://example.com',
        } as any);
        mockWaitForUrl.mockResolvedValue({
            url: 'http://example.com',
            path: '/',
        });

        await run();

        expect(mockSetOutput).toHaveBeenCalledWith('url', 'http://example.com');
    });
});
