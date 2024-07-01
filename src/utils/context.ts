import * as github from '@actions/github';

export function getContext(): typeof github.context {
    return github.context;
}
