import {
    getLastNResults,
    getLastNResultsFromDistinctBranches,
    getLatestRunIdOnBranch,
    getResultsFromRun,
    paginateTestResults,
} from '../api';
import type { RunResponse, TestResultItem, TestResultsResponse } from '../types';

// ---------------------------------------------------------------------------
// Setup: mock global.fetch and CURRENTS_API_KEY
// ---------------------------------------------------------------------------

process.env.CURRENTS_API_KEY = 'test-api-key';

const mockFetch = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
global.fetch = mockFetch as unknown as typeof fetch;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let cursorCounter = 0;

const makeResult = (
    overrides: Partial<TestResultItem> & { branch?: string } = {},
): TestResultItem => {
    const { branch = 'develop', ...rest } = overrides;
    cursorCounter++;

    return {
        cursor: `cursor-${cursorCounter}`,
        signature: 'sig1',
        createdAt: '2024-01-01T00:00:00Z',
        runId: 'run1',
        instanceId: 'inst1',
        spec: 'test.spec.ts',
        status: 'passed',
        flaky: false,
        duration: 1000,
        commit: { branch, sha: 'abc', authorName: 'A', authorEmail: 'a@a.com', message: 'm' },
        ...rest,
    };
};

/** Build a minimal fetch Response for a test-results page. */
function mockResultsPage(items: TestResultItem[], hasMore: boolean): Response {
    const body: TestResultsResponse = {
        status: 'ok',
        has_more: hasMore,
        data: items,
    };

    return {
        ok: true,
        status: 200,
        json: () => Promise.resolve(body),
        headers: { get: () => null },
    } as unknown as Response;
}

/** Build a minimal fetch Response for a run. */
function mockRunResponse(runId: string, projectId = 'proj1'): Response {
    const body: RunResponse = {
        status: 'ok',
        data: { runId, projectId, specs: [] },
    };

    return {
        ok: true,
        status: 200,
        json: () => Promise.resolve(body),
        headers: { get: () => null },
    } as unknown as Response;
}

function mockErrorResponse(status: number, body = ''): Response {
    return {
        ok: false,
        status,
        text: () => Promise.resolve(body),
        headers: { get: () => null },
    } as unknown as Response;
}

// ---------------------------------------------------------------------------
// paginateTestResults
// ---------------------------------------------------------------------------

describe('paginateTestResults', () => {
    beforeEach(() => mockFetch.mockReset());

    it('yields a single page of results', async () => {
        const items = [makeResult({ status: 'passed' }), makeResult({ status: 'failed' })];
        mockFetch.mockResolvedValueOnce(mockResultsPage(items, false));

        const pages: TestResultItem[][] = [];
        for await (const page of paginateTestResults('sig1', 2)) {
            pages.push(page);
        }
        expect(pages).toHaveLength(1);
        expect(pages[0]).toHaveLength(2);
    });

    it('paginates across multiple pages using the cursor', async () => {
        const page1 = [makeResult({ status: 'passed' })];
        const page2 = [makeResult({ status: 'failed' })];
        mockFetch
            .mockResolvedValueOnce(mockResultsPage(page1, true))
            .mockResolvedValueOnce(mockResultsPage(page2, false));

        const allResults: TestResultItem[] = [];
        for await (const page of paginateTestResults('sig1', 2)) {
            allResults.push(...page);
        }
        expect(allResults).toHaveLength(2);
        expect(mockFetch).toHaveBeenCalledTimes(2);
        // Second call must include starting_after cursor
        const secondCallUrl = mockFetch.mock.calls[1][0] as string;
        expect(secondCallUrl).toContain('starting_after=');
    });

    it('filters out pending results', async () => {
        const items = [
            makeResult({ status: 'passed' }),
            makeResult({ status: 'pending' }),
            makeResult({ status: 'failed' }),
        ];
        mockFetch.mockResolvedValueOnce(mockResultsPage(items, false));

        const allResults: TestResultItem[] = [];
        for await (const page of paginateTestResults('sig1', 2)) {
            allResults.push(...page);
        }
        expect(allResults).toHaveLength(2);
        expect(allResults.every(r => r.status !== 'pending')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// getLastNResults
// ---------------------------------------------------------------------------

describe('getLastNResults', () => {
    beforeEach(() => mockFetch.mockReset());

    it('returns exactly N results when more are available', async () => {
        const items = Array.from({ length: 10 }, () => makeResult());
        mockFetch.mockResolvedValue(mockResultsPage(items, false));

        const results = await getLastNResults('sig1', 5, 2);
        expect(results).toHaveLength(5);
    });

    it('returns all results when fewer than N are available', async () => {
        const items = [makeResult(), makeResult()];
        mockFetch.mockResolvedValue(mockResultsPage(items, false));

        const results = await getLastNResults('sig1', 10, 2);
        expect(results).toHaveLength(2);
    });

    it('stops paginating once N results have been collected', async () => {
        // Page size is 10 (TEST_RESULTS_PAGE_SIZE). If we ask for 5 results and
        // the first page already has 10, we should make only one fetch call.
        const items = Array.from({ length: 10 }, () => makeResult());
        mockFetch.mockResolvedValue(mockResultsPage(items, true)); // has_more=true, but we stop early

        await getLastNResults('sig1', 5, 2);
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });
});

// ---------------------------------------------------------------------------
// getLastNResultsFromDistinctBranches
// ---------------------------------------------------------------------------

describe('getLastNResultsFromDistinctBranches', () => {
    beforeEach(() => mockFetch.mockReset());

    it('includes multiple results from "develop" branch', async () => {
        // develop is the configured DEVELOP_BRANCH constant
        const items = [
            makeResult({ branch: 'develop' }),
            makeResult({ branch: 'develop' }),
            makeResult({ branch: 'develop' }),
        ];
        mockFetch.mockResolvedValue(mockResultsPage(items, false));

        const results = await getLastNResultsFromDistinctBranches('sig1', 3, 2);
        expect(results).toHaveLength(3);
    });

    it('allows only one result per non-develop branch', async () => {
        const items = [
            makeResult({ branch: 'feature/a' }),
            makeResult({ branch: 'feature/a' }), // duplicate – should be skipped
            makeResult({ branch: 'feature/b' }),
        ];
        mockFetch.mockResolvedValue(mockResultsPage(items, false));

        const results = await getLastNResultsFromDistinctBranches('sig1', 5, 2);
        expect(results).toHaveLength(2); // only one per non-develop branch
        const branches = results.map(r => r.commit.branch);
        expect(branches).toContain('feature/a');
        expect(branches).toContain('feature/b');
    });

    it('mixes develop (multiple) and non-develop (deduplicated) results', async () => {
        const items = [
            makeResult({ branch: 'develop' }),
            makeResult({ branch: 'develop' }),
            makeResult({ branch: 'feature/x' }),
            makeResult({ branch: 'feature/x' }), // duplicate non-develop
        ];
        mockFetch.mockResolvedValue(mockResultsPage(items, false));

        const results = await getLastNResultsFromDistinctBranches('sig1', 5, 2);
        // 2 develop + 1 feature/x = 3 results (second feature/x is skipped)
        expect(results).toHaveLength(3);
    });

    it('stops collecting once numberOfResults is reached', async () => {
        const items = Array.from({ length: 10 }, (_, i) => makeResult({ branch: `branch-${i}` }));
        mockFetch.mockResolvedValue(mockResultsPage(items, false));

        const results = await getLastNResultsFromDistinctBranches('sig1', 3, 2);
        expect(results).toHaveLength(3);
    });
});

// ---------------------------------------------------------------------------
// getResultsFromRun
// ---------------------------------------------------------------------------

describe('getResultsFromRun', () => {
    beforeEach(() => mockFetch.mockReset());

    it('returns only results that belong to the target runId', async () => {
        const items = [
            makeResult({ runId: 'target-run' }),
            makeResult({ runId: 'other-run' }),
            makeResult({ runId: 'target-run' }),
        ];
        mockFetch.mockResolvedValue(mockResultsPage(items, false));

        const results = await getResultsFromRun('sig1', 'target-run', 2);
        expect(results).toHaveLength(2);
        expect(results.every(r => r.runId === 'target-run')).toBe(true);
    });

    it('stops paginating when a full page has no matching entries', async () => {
        // Page 1: has matching entries (keeps paginating)
        // Page 2: no matching entries (stops)
        const page1 = [makeResult({ runId: 'target-run' }), makeResult({ runId: 'other-run' })];
        const page2 = [makeResult({ runId: 'old-run' }), makeResult({ runId: 'old-run-2' })];

        mockFetch
            .mockResolvedValueOnce(mockResultsPage(page1, true))
            .mockResolvedValueOnce(mockResultsPage(page2, true)); // has_more=true, but should stop

        const results = await getResultsFromRun('sig1', 'target-run', 2);
        expect(results).toHaveLength(1);
        expect(mockFetch).toHaveBeenCalledTimes(2); // stopped after page 2 had no matches
    });

    it('returns an empty array when no results match the runId', async () => {
        const items = [makeResult({ runId: 'other-run' })];
        mockFetch.mockResolvedValue(mockResultsPage(items, false));

        const results = await getResultsFromRun('sig1', 'target-run', 2);
        expect(results).toHaveLength(0);
    });
});

// ---------------------------------------------------------------------------
// getLatestRunIdOnBranch
// ---------------------------------------------------------------------------

describe('getLatestRunIdOnBranch', () => {
    beforeEach(() => mockFetch.mockReset());

    it('returns the runId on success', async () => {
        mockFetch.mockResolvedValueOnce(mockRunResponse('run-abc'));
        const runId = await getLatestRunIdOnBranch('proj1', 'develop');
        expect(runId).toBe('run-abc');
    });

    it('returns null when the API responds with 404', async () => {
        mockFetch.mockResolvedValueOnce(mockErrorResponse(404, '{"status":"not found"}'));
        const runId = await getLatestRunIdOnBranch('proj1', 'develop');
        expect(runId).toBeNull();
    });

    it('throws for non-404 errors', async () => {
        mockFetch.mockResolvedValueOnce(mockErrorResponse(500, 'Internal server error'));
        await expect(getLatestRunIdOnBranch('proj1', 'develop')).rejects.toThrow();
    });
});
