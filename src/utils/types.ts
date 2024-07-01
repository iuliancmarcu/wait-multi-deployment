export type PromiseValue<T> = T extends Promise<infer U> ? U : T;

export type ArrayItem<T> = T extends Array<infer U> ? U : T;

export type Octokit = ReturnType<typeof import('@actions/github').getOctokit>;

export type ListDeploymentsResponse = PromiseValue<
    ReturnType<Octokit['rest']['repos']['listDeployments']>
>['data'];

export type Deployment = ArrayItem<ListDeploymentsResponse>;
