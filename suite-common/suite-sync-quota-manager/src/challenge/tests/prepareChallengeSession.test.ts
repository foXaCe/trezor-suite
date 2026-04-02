import { ok } from '@trezor/type-utils';

import { createPrepareChallengeSession } from '../prepareChallengeSession';

describe(createPrepareChallengeSession.name, () => {
    it('should prepare challenge unique for each session', async () => {
        const generateSessionId = jest
            .fn()
            .mockReturnValueOnce('mocked-session-id')
            .mockReturnValueOnce('mocked-session-id-2');

        const quotaManagerFetch = jest
            .fn()
            .mockResolvedValueOnce(
                ok({
                    challenge: 'b4bc999327b7d2685890530b2814b56bba8549459aebdd551f33a1de2c5a2a8d',
                }),
            )
            .mockResolvedValueOnce(
                ok({
                    challenge:
                        'b4bc999327b7d2685890530b2814b56bba8549459aebdd551f33a1de2c5a2a8dSecond',
                }),
            );
        const prepareChallengeSession = createPrepareChallengeSession({
            generateSessionId,
            quotaManagerFetch,
        });

        const challengeSession = await prepareChallengeSession({
            baseUrl: 'https://example.com',
        });

        const challengeSession2 = await prepareChallengeSession({
            baseUrl: 'https://example.com',
        });

        expect(challengeSession).toEqual(
            ok({
                sessionId: 'mocked-session-id',
                challenge: 'b4bc999327b7d2685890530b2814b56bba8549459aebdd551f33a1de2c5a2a8d',
            }),
        );

        expect(challengeSession2).toEqual(
            ok({
                sessionId: 'mocked-session-id-2',
                challenge: 'b4bc999327b7d2685890530b2814b56bba8549459aebdd551f33a1de2c5a2a8dSecond',
            }),
        );

        expect(quotaManagerFetch).toHaveBeenNthCalledWith(1, {
            baseUrl: 'https://example.com',
            path: '/challenge',
            method: 'POST',
            body: { sessionId: 'mocked-session-id' },
        });

        expect(quotaManagerFetch).toHaveBeenNthCalledWith(2, {
            baseUrl: 'https://example.com',
            path: '/challenge',
            method: 'POST',
            body: { sessionId: 'mocked-session-id-2' },
        });

        expect(generateSessionId).toHaveBeenCalledTimes(2);
    });
});
