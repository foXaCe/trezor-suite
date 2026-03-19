import type { Action, TestExplorerItem, TestResultItem } from '../../currentsApi/types';
import { computeStats, extractKeyFromAction, getTestKey, normalizeTitlePath } from '../actions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeExplorerItem = (overrides: Partial<TestExplorerItem>): TestExplorerItem => ({
    title: 'Default > Test',
    spec: 'e2e/tests/default.spec.ts',
    metrics: {
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
    },
    ...overrides,
});

const makeAction = (value: string[], op: 'incAll' | 'eq' = 'incAll'): Action => ({
    actionId: 'action-1',
    name: '[auto-quarantine] Test',
    description: 'auto',
    status: 'active',
    createdAt: '2024-01-01',
    action: [{ op: 'quarantine' }],
    matcher: {
        op: 'AND',
        cond: [{ type: 'titlePath', op, value }],
    },
});

const makeResult = (status: TestResultItem['status']): TestResultItem => ({
    cursor: 'c1',
    signature: 'sig',
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

// ---------------------------------------------------------------------------
// normalizeTitlePath
// ---------------------------------------------------------------------------

describe('normalizeTitlePath', () => {
    it('uses titlePath array when provided and non-empty', () => {
        const item = makeExplorerItem({ titlePath: ['Staking', 'Cardano', 'Stake Cardano'] });
        expect(normalizeTitlePath(item)).toEqual(['Staking', 'Cardano', 'Stake Cardano']);
    });

    it('falls back to splitting title by " > " when titlePath is absent', () => {
        const item = makeExplorerItem({ title: 'Staking > Cardano > Stake Cardano' });
        expect(normalizeTitlePath(item)).toEqual(['Staking', 'Cardano', 'Stake Cardano']);
    });

    it('falls back to splitting title when titlePath is an empty array', () => {
        const item = makeExplorerItem({ title: 'A > B', titlePath: [] });
        expect(normalizeTitlePath(item)).toEqual(['A', 'B']);
    });

    it('splits each element of titlePath by " > " (mixed format)', () => {
        // Currents sometimes returns already-joined parts inside the array
        const item = makeExplorerItem({ titlePath: ['Spec > Describe', 'Test name'] });
        expect(normalizeTitlePath(item)).toEqual(['Spec', 'Describe', 'Test name']);
    });

    it('returns a single-element array for a title with no separators', () => {
        const item = makeExplorerItem({ title: 'SimpleTest', titlePath: undefined });
        expect(normalizeTitlePath(item)).toEqual(['SimpleTest']);
    });
});

// ---------------------------------------------------------------------------
// getTestKey
// ---------------------------------------------------------------------------

describe('getTestKey', () => {
    it('returns JSON.stringify of the normalized title path', () => {
        const item = makeExplorerItem({ titlePath: ['A', 'B', 'C'] });
        expect(getTestKey(item)).toBe(JSON.stringify(['A', 'B', 'C']));
    });

    it('produces the same key for titlePath array and equivalent " > "-joined title', () => {
        const fromArray = getTestKey(makeExplorerItem({ titlePath: ['X', 'Y', 'Z'] }));
        const fromTitle = getTestKey(
            makeExplorerItem({ title: 'X > Y > Z', titlePath: undefined }),
        );
        expect(fromArray).toBe(fromTitle);
    });
});

// ---------------------------------------------------------------------------
// extractKeyFromAction
// ---------------------------------------------------------------------------

describe('extractKeyFromAction', () => {
    it('returns JSON-stringified value for an incAll titlePath condition', () => {
        const action = makeAction(['Staking', 'Cardano', 'Stake Cardano'], 'incAll');
        expect(extractKeyFromAction(action)).toBe(
            JSON.stringify(['Staking', 'Cardano', 'Stake Cardano']),
        );
    });

    it('returns JSON-stringified value for an eq titlePath condition', () => {
        const action = makeAction(['A', 'B'], 'eq');
        expect(extractKeyFromAction(action)).toBe(JSON.stringify(['A', 'B']));
    });

    it('returns undefined when no titlePath condition exists', () => {
        const action: Action = {
            ...makeAction([]),
            matcher: {
                op: 'AND',
                cond: [{ type: 'spec', op: 'eq', value: 'some.spec.ts' }],
            },
        };
        expect(extractKeyFromAction(action)).toBeUndefined();
    });

    it('returns undefined when the titlePath condition value is not an array', () => {
        const action: Action = {
            ...makeAction([]),
            matcher: {
                op: 'AND',
                // Intentionally wrong: value is a string, not an array
                cond: [{ type: 'titlePath', op: 'incAll', value: 'not-an-array' }],
            },
        };
        expect(extractKeyFromAction(action)).toBeUndefined();
    });

    it('returns undefined when matcher has no conditions', () => {
        const action: Action = {
            ...makeAction([]),
            matcher: { op: 'AND', cond: [] },
        };
        expect(extractKeyFromAction(action)).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// computeStats
// ---------------------------------------------------------------------------

describe('computeStats', () => {
    it('counts passed results correctly', () => {
        const results = [makeResult('passed'), makeResult('passed')];
        const stats = computeStats(results);
        expect(stats.passes).toBe(2);
        expect(stats.failures).toBe(0);
        expect(stats.executions).toBe(2);
        expect(stats.failureRate).toBe(0);
    });

    it('counts failed results as failures', () => {
        const results = [makeResult('failed'), makeResult('passed')];
        const stats = computeStats(results);
        expect(stats.failures).toBe(1);
        expect(stats.passes).toBe(1);
        expect(stats.failureRate).toBe(0.5);
    });

    it('treats "skipped" status as a failure', () => {
        const results = [makeResult('skipped'), makeResult('passed')];
        const stats = computeStats(results);
        expect(stats.failures).toBe(1);
        expect(stats.passes).toBe(1);
    });

    it('handles mixed statuses', () => {
        const results = [
            makeResult('passed'),
            makeResult('failed'),
            makeResult('skipped'),
            makeResult('passed'),
        ];
        const stats = computeStats(results);
        expect(stats.executions).toBe(4);
        expect(stats.passes).toBe(2);
        expect(stats.failures).toBe(2); // failed + skipped
        expect(stats.failureRate).toBe(0.5);
    });

    it('returns 0 failureRate for an empty results list', () => {
        const stats = computeStats([]);
        expect(stats.failureRate).toBe(0);
        expect(stats.executions).toBe(0);
        expect(stats.passes).toBe(0);
        expect(stats.failures).toBe(0);
    });

    it('returns 1.0 failureRate when all results failed', () => {
        const stats = computeStats([makeResult('failed'), makeResult('failed')]);
        expect(stats.failureRate).toBe(1);
        expect(stats.passes).toBe(0);
    });
});
