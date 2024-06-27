import {
    getPRHeadCommitSha,
    IGetPRHeadCommitShaOptions,
} from '../lib/getPRHeadCommitSha';

const mockOctokit = {
    rest: {
        pulls: {
            get: jest.fn(),
        },
    },
};

const options: IGetPRHeadCommitShaOptions = {
    octokit: mockOctokit as any,
    owner: 'myOwner',
    repo: 'myRepo',
    prNumber: 123,
};

describe('getPRHeadCommitSha', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return the head commit SHA of the pull request', async () => {
        // Mock the octokit API response
        mockOctokit.rest.pulls.get.mockResolvedValueOnce({
            status: 200,
            data: {
                head: {
                    sha: 'abc123',
                },
            },
        });

        const result = await getPRHeadCommitSha(options);

        expect(mockOctokit.rest.pulls.get).toHaveBeenCalledWith({
            owner: options.owner,
            repo: options.repo,
            pull_number: options.prNumber,
        });
        expect(result).toBe('abc123');
    });

    it('should throw an error if the octokit API call fails', async () => {
        // Mock the octokit API response to simulate an error
        mockOctokit.rest.pulls.get.mockRejectedValueOnce(new Error('API error'));

        await expect(getPRHeadCommitSha(options)).rejects.toThrow('API error');
        expect(mockOctokit.rest.pulls.get).toHaveBeenCalledWith({
            owner: options.owner,
            repo: options.repo,
            pull_number: options.prNumber,
        });
    });

    it('should throw an error if the octokit API response status is not 200', async () => {
        // Mock the octokit API response to simulate a non-200 status
        mockOctokit.rest.pulls.get.mockResolvedValueOnce({
            status: 500,
            data: {},
        });

        await expect(getPRHeadCommitSha(options)).rejects.toThrow(
            'Could not get information about the current pull request',
        );
        expect(mockOctokit.rest.pulls.get).toHaveBeenCalledWith({
            owner: options.owner,
            repo: options.repo,
            pull_number: options.prNumber,
        });
    });
});
