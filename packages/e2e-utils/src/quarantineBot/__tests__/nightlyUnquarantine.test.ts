import { deleteAction, getLatestRunIdOnBranch, getResultsFromRun } from '../../currentsApi/api';
import type { Action, TestResultItem } from '../../currentsApi/types';
import { findSignaturesForTitleKeys, getAutoQuarantineActions } from '../api';
import { nightlyUnquarantineFromLatestRun } from '../nightlyUnquarantine';
import type { SlackEvent } from '../types';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('../api', () => ({
    getAutoQuarantineActions: jest.fn(),
    findSignaturesForTitleKeys: jest.fn(),
}));

jest.mock('../../currentsApi/api', () => ({
    deleteAction: jest.fn(),
    getLatestRunIdOnBranch: jest.fn(),
    getResultsFromRun: jest.fn(),
}));

const mockGetAutoQuarantineActions = getAutoQuarantineActions as jest.MockedFunction<
    typeof getAutoQuarantineActions
>;
const mockFindSignaturesForTitleKeys = findSignaturesForTitleKeys as jest.MockedFunction<
    typeof findSignaturesForTitleKeys
>;
const mockDeleteAction = deleteAction as jest.MockedFunction<typeof deleteAction>;
const mockGetLatestRunIdOnBranch = getLatestRunIdOnBranch as jest.MockedFunction<
    typeof getLatestRunIdOnBranch
>;
const mockGetResultsFromRun = getResultsFromRun as jest.MockedFunction<typeof getResultsFromRun>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TITLE_PATH = ['Suite', 'Test'];
const TITLE_KEY = JSON.stringify(TITLE_PATH);

const makeAction = (titlePath: string[] = TITLE_PATH, id = 'act-1'): Action => ({
    actionId: id,
    name: '[auto-quarantine] Suite > Test',
    description: '',
    status: 'active',
    createdAt: '2024-01-01',
    action: [{ op: 'quarantine' }],
    matcher: {
        op: 'AND',
        cond: [{ type: 'titlePath', op: 'incAll', value: titlePath }],
    },
});

const makeResult = (status: TestResultItem['status']): TestResultItem => ({
    cursor: `c-${Math.random()}`,
    signature: 'sig1',
    createdAt: '2024-01-01',
    runId: 'latest-run',
    instanceId: 'inst1',
    spec: 'test.spec.ts',
    flaky: false,
    duration: 1000,
    status,
    commit: {
        branch: 'develop',
        sha: 'abc',
        authorName: 'A',
        authorEmail: 'a@a.com',
        message: 'm',
    },
});

// ---------------------------------------------------------------------------
// nightlyUnquarantineFromLatestRun
// ---------------------------------------------------------------------------

describe('nightlyUnquarantineFromLatestRun', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns early when there are no auto-quarantined actions', async () => {
        mockGetAutoQuarantineActions.mockResolvedValueOnce([]);

        const events: SlackEvent[] = [];
        await nightlyUnquarantineFromLatestRun('proj1', 'Web', events);

        expect(mockGetLatestRunIdOnBranch).not.toHaveBeenCalled();
        expect(events).toHaveLength(0);
    });

    it('returns early when no run is found on the develop branch', async () => {
        mockGetAutoQuarantineActions.mockResolvedValueOnce([makeAction()]);
        mockFindSignaturesForTitleKeys.mockResolvedValueOnce(new Map([[TITLE_KEY, 'sig1']]));
        mockGetLatestRunIdOnBranch.mockResolvedValueOnce(null);

        const events: SlackEvent[] = [];
        await nightlyUnquarantineFromLatestRun('proj1', 'Web', events);

        expect(mockGetResultsFromRun).not.toHaveBeenCalled();
        expect(events).toHaveLength(0);
    });

    it('keeps quarantine when the test has no signature in the explorer', async () => {
        mockGetAutoQuarantineActions.mockResolvedValueOnce([makeAction()]);
        // Signature not found for this key
        mockFindSignaturesForTitleKeys.mockResolvedValueOnce(new Map());
        mockGetLatestRunIdOnBranch.mockResolvedValueOnce('latest-run');

        const events: SlackEvent[] = [];
        await nightlyUnquarantineFromLatestRun('proj1', 'Web', events);

        expect(mockGetResultsFromRun).not.toHaveBeenCalled();
        expect(mockDeleteAction).not.toHaveBeenCalled();
        expect(events).toHaveLength(0);
    });

    it('keeps quarantine when the test is not found in the latest run (0 results)', async () => {
        mockGetAutoQuarantineActions.mockResolvedValueOnce([makeAction()]);
        mockFindSignaturesForTitleKeys.mockResolvedValueOnce(new Map([[TITLE_KEY, 'sig1']]));
        mockGetLatestRunIdOnBranch.mockResolvedValueOnce('latest-run');
        mockGetResultsFromRun.mockResolvedValueOnce([]); // no results from this run

        const events: SlackEvent[] = [];
        await nightlyUnquarantineFromLatestRun('proj1', 'Web', events);

        expect(mockDeleteAction).not.toHaveBeenCalled();
        expect(events).toHaveLength(0);
    });

    it('keeps quarantine when not all instances passed (partial failure)', async () => {
        mockGetAutoQuarantineActions.mockResolvedValueOnce([makeAction()]);
        mockFindSignaturesForTitleKeys.mockResolvedValueOnce(new Map([[TITLE_KEY, 'sig1']]));
        mockGetLatestRunIdOnBranch.mockResolvedValueOnce('latest-run');
        // 2 instances: 1 passed, 1 failed → not all passed
        mockGetResultsFromRun.mockResolvedValueOnce([makeResult('passed'), makeResult('failed')]);

        const events: SlackEvent[] = [];
        await nightlyUnquarantineFromLatestRun('proj1', 'Web', events);

        expect(mockDeleteAction).not.toHaveBeenCalled();
        expect(events).toHaveLength(0);
    });

    it('unquarantines when ALL instances in the latest run passed', async () => {
        mockGetAutoQuarantineActions.mockResolvedValueOnce([makeAction()]);
        mockFindSignaturesForTitleKeys.mockResolvedValueOnce(new Map([[TITLE_KEY, 'sig1']]));
        mockGetLatestRunIdOnBranch.mockResolvedValueOnce('latest-run');
        // 2 instances, both passed
        mockGetResultsFromRun.mockResolvedValueOnce([makeResult('passed'), makeResult('passed')]);
        mockDeleteAction.mockResolvedValueOnce(undefined);

        const events: SlackEvent[] = [];
        await nightlyUnquarantineFromLatestRun('proj1', 'Web', events);

        expect(mockDeleteAction).toHaveBeenCalledWith('act-1');
        expect(events).toHaveLength(1);
        expect(events[0].kind).toBe('unquarantined');
        expect((events[0] as Extract<SlackEvent, { kind: 'unquarantined' }>).passes).toBe(2);
        expect((events[0] as Extract<SlackEvent, { kind: 'unquarantined' }>).executions).toBe(2);
        expect((events[0] as Extract<SlackEvent, { kind: 'unquarantined' }>).titlePath).toEqual(
            TITLE_PATH,
        );
    });

    it('handles multiple quarantined tests: unquarantines only the fully-passing ones', async () => {
        const action1 = makeAction(['Suite', 'Passes'], 'act-pass');
        const action2 = makeAction(['Suite', 'Fails'], 'act-fail');
        const key1 = JSON.stringify(['Suite', 'Passes']);
        const key2 = JSON.stringify(['Suite', 'Fails']);

        mockGetAutoQuarantineActions.mockResolvedValueOnce([action1, action2]);
        mockFindSignaturesForTitleKeys.mockResolvedValueOnce(
            new Map([
                [key1, 'sig-pass'],
                [key2, 'sig-fail'],
            ]),
        );
        mockGetLatestRunIdOnBranch.mockResolvedValueOnce('latest-run');

        // sig-pass: all passed; sig-fail: one failure
        mockGetResultsFromRun.mockImplementation(signature => {
            if (signature === 'sig-pass') return Promise.resolve([makeResult('passed')]);
            if (signature === 'sig-fail') return Promise.resolve([makeResult('failed')]);

            return Promise.resolve([]);
        });
        mockDeleteAction.mockResolvedValue(undefined);

        const events: SlackEvent[] = [];
        await nightlyUnquarantineFromLatestRun('proj1', 'Web', events);

        expect(mockDeleteAction).toHaveBeenCalledTimes(1);
        expect(mockDeleteAction).toHaveBeenCalledWith('act-pass');
        expect(events).toHaveLength(1);
        expect(events[0].kind).toBe('unquarantined');
    });

    it('skips actions without a valid titlePath condition', async () => {
        const badAction: Action = {
            actionId: 'act-bad',
            name: '[auto-quarantine] No matcher',
            description: '',
            status: 'active',
            createdAt: '2024-01-01',
            action: [{ op: 'quarantine' }],
            matcher: { op: 'AND', cond: [] }, // missing titlePath condition
        };

        mockGetAutoQuarantineActions.mockResolvedValueOnce([badAction]);
        mockFindSignaturesForTitleKeys.mockResolvedValueOnce(new Map());
        mockGetLatestRunIdOnBranch.mockResolvedValueOnce('latest-run');

        const events: SlackEvent[] = [];
        await expect(
            nightlyUnquarantineFromLatestRun('proj1', 'Web', events),
        ).resolves.toBeUndefined();
        expect(mockDeleteAction).not.toHaveBeenCalled();
    });
});
