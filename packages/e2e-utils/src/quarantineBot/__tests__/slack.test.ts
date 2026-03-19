import { buildSlackSummary } from '../slack';
import type { SlackEvent } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WEB = { id: 'Og0NOQ', label: 'Trezor Suite (web)' };
const DESKTOP = { id: '4ytF0E', label: 'Trezor Suite (desktop)' };

type QuarantinedEvent = Extract<SlackEvent, { kind: 'quarantined' }>;
type UnquarantinedEvent = Extract<SlackEvent, { kind: 'unquarantined' }>;

const makeQuarantined = (
    projectId: string,
    overrides: Partial<QuarantinedEvent> = {},
): QuarantinedEvent => ({
    kind: 'quarantined',
    projectId,
    titlePath: ['Dashboard', 'Send BTC'],
    signature: 'sig123',
    actionId: 'act123',
    failures: 3,
    executions: 5,
    ...overrides,
});

const makeUnquarantined = (
    projectId: string,
    overrides: Partial<UnquarantinedEvent> = {},
): UnquarantinedEvent => ({
    kind: 'unquarantined',
    projectId,
    titlePath: ['Settings', 'Change passphrase'],
    signature: 'sig456',
    passes: 25,
    executions: 25,
    ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildSlackSummary', () => {
    beforeEach(() => {
        process.env.GITHUB_RUN_ID = '99999';
    });

    afterEach(() => {
        delete process.env.GITHUB_RUN_ID;
    });

    it('returns null when the events list is empty', () => {
        expect(buildSlackSummary([WEB], [])).toBeNull();
    });

    it('returns null when no event matches any of the given projects', () => {
        const events = [makeQuarantined('UNKNOWN_PROJECT')];
        expect(buildSlackSummary([WEB], events)).toBeNull();
    });

    // ── Quarantined events ──────────────────────────────────────────────────

    it('includes project label and quarantine count for quarantined events', () => {
        const result = buildSlackSummary([WEB], [makeQuarantined(WEB.id)]);
        expect(result).toContain('Trezor Suite (web)');
        expect(result).toContain('Quarantined (1)');
    });

    it('includes test title joined with " > " for quarantined events', () => {
        const result = buildSlackSummary([WEB], [makeQuarantined(WEB.id)]);
        expect(result).toContain('Dashboard > Send BTC');
    });

    it('includes failure stats (failures/executions) for quarantined events', () => {
        const result = buildSlackSummary([WEB], [makeQuarantined(WEB.id)]);
        expect(result).toContain('3/5 failed');
    });

    it('includes an action link for quarantined events', () => {
        const result = buildSlackSummary([WEB], [makeQuarantined(WEB.id)]);
        expect(result).toContain('|action>');
    });

    it('includes a results link when the quarantined event has a signature', () => {
        const result = buildSlackSummary([WEB], [makeQuarantined(WEB.id)]);
        expect(result).toContain('|results>');
        expect(result).toContain('sig123');
    });

    it('omits the results link when the quarantined event has no signature', () => {
        const event = makeQuarantined(WEB.id, { signature: undefined });
        const result = buildSlackSummary([WEB], [event]);
        expect(result).not.toContain('|results>');
    });

    // ── Unquarantined events ────────────────────────────────────────────────

    it('includes "Restored" label and count for unquarantined events', () => {
        const result = buildSlackSummary([WEB], [makeUnquarantined(WEB.id)]);
        expect(result).toContain('Restored (1)');
    });

    it('includes test title for unquarantined events', () => {
        const result = buildSlackSummary([WEB], [makeUnquarantined(WEB.id)]);
        expect(result).toContain('Settings > Change passphrase');
    });

    it('includes pass stats (passes/executions) for unquarantined events', () => {
        const result = buildSlackSummary([WEB], [makeUnquarantined(WEB.id)]);
        expect(result).toContain('25/25 passed');
    });

    it('includes a results link when the unquarantined event has a signature', () => {
        const result = buildSlackSummary([WEB], [makeUnquarantined(WEB.id)]);
        expect(result).toContain('|results>');
    });

    it('omits the results link when the unquarantined event has no signature', () => {
        const event = makeUnquarantined(WEB.id, { signature: undefined });
        const result = buildSlackSummary([WEB], [event]);
        expect(result).not.toContain('|results>');
    });

    // ── Multi-project ───────────────────────────────────────────────────────

    it('outputs a section for each project that has events', () => {
        const events = [makeQuarantined(WEB.id), makeQuarantined(DESKTOP.id)];
        const result = buildSlackSummary([WEB, DESKTOP], events);
        expect(result).toContain('Trezor Suite (web)');
        expect(result).toContain('Trezor Suite (desktop)');
    });

    it('omits projects with no events', () => {
        const events = [makeQuarantined(WEB.id)];
        const result = buildSlackSummary([WEB, DESKTOP], events);
        expect(result).not.toContain('Trezor Suite (desktop)');
    });

    // ── Title truncation ────────────────────────────────────────────────────

    it('truncates titles that exceed SLACK_TITLE_MAX_LENGTH with an ellipsis', () => {
        // SLACK_TITLE_MAX_LENGTH is 50; this titlePath joins to 63 chars
        const longPart = 'A'.repeat(30);
        const event: SlackEvent = {
            kind: 'quarantined',
            projectId: WEB.id,
            titlePath: [longPart, longPart], // joined: "AAA...30 > AAA...30" = 63 chars
            signature: 'sig',
            actionId: 'act',
            failures: 1,
            executions: 5,
        };
        const result = buildSlackSummary([WEB], [event]);
        expect(result).toContain('…');
        // The full joined title must NOT appear verbatim
        expect(result).not.toContain(`${longPart} > ${longPart}`);
    });

    it('does not truncate titles within SLACK_TITLE_MAX_LENGTH', () => {
        const event: SlackEvent = {
            kind: 'quarantined',
            projectId: WEB.id,
            titlePath: ['Short title'],
            signature: 'sig',
            actionId: 'act',
            failures: 1,
            executions: 5,
        };
        const result = buildSlackSummary([WEB], [event]);
        expect(result).toContain('Short title');
        expect(result).not.toContain('…');
    });

    // ── Header note ─────────────────────────────────────────────────────────

    it('prepends an information_source header when headerNote is provided', () => {
        const result = buildSlackSummary([WEB], [makeQuarantined(WEB.id)], {
            headerNote: 'Manually triggered',
        });
        expect(result).toContain(':information_source: Manually triggered');
    });

    it('does not add a header when headerNote is absent', () => {
        const result = buildSlackSummary([WEB], [makeQuarantined(WEB.id)]);
        expect(result).not.toContain(':information_source:');
    });

    // ── Footer ──────────────────────────────────────────────────────────────

    it('includes a CI run link footer with the GITHUB_RUN_ID', () => {
        const result = buildSlackSummary([WEB], [makeQuarantined(WEB.id)]);
        expect(result).toContain('CI run');
        expect(result).toContain('99999');
    });
});
