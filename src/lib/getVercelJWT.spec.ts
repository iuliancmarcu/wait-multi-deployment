import axios from 'axios';
import setCookieParser from 'set-cookie-parser';
import { getVercelJWT, IGetVercelJWTOptions } from './getVercelJWT';

jest.mock('axios');
jest.mock('set-cookie-parser');

describe('getVercelJWT', () => {
    const mockAxios = axios as jest.Mocked<typeof axios>;
    const mockSetCookieParser = setCookieParser as jest.MockedFunction<
        typeof setCookieParser
    >;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('makes a request to get the Vercel JWT', async () => {
        const url = 'https://vercel.com/api/auth/login';
        const vercelPassword = 'password123';

        const expectedData = new URLSearchParams();
        expectedData.append('_vercel_password', vercelPassword);

        const expectedResponse = {
            headers: {
                'set-cookie': 'cookie',
            },
        };

        mockAxios.post.mockResolvedValue(expectedResponse);

        const expectedCookie = {
            name: '_vercel_jwt',
            value: 'jwt',
        };

        mockSetCookieParser.mockReturnValue([expectedCookie]);

        const result = await getVercelJWT({ url, vercelPassword });

        expect(mockAxios.post).toHaveBeenCalledWith(url, {
            data: expectedData.toString(),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            validateStatus: expect.any(Function),
        });

        expect(mockSetCookieParser).toHaveBeenCalledWith('cookie');

        expect(result).toBe(expectedCookie.value);
    });

    it('throws an error if no set-cookie header is returned', async () => {
        const url = 'https://vercel.com/api/auth/login';
        const vercelPassword = 'password123';

        mockAxios.post.mockResolvedValue({});

        await expect(getVercelJWT({ url, vercelPassword })).rejects.toThrow(
            'no set-cookie header in response',
        );
    });

    it('throws an error if no vercel JWT cookie is returned', async () => {
        const url = 'https://vercel.com/api/auth/login';
        const vercelPassword = 'password123';

        const expectedResponse = {
            headers: {
                'set-cookie': 'cookie',
            },
        };

        mockAxios.post.mockResolvedValue(expectedResponse);

        mockSetCookieParser.mockReturnValue([]);

        await expect(getVercelJWT({ url, vercelPassword })).rejects.toThrow(
            'no vercel JWT in response',
        );
    });
});
