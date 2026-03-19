import {
    deleteAction,
    getLastNResults,
    getLastNResultsFromDistinctBranches,
} from '../../currentsApi/api';
import type { Action, TestExplorerItem, TestResultItem } from '../../currentsApi/types';
import { createQuarantineAction } from '../api';
import { quarantineFailingTests, unquarantinePassingTests } from '../quarantine';
import type { SlackEvent } from '../types';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

jest.mock('../api', () => ({
    createQuarantineAction: jest.fn(),
}));

jest.mock('../../currentsApi/api', () => ({
    deleteAction: jest.fn(),
    getLastNResults: jest.fn(),
    getLastNResultsFromDistinctBranches: jest.fn(),
}));

const mockCreateQuarantineAction = createQuarantineAction as jest.MockedFunction<
    typeof createQuarantineAction
>;
const mockDeleteAction = deleteAction as jest.MockedFunction<typeof deleteAction>;
const mockGetLastNResults = getLastNResults as jest.MockedFunction<typeof getLastNResults>;
const mockGetLastNResultsFromDistinctBranches =
    getLastNResultsFromDistinctBranches as jest.MockedFunction<
        typeof getLastNResultsFromDistinctBranches
    >;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeMetrics = (
    overrides: Partial<TestExplorerItem['metrics']> = {},
): TestExplorerItem['metrics'] => ({
    executions: 10,
    failures: 0,
    passes: 10,
    failureRate: 0,
    flakinessRate: 0,
    flaky: 0,
    ignored: 0,
    avgDurationMs: 1000,
    flakinessVolume: 0,
    failureVolume: 0,
    durationVolume: 10000,
    ...overrides,
});

const makeExplorerItem = (overrides: Partial<TestExplorerItem>): TestExplorerItem => ({
    title: 'Suite > Test',
    spec: 'test.spec.ts',
    signature: 'sig1',
    metrics: makeMetrics(),
    ...overrides,
});

const makeAction = (titlePath: string[]): Action => ({
    actionId: 'act-1',
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
    runId: 'run1',
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

const makeFailedResults = (total: number, failCount: number): TestResultItem[] => [
    ...Array.from({ length: failCount }, () => makeResult('failed')),
    ...Array.from({ length: total - failCount }, () => makeResult('passed')),
];

// ---------------------------------------------------------------------------
// quarantineFailingTests
// ---------------------------------------------------------------------------

describe('quarantineFailingTests', () => {
    beforeEach(() => jest.clearAllMocks());

    it('skips tests that have fewer executions than the threshold in the explorer metrics', async () => {
        // QUARANTINE_LAST_N_EXECUTIONS = 5; metrics.executions < 5 → skip
        const test = makeExplorerItem({
            metrics: makeMetrics({ executions: 2, failureRate: 1.0 }),
        });
        const events: SlackEvent[] = [];
        await quarantineFailingTests('proj1', 'Web', [], [test], events);

        expect(mockGetLastNResultsFromDistinctBranches).not.toHaveBeenCalled();
        expect(events).toHaveLength(0);
    });

    it('skips tests below the pre-filter failure rate threshold', async () => {
        // PRE_FILTER_FAILURE_RATE = 0.02; 0% failure rate → skip
        const test = makeExplorerItem({
            metrics: makeMetrics({ executions: 10, failureRate: 0 }),
        });
        const events: SlackEvent[] = [];
        await quarantineFailingTests('proj1', 'Web', [], [test], events);

        expect(mockGetLastNResultsFromDistinctBranches).not.toHaveBeenCalled();
        expect(events).toHaveLength(0);
    });

    it('skips tests without a signature', async () => {
        const test = makeExplorerItem({
            signature: undefined,
            metrics: makeMetrics({ executions: 10, failureRate: 0.8 }),
        });
        const events: SlackEvent[] = [];
        await quarantineFailingTests('proj1', 'Web', [], [test], events);

        expect(mockGetLastNResultsFromDistinctBranches).not.toHaveBeenCalled();
    });

    it('skips already-quarantined tests', async () => {
        const titlePath = ['Suite', 'Test'];
        const test = makeExplorerItem({
            titlePath,
            metrics: makeMetrics({ executions: 10, failureRate: 0.8 }),
        });
        const existingAction = makeAction(titlePath);
        const events: SlackEvent[] = [];
        await quarantineFailingTests('proj1', 'Web', [existingAction], [test], events);

        expect(mockGetLastNResultsFromDistinctBranches).not.toHaveBeenCalled();
        expect(events).toHaveLength(0);
    });

    it('skips tests that have fewer individual results than QUARANTINE_LAST_N_EXECUTIONS', async () => {
        // QUARANTINE_LAST_N_EXECUTIONS = 5; return only 3 results
        const test = makeExplorerItem({
            metrics: makeMetrics({ executions: 10, failureRate: 0.8 }),
        });
        mockGetLastNResultsFromDistinctBranches.mockResolvedValueOnce(
            makeFailedResults(3, 3), // only 3 results
        );
        const events: SlackEvent[] = [];
        await quarantineFailingTests('proj1', 'Web', [], [test], events);

        expect(mockCreateQuarantineAction).not.toHaveBeenCalled();
        expect(events).toHaveLength(0);
    });

    it('skips tests below the QUARANTINE_FAILURE_RATE threshold (< 60%)', async () => {
        const test = makeExplorerItem({
            metrics: makeMetrics({ executions: 10, failureRate: 0.5 }),
        });
        // 2/5 = 40% failure rate — below 60% threshold
        mockGetLastNResultsFromDistinctBranches.mockResolvedValueOnce(makeFailedResults(5, 2));
        const events: SlackEvent[] = [];
        await quarantineFailingTests('proj1', 'Web', [], [test], events);

        expect(mockCreateQuarantineAction).not.toHaveBeenCalled();
        expect(events).toHaveLength(0);
    });

    it('quarantines a test that meets the failure rate threshold (≥ 60%)', async () => {
        const test = makeExplorerItem({
            titlePath: ['Suite', 'Flaky test'],
            metrics: makeMetrics({ executions: 10, failureRate: 0.8 }),
        });
        const mockAction = makeAction(['Suite', 'Flaky test']);
        mockGetLastNResultsFromDistinctBranches.mockResolvedValueOnce(makeFailedResults(5, 4)); // 80%
        mockCreateQuarantineAction.mockResolvedValueOnce(mockAction);

        const events: SlackEvent[] = [];
        await quarantineFailingTests('proj1', 'Web', [], [test], events);

        expect(mockCreateQuarantineAction).toHaveBeenCalledTimes(1);
        expect(events).toHaveLength(1);
        expect(events[0].kind).toBe('quarantined');
        expect((events[0] as Extract<SlackEvent, { kind: 'quarantined' }>).failures).toBe(4);
        expect((events[0] as Extract<SlackEvent, { kind: 'quarantined' }>).executions).toBe(5);
    });

    it('quarantines at exactly the 60% boundary', async () => {
        const test = makeExplorerItem({
            metrics: makeMetrics({ executions: 10, failureRate: 0.6 }),
        });
        mockGetLastNResultsFromDistinctBranches.mockResolvedValueOnce(makeFailedResults(5, 3)); // 60%
        mockCreateQuarantineAction.mockResolvedValueOnce(makeAction(['Suite', 'Test']));

        const events: SlackEvent[] = [];
        await quarantineFailingTests('proj1', 'Web', [], [test], events);

        expect(mockCreateQuarantineAction).toHaveBeenCalledTimes(1);
        expect(events).toHaveLength(1);
    });
});

// ---------------------------------------------------------------------------
// unquarantinePassingTests
// ---------------------------------------------------------------------------

describe('unquarantinePassingTests', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns early when there are no existing actions', async () => {
        const events: SlackEvent[] = [];
        await unquarantinePassingTests('proj1', 'Web', [], [], events);

        expect(mockGetLastNResults).not.toHaveBeenCalled();
        expect(events).toHaveLength(0);
    });

    it('keeps quarantine when the test is not found in the explorer results', async () => {
        const action = makeAction(['Suite', 'Test']);
        // The activeTests list is empty — test not found
        const events: SlackEvent[] = [];
        await unquarantinePassingTests('proj1', 'Web', [action], [], events);

        expect(mockGetLastNResults).not.toHaveBeenCalled();
        expect(mockDeleteAction).not.toHaveBeenCalled();
        expect(events).toHaveLength(0);
    });

    it('keeps quarantine when the test has fewer results than UNQUARANTINE_LAST_N_EXECUTIONS', async () => {
        const titlePath = ['Suite', 'Test'];
        const action = makeAction(titlePath);
        const test = makeExplorerItem({ titlePath });

        // UNQUARANTINE_LAST_N_EXECUTIONS = 25; return only 10
        mockGetLastNResults.mockResolvedValueOnce(
            Array.from({ length: 10 }, () => makeResult('passed')),
        );

        const events: SlackEvent[] = [];
        await unquarantinePassingTests('proj1', 'Web', [action], [test], events);

        expect(mockDeleteAction).not.toHaveBeenCalled();
        expect(events).toHaveLength(0);
    });

    it('keeps quarantine when the failure rate is still above UNQUARANTINE_FAILURE_RATE', async () => {
        const titlePath = ['Suite', 'Test'];
        const action = makeAction(titlePath);
        const test = makeExplorerItem({ titlePath });

        // UNQUARANTINE_FAILURE_RATE = 0 (must be 0%); 1/25 is still > 0%
        mockGetLastNResults.mockResolvedValueOnce([
            ...Array.from({ length: 24 }, () => makeResult('passed')),
            makeResult('failed'),
        ]);

        const events: SlackEvent[] = [];
        await unquarantinePassingTests('proj1', 'Web', [action], [test], events);

        expect(mockDeleteAction).not.toHaveBeenCalled();
        expect(events).toHaveLength(0);
    });

    it('unquarantines a test that has a 0% failure rate over UNQUARANTINE_LAST_N_EXECUTIONS', async () => {
        const titlePath = ['Suite', 'Test'];
        const action = makeAction(titlePath);
        const test = makeExplorerItem({ titlePath });

        mockGetLastNResults.mockResolvedValueOnce(
            Array.from({ length: 25 }, () => makeResult('passed')),
        );
        mockDeleteAction.mockResolvedValueOnce(undefined);

        const events: SlackEvent[] = [];
        await unquarantinePassingTests('proj1', 'Web', [action], [test], events);

        expect(mockDeleteAction).toHaveBeenCalledWith('act-1');
        expect(events).toHaveLength(1);
        expect(events[0].kind).toBe('unquarantined');
        expect((events[0] as Extract<SlackEvent, { kind: 'unquarantined' }>).passes).toBe(25);
    });

    it('handles actions without a valid titlePath condition gracefully', async () => {
        const action: Action = {
            actionId: 'act-bad',
            name: '[auto-quarantine] Bad action',
            description: '',
            status: 'active',
            createdAt: '2024-01-01',
            action: [{ op: 'quarantine' }],
            matcher: { op: 'AND', cond: [] }, // no titlePath condition
        };

        const events: SlackEvent[] = [];
        // Should not throw; the bad action is simply skipped
        await expect(
            unquarantinePassingTests('proj1', 'Web', [action], [], events),
        ).resolves.toBeUndefined();
        expect(mockDeleteAction).not.toHaveBeenCalled();
    });
});
