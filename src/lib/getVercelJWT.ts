import axios from 'axios';
import setCookieParser from 'set-cookie-parser';
import { log } from '../utils/log';

export interface IGetVercelJWTOptions {
    url: string;
    vercelPassword: string;
}

const COOKIE_VERCEL_JWT = '_vercel_jwt';

export async function getVercelJWT({
    url,
    vercelPassword,
}: IGetVercelJWTOptions): Promise<string> {
    log('requesting vercel JWT');

    const data = new URLSearchParams();
    data.append('_vercel_password', vercelPassword);

    const response = await axios.post(url, {
        data: data.toString(),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        validateStatus: (status: number) => {
            // Vercel returns 303 with the _vercel_jwt
            return status >= 200 && status < 307;
        },
    });

    const setCookieHeader = response.headers?.['set-cookie'];

    if (!setCookieHeader) {
        throw new Error('no set-cookie header in response');
    }

    const cookies = setCookieParser(setCookieHeader);

    const vercelJwtCookie = cookies.find((cookie) => cookie.name === COOKIE_VERCEL_JWT);

    if (!vercelJwtCookie || !vercelJwtCookie.value) {
        throw new Error('no vercel JWT in response');
    }

    log('received vercel JWT');

    return vercelJwtCookie.value;
}
