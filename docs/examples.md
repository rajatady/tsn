# TSN Examples

The simplified compiler keeps its example surface focused on plain `.ts` programs.

## Hosted CLI/Data Targets

- `examples/access-log-summary.ts` — access log parsing and aggregation
- `examples/config-audit.ts` — config readiness checks
- `examples/log-triage.ts` — structured log classification
- `examples/revenue-rollup.ts` — CSV-style revenue aggregation
- `examples/sla-scorecard.ts` — service-level rollups
- `examples/agent-brief.ts` — hosted async workflow using stdlib modules

Run them with:

```bash
./tsn run examples/access-log-summary.ts
./tsn build examples/config-audit.ts
./tsn build examples/log-triage.ts --debug
```

## Systems / Experimental Targets

- `examples/kernel.ts` — experimental low-level target work
- `examples/state.ts` — smaller language/runtime smoke target
- `examples/sqlite-extension/fuzzy_score.ts` — native extension example

## Verification

The maintained regression loop is centered on compiler tests and the CLI correctness harness:

```bash
npm test
bash harness/correctness.sh
```
