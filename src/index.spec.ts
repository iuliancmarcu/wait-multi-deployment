import * as github from '@actions/github';
import * as core from '@actions/core';

import { IInputs, getInputs } from './inputs';
import { getPRHeadCommitSha } from './lib/getPRHeadCommitSha';
import { waitForDeployment } from './lib/waitForDeployment';
import { getContext } from './utils/context';

import { run } from './index';

jest.mock('@actions/github', () => ({
    getOctokit: jest.fn(),
}));
jest.mock('@actions/core', () => ({
    exportVariable: jest.fn(),
    setFailed: jest.fn(),
}));

jest.mock('./inputs');
jest.mock('./lib/getPRHeadCommitSha');
jest.mock('./lib/waitForDeployment');
jest.mock('./utils/context');

const defaultInputs: IInputs = {
    actorName: 'actorName',
    allowInactiveDeployment: true,
    useLatestDeployment: false,
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
    const mockWaitForDeployment = waitForDeployment as jest.MockedFunction<
        typeof waitForDeployment
    >;
    const mockGetContext = getContext as jest.MockedFunction<typeof getContext>;

    const mockGetOctokit = mockGithub.getOctokit;
    const mockExportVariable = mockCore.exportVariable;
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

        expect(core.setFailed).toHaveBeenCalledWith(
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

        expect(core.setFailed).toHaveBeenCalledWith(
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

        expect(core.setFailed).toHaveBeenCalledWith(
            'Missing information: Unable to determine SHA of the commit to check. Exiting...',
        );
    });

    it('fails the action when waitForDeployment fails', async () => {
        mockGetContext.mockReturnValue({
            repo: {
                owner: 'owner',
                repo: 'repo',
            },
            sha: 'sha',
        } as any);

        mockWaitForDeployment.mockRejectedValue(new Error('failed to wait'));

        await run();

        expect(mockSetFailed).toHaveBeenCalledWith('failed to wait');
    });

    it('should set the vercel_jwt env when one is returned', async () => {
        mockGetContext.mockReturnValue({
            repo: {
                owner: 'owner',
                repo: 'repo',
            },
            sha: 'sha',
        } as any);

        mockWaitForDeployment.mockResolvedValue({
            url: 'http://example.com',
            jwt: 'jwt',
            path: '/',
        });

        await run();

        expect(mockExportVariable).toHaveBeenCalledWith('VERCEL_JWT', 'jwt');
    });

    it('should set the url env when one is returned', async () => {
        mockGetContext.mockReturnValue({
            repo: {
                owner: 'owner',
                repo: 'repo',
            },
            sha: 'sha',
        } as any);

        mockWaitForDeployment.mockResolvedValue({
            url: 'http://example.com',
            path: '/',
        });

        await run();

        expect(mockExportVariable).toHaveBeenCalledWith('URL', 'http://example.com');
    });

    describe('when applications are provided', () => {
        it('fails the action when waitForDeployment fails for any application', async () => {
            mockGetContext.mockReturnValue({
                repo: {
                    owner: 'owner',
                    repo: 'repo',
                },
                sha: 'sha',
            } as any);

            mockGetInputs.mockReturnValue({
                ...defaultInputs,
                applications: 'app1, app2',
            });

            mockWaitForDeployment.mockResolvedValueOnce({
                url: 'http://example.com',
                jwt: 'jwt',
                path: '/',
            });
            mockWaitForDeployment.mockRejectedValueOnce(new Error('failed to wait'));

            await run();

            expect(mockWaitForDeployment).toHaveBeenCalledTimes(2);
            expect(mockWaitForDeployment).toHaveBeenCalledWith(
                expect.objectContaining({
                    application: 'app1',
                }),
            );
            expect(mockWaitForDeployment).toHaveBeenCalledWith(
                expect.objectContaining({
                    application: 'app2',
                }),
            );

            expect(mockSetFailed).toHaveBeenCalledWith('failed to wait');
        });

        it('waits for deployment for each application', async () => {
            mockGetContext.mockReturnValue({
                repo: {
                    owner: 'owner',
                    repo: 'repo',
                },
                sha: 'sha',
            } as any);

            mockGetInputs.mockReturnValue({
                ...defaultInputs,
                applications: 'app1, app2',
            });

            mockWaitForDeployment.mockResolvedValue({
                url: 'http://example.com',
                jwt: 'jwt',
                path: '/',
            });

            await run();

            expect(mockWaitForDeployment).toHaveBeenCalledTimes(2);
            expect(mockWaitForDeployment).toHaveBeenCalledWith(
                expect.objectContaining({
                    application: 'app1',
                }),
            );
            expect(mockWaitForDeployment).toHaveBeenCalledWith(
                expect.objectContaining({
                    application: 'app2',
                }),
            );
        });

        it('sets the env variables for each application', async () => {
            mockGetContext.mockReturnValue({
                repo: {
                    owner: 'owner',
                    repo: 'repo',
                },
                sha: 'sha',
            } as any);

            mockGetInputs.mockReturnValue({
                ...defaultInputs,
                applications: 'app1, app2',
            });

            mockWaitForDeployment.mockResolvedValue({
                url: 'http://example.com',
                jwt: 'jwt',
                path: '/',
            });

            await run();

            expect(mockExportVariable).toHaveBeenCalledTimes(4);

            expect(mockExportVariable).toHaveBeenCalledWith(
                'APP1_URL',
                'http://example.com',
            );
            expect(mockExportVariable).toHaveBeenCalledWith('APP1_VERCEL_JWT', 'jwt');

            expect(mockExportVariable).toHaveBeenCalledWith(
                'APP2_URL',
                'http://example.com',
            );
            expect(mockExportVariable).toHaveBeenCalledWith('APP2_VERCEL_JWT', 'jwt');
        });
    });
});
