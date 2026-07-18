# Development Guide

This guide is for contributors who want to work on the current QueueCTL implementation without drifting from the codebase.

## 1. Project layout

- [bin/queuectl.ts](bin/queuectl.ts) — CLI bootstrap and command registration
- [src/cli/commands](src/cli/commands) — subcommands such as enqueue, status, list, worker, metrics, dlq, and config
- [src/daemon/daemon.ts](src/daemon/daemon.ts) — daemon socket lifecycle and request dispatch
- [src/daemon/worker.ts](src/daemon/worker.ts) — worker loop, execution, and retry logic
- [src/lib/daemon.ts](src/lib/daemon.ts) — queue-service implementation and daemon-side handlers
- [src/lib/cli.ts](src/lib/cli.ts) — CLI-side IPC client and output formatting
- [src/db/better-sqlite.ts](src/db/better-sqlite.ts) — SQLite schema, initialization, locking, and queries
- [src/type.ts](src/type.ts) — shared TypeScript interfaces and state definitions
- [dashboard/server.js](dashboard/server.js) — Express dashboard server
- [tests/scenarios.test.ts](tests/scenarios.test.ts) — end-to-end integration coverage

## 2. Build and test workflow

Install dependencies:

```bash
npm install
```

Build the project:

```bash
npm run build
```

Run the test suite:

```bash
npm test
```

Useful scripts

```bash
npm start
npm test
npm run test:watch
npm run test:coverage
```

## 3. How the CLI is wired

The CLI entry point in [bin/queuectl.ts](bin/queuectl.ts) reads the command modules from [src/cli/commands](src/cli/commands) and registers them with Commander. This means a new subcommand can be added by creating a new module in the commands directory and rebuilding the project.

## 4. Daemon lifecycle

The project start script launches both the daemon and the dashboard using concurrently. On startup it:

1. resolves the socket path
2. initializes the database and metrics tables
3. begins listening for JSON messages over the socket
4. dispatches each message to the appropriate handler
5. shuts down workers and closes the socket on SIGINT or SIGTERM

## 5. Worker lifecycle

The worker loop lives in [src/daemon/worker.ts](src/daemon/worker.ts). The current runtime behavior is:

1. poll the database for a runnable job
2. mark the job as processing and set a lock timestamp
3. execute the shell command
4. update the row to completed, failed, or dead
5. continue looping

## 6. Adding a new CLI command

When adding a new CLI command:

1. create a new module under [src/cli/commands](src/cli/commands)
2. implement the command and build the IPC payload
3. send the payload to the daemon via [src/lib/cli.ts](src/lib/cli.ts)
4. add or update a daemon-side handler in [src/lib/daemon.ts](src/lib/daemon.ts)
5. rebuild and validate through the CLI and tests

## 7. Adding IPC handlers

The daemon dispatches incoming requests in [src/daemon/daemon.ts](src/daemon/daemon.ts). New functionality should follow the existing pattern:

- add a command case to the switch
- implement the command logic in [src/lib/daemon.ts](src/lib/daemon.ts)
- return a success or error payload that the CLI can render

## 8. Adding database fields

If a new field needs to be stored:

1. update the schema in [src/db/better-sqlite.ts](src/db/better-sqlite.ts)
2. update the relevant TypeScript interface in [src/type.ts](src/type.ts)
3. update the insert and update paths in the persistence layer
4. update any affected CLI output and tests

## 9. Testing strategy

The current test suite uses real daemon and database processes rather than isolated mocks. This is the strongest signal for correctness because it exercises the real IPC path and persistence layer.

The suite in [tests/scenarios.test.ts](tests/scenarios.test.ts) covers:

- basic job completion
- priority handling
- retry and DLQ behavior
- multiple workers
- invalid input handling
- persistence across restart

## 10. Debugging tips

- start the daemon with the same socket path expected by the CLI
- verify the SQLite database directly if a job appears stuck in a state
- confirm that the worker process is running when a job is expected to progress
- inspect the CLI output for error messages returned from the daemon

## 11. Releasing

The current repository is simple enough that release preparation is mostly about:

- confirming the build still succeeds
- confirming the tests still pass
- reviewing the documentation for implementation accuracy
- tagging the relevant commit and publishing the package if needed

## 12. Contribution expectations

A strong contribution to QueueCTL should:

- preserve the current local-first architecture
- keep documentation aligned with implementation
- add or update tests when runtime behavior changes
- avoid speculative features that are not present in the code
