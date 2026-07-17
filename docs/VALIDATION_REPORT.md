# Documentation Validation Report

This report records the current documentation state against the implementation in the repository.

## Feature coverage

| Documented feature | Source file(s) verified | Verified manually | Covered by tests | Screenshot or placeholder |
| --- | --- | --- | --- | --- |
| CLI enqueue command | [src/cli/commands/enqueue.ts](src/cli/commands/enqueue.ts), [src/lib/daemon.ts](src/lib/daemon.ts) | Yes | Yes | Placeholder inserted |
| CLI status command | [src/cli/commands/status.ts](src/cli/commands/status.ts), [src/lib/daemon.ts](src/lib/daemon.ts) | Yes | Yes | Placeholder inserted |
| CLI list command | [src/cli/commands/list.ts](src/cli/commands/list.ts), [src/lib/daemon.ts](src/lib/daemon.ts) | Yes | Yes | Placeholder inserted |
| Worker control commands | [src/cli/commands/worker.ts](src/cli/commands/worker.ts), [src/lib/daemon.ts](src/lib/daemon.ts) | Yes | Yes | Placeholder inserted |
| Metrics command | [src/cli/commands/metrics.ts](src/cli/commands/metrics.ts), [src/lib/daemon.ts](src/lib/daemon.ts) | Yes | Yes | Placeholder inserted |
| DLQ commands | [src/cli/commands/dlq.ts](src/cli/commands/dlq.ts), [src/lib/daemon.ts](src/lib/daemon.ts) | Yes | Yes | Placeholder inserted |
| Configuration commands | [src/cli/commands/config.ts](src/cli/commands/config.ts), [src/lib/daemon.ts](src/lib/daemon.ts) | Yes | Yes | Placeholder inserted |
| SQLite persistence | [src/db/better-sqlite.ts](src/db/better-sqlite.ts) | Yes | Yes | Placeholder inserted |
| Worker retry/backoff logic | [src/daemon/worker.ts](src/daemon/worker.ts) | Yes | Yes | Placeholder inserted |
| Daemon IPC protocol | [src/daemon/daemon.ts](src/daemon/daemon.ts), [src/lib/cli.ts](src/lib/cli.ts) | Yes | Yes | Placeholder inserted |
| Dashboard endpoints | [dashboard/server.js](dashboard/server.js) | Yes | No | Placeholder inserted |

## Validation notes

- The documentation is grounded in the current implementation rather than prior assumptions.
- The docs include placeholders for assets that can be replaced with real screenshots later.
- The current implementation and test suite remain the authoritative source of truth.
