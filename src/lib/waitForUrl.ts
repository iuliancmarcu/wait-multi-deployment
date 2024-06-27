import axios, { AxiosError } from 'axios';
import { getRetryCount } from '../utils/getRetryCount';
import { getVercelJWT } from './getVercelJWT';
import { wait } from '../utils/wait';
import { log } from '../utils/log';

export interface IWaitForUrlOptions {
    url: string;
    path: string;
    maxTimeoutMs: number;
    checkIntervalMs: number;
    vercelPassword?: string;
}

export async function waitForUrl({
    url,
    maxTimeoutMs,
    checkIntervalMs,
    vercelPassword,
    path,
}: IWaitForUrlOptions) {
    const retries = getRetryCount(maxTimeoutMs, checkIntervalMs);

    for (let i = 0; i < retries; i++) {
        try {
            let headers = {};
            let jwt = undefined;

            if (vercelPassword) {
                const vercelJwt = await getVercelJWT({
                    url,
                    vercelPassword,
                });

                headers = {
                    Cookie: `_vercel_jwt=${vercelJwt}`,
                };

                jwt = vercelJwt;
            }

            let checkUri = new URL(path, url);

            await axios.get(checkUri.toString(), {
                headers,
            });

            log('Received success status code');

            return {
                ...(jwt && { jwt }),
                url,
                path,
            };
        } catch (e) {
            if (e instanceof AxiosError) {
                // https://axios-http.com/docs/handling_errors
                if (e.response) {
                    log(`GET status: ${e.response.status}. Attempt ${i} of ${retries}`);
                } else if (e.request) {
                    log(
                        `GET error. A request was made, but no response was received. Attempt ${i} of ${retries}`,
                    );
                    log(e.message);
                } else if (e instanceof Error) {
                    log(e.message);
                } else {
                    log(String(e));
                }
            }

            await wait(checkIntervalMs);
        }
    }

    throw new Error(`Timeout reached: Unable to connect to ${url}`);
}
