import {
    getLatestDeployment,
    IGetLatestDeploymentOptions,
} from '../lib/getLatestDeployment';

const mockOctokit = {
    rest: {
        repos: {
            listDeployments: jest.fn(),
        },
    },
};

const options: IGetLatestDeploymentOptions = {
    octokit: mockOctokit as any,
    owner: 'my-org',
    repo: 'my-repo',
    environment: 'production - my-app',
    actorName: 'john.doe',
};

describe('getLatestDeployment', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('calls listDeployments with the correct parameters', async () => {
        mockOctokit.rest.repos.listDeployments.mockResolvedValueOnce({
            data: [
                {
                    id: 3,
                    created_at: '2022-01-03T00:00:00Z',
                    creator: { login: 'john.doe' },
                },
            ],
        });

        await getLatestDeployment(options);

        expect(mockOctokit.rest.repos.listDeployments).toHaveBeenCalledWith({
            owner: options.owner,
            repo: options.repo,
            environment: 'production - my-app',
        });
    });

    it('returns the latest deployment', async () => {
        const mockDeployments = [
            { id: 1, created_at: '2022-01-01T00:00:00Z', creator: { login: 'john.doe' } },
            { id: 2, created_at: '2022-01-02T00:00:00Z', creator: { login: 'john.doe' } },
            { id: 3, created_at: '2022-01-03T00:00:00Z', creator: { login: 'john.doe' } },
        ];
        mockOctokit.rest.repos.listDeployments.mockResolvedValueOnce({
            data: mockDeployments,
        });

        const latestDeployment = await getLatestDeployment(options);

        expect(latestDeployment).toEqual(mockDeployments[2]);
    });

    it('throws an error if no deployments are found', async () => {
        mockOctokit.rest.repos.listDeployments.mockResolvedValueOnce({ data: [] });

        await expect(getLatestDeployment(options)).rejects.toThrow(
            'Fetch failure: Failed to find latest deployment for environment "production - my-app" and actor "john.doe"',
        );
    });

    it('throws an error if listDeployments fails', async () => {
        mockOctokit.rest.repos.listDeployments.mockRejectedValueOnce(
            new Error('error fetching'),
        );

        await expect(getLatestDeployment(options)).rejects.toThrow(
            'Fetch failure: Failed to find latest deployment for environment "production - my-app" and actor "john.doe"',
        );
    });
});
