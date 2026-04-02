import { type Result, ok } from '@trezor/type-utils';

import {
    type QuotaManagerFetchCommunicationError,
    type QuotaManagerFetchDep,
} from '../quotaManagerFetch';

type PrepareChallengeSessionParams = {
    baseUrl: string | null;
};

type ChallengeResponse = {
    sessionId: string;
    challenge: string;
};

export type PrepareChallengeSession = (
    params: PrepareChallengeSessionParams,
) => Promise<Result<ChallengeResponse, QuotaManagerFetchCommunicationError>>;

export type PrepareChallengeSessionDep = {
    prepareChallengeSession: PrepareChallengeSession;
};

export type GenerateSessionId = () => string;

export type GenerateSessionIdDep = {
    generateSessionId: GenerateSessionId;
};

export const createPrepareChallengeSession =
    (deps: QuotaManagerFetchDep & GenerateSessionIdDep): PrepareChallengeSession =>
    async ({ baseUrl }) => {
        const sessionId = deps.generateSessionId();

        const challengeResponse = await deps.quotaManagerFetch({
            baseUrl,
            path: '/challenge',
            method: 'POST',
            body: { sessionId },
        });

        if (!challengeResponse.success) {
            return challengeResponse;
        }

        return ok({
            sessionId,
            challenge: (challengeResponse.payload as ChallengeResponse).challenge,
        });
    };
