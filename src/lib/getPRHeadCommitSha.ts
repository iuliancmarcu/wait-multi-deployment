export interface IGetPRHeadCommitShaOptions {
    octokit: ReturnType<typeof import('@actions/github').getOctokit>;
    owner: string;
    repo: string;
    prNumber: number;
}

export async function getPRHeadCommitSha({
    octokit,
    owner,
    repo,
    prNumber: number,
}: IGetPRHeadCommitShaOptions) {
    // Get information about the pull request
    const currentPR = await octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: number,
    });

    if (currentPR.status !== 200) {
        throw new Error('Could not get information about the current pull request');
    }

    // Get Ref from pull request
    const prSHA = currentPR.data.head.sha;

    return prSHA;
}
