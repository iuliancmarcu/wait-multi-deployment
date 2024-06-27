import { context } from '@actions/github';

export function getContext(): typeof context {
    return context;
}
