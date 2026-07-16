# QueueCTL

A production-grade CLI-based background job queue system with worker processes, automatic retries with exponential backoff, and Dead Letter Queue (DLQ) support.

## 📋 Setup Instructions

### Prerequisites

- **Node.js** v18 or higher
- **npm** (comes with Node.js)

### Installation Steps

1. **Clone or download the repository:**
   ```bash
   git clone <repository-url>
   cd QueueCTL
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Link the CLI globally (optional but recommended):**
   ```bash
   npm link
   ```
   
   This makes the `queuectl` command available system-wide. Verify with:
   ```bash
   queuectl --version
   ```

5. **Start the daemon:**

   You can run the daemon in two ways. The **preferred option** is to run it as a background service so it stays alive automatically.

   **If your init system is \`systemd\`:**

   1. Create a service file at:

      ```
      /etc/systemd/system/queuectl.service
      ```

   2. Add the following configuration:

      ```
      [Unit]
      Description=QueueCTL Daemon
      After=network.target

      [Service]
      ExecStart=/usr/bin/node /path/to/project/dist/src/daemon/daemon.js
      WorkingDirectory=/path/to/project
      Restart=always
      User=YOUR_USERNAME
      Group=YOUR_USERNAME
      Environment=NODE_ENV=production

      [Install]
      WantedBy=multi-user.target
      ```

   3. Enable and start the service:

      ```
      sudo systemctl daemon-reload
      sudo systemctl enable queuectl
      sudo systemctl start queuectl
      ```

   4. Check whether the daemon is running:

      ```
      systemctl status queuectl
      ```

   **If you are *not* using \`systemd\`**, or you prefer running it manually:

   Run the daemon directly in a terminal:
   ```bash
   node dist/src/daemon/daemon.js
   ```

   The daemon will start listening on the configured socket path.

6. **Verify installation:**
   
   In another terminal, test the CLI:
   ```bash
   # Check version
   queuectl --version
   
   # Enqueue a test job
   queuectl enqueue '{"id":"test1","command":"echo Hello"}'
   
   # Start a worker
   queuectl worker start --count 1
   
   # Check status
   queuectl status
   ```

### Database Location

By default, the database is created at:
- **Path**: `./queuectl.db` (in project root)
- **WAL files**: `queuectl.db-wal`, `queuectl.db-shm` (auto-created)

To use a custom database path, set the `DB_PATH` environment variable.

## 💡 Usage Examples

### Example 1: Basic Job Processing

**Enqueue a job:**
```bash
queuectl enqueue '{"id":"hello","command":"echo Hello World"}'
```

**Output:**
```
id: hello
command: echo Hello World
{"success":true,"message":"Job enqueued"}
```

**Check status:**
```bash
queuectl status
```

**Output:**
```
Queue Status
============

Pending      : 1
Processing   : 0
Completed    : 0
Failed       : 0
Dead         : 0

Workers      : 0
```

**Start worker:**
```bash
queuectl worker start --count 1
```

**Output:**
```
{"success":true,"message":"Started 1 worker"}
```

**After processing - check status again:**
```bash
queuectl status
```

**Output:**
```json
{
  "jobs": {
    "pending": 0,
    "processing": 0,
    "completed": 1,
    "failed": 0,
    "dead": 0
  },
  "workers": 1
}
```

**List completed jobs:**
```bash
queuectl list --state completed
```

**Output:**
```
Job ID       : hello
State        : completed
Attempts     : 1 / 3
Priority     : 0

Command
-------
echo Hello World

Exit Code
---------
0

STDOUT
------
Hello World

STDERR
------
(empty)

Created
-------
2025-01-15T10:30:00.000Z

Updated
-------
2025-01-15T10:30:02.000Z

---------------------------------------------
```

---

### Example 2: Job with Retries and DLQ

**Configure retries:**
```bash
queuectl config set max-retries 2
queuectl config set delay-base 1000
```

**Output:**
```
{"success":true,"message":"Updated max-retries to 2"}
{"success":true,"message":"Updated delay-base to 1000"}
```

**Enqueue a failing job:**
```bash
queuectl enqueue '{"id":"fail-test","command":"nonexistent-command-xyz"}'
```

**Start worker:**
```bash
queuectl worker start --count 1
```

**Wait for retries (5-10 seconds), then check DLQ:**
```bash
queuectl dlq list
```

**Output:**
```json
[
  {
    "id": "fail-test",
    "command": "nonexistent-command-xyz",
    "state": "dead",
    "attempts": 2,
    "max_retries": 2,
    "created_at": "2025-01-15T10:35:00.000Z",
    "updated_at": "2025-01-15T10:35:10.000Z"
  }
]
```

**Retry from DLQ:**
```bash
queuectl dlq retry fail-test
```

**Output:**
```
{"success":true,"message":"Job fail-test added to queue"}
```

---

### Example 3: Multiple Workers Processing Jobs

**Enqueue multiple jobs:**
```bash
for i in {1..5}; do
  queuectl enqueue "{\"id\":\"job$i\",\"command\":\"echo job$i\"}"
done
```

**Start 3 workers:**
```bash
queuectl worker start --count 3
```

**Output:**
```
{"success":true,"message":"Started 3 workers"}
```

**Monitor status:**
```bash
queuectl status
```

**Output:**
```json
{
  "jobs": {
    "pending": 0,
    "processing": 0,
    "completed": 5,
    "failed": 0,
    "dead": 0
  },
  "workers": 3
}
```

---

### Example 4: Priority Queue

**Enqueue normal priority job:**
```bash
queuectl enqueue '{"id":"normal","command":"sleep 5","priority":0}'
```

**Enqueue high priority job:**
```bash
queuectl enqueue '{"id":"high","command":"echo urgent","priority":1}'
```

**Start worker:**
```bash
queuectl worker start --count 1
```

**High priority job processes first** (check worker logs or status)

---

### Example 5: Scheduled Jobs

**Schedule job for future:**
```bash
queuectl enqueue '{"id":"scheduled","command":"echo scheduled","run_after":"2025-12-31T23:59:59Z"}'
```

**Check pending jobs:**
```bash
queuectl list --state pending
```

**Output:** (Job listed but won't be processed until `run_after` time)

---

### Example 6: Metrics

> `Retries` refers to the number of jobs that required at least one retry. The value is reported consistently in the metrics view.

### Configuration

Use `queuectl config show` to inspect current configuration values:

```bash
queuectl config show
```

If there are no jobs in a given state, `queuectl list --state <state>` prints a friendly message such as `No pending jobs found.` instead of returning an empty response.

Worker counts must be positive integers between `1` and `128`.

> `Retries` refers to the number of jobs that required at least one retry. The value is reported consistently in the metrics view.

**View system metrics:**
```bash
queuectl metrics
```

**Output:**
```
QueueCTL Metrics
================

Queue Statistics
----------------
Total Jobs    : 50
Pending       : N/A
Processing    : N/A
Completed     : 45
Failed        : N/A
Dead          : 3

Workers
-------
Running       : 8

Performance
-----------
Success Rate  : 90.00 %
Failure Rate  : 6.00 %
Retries       : 5

Runtime
-------
Uptime        : 02:00:00
Total Commands: 150
Average Runtime: 2
Max Runtime   : 10
```

## Quick Verification Checklist

□ Build project

□ Start daemon

□ Enqueue job

□ Start workers

□ Verify completed state

□ Verify failed command retries

□ Verify DLQ

□ Retry DLQ job

□ Verify metrics

□ Stop workers

□ Restart daemon

□ Verify persistence

## Recording the Demo

1. Build
2. Start daemon
3. Enqueue jobs
4. Start workers
5. Successful execution
6. Failed command
7. Retry
8. DLQ
9. Retry DLQ
10. Metrics
11. Config update
12. Persistence after restart
13. Worker stop
14. Graceful daemon shutdown

## Architecture

                 QueueCTL

              +------------+
              | CLI Client |
              +------------+
                     |
                  IPC Pipe
                     |
                     v
            +----------------+
            | Queue Daemon   |
            +----------------+
             |     |      |
             |     |      +------ Worker Pool
             |     |
             |     +------------- Retry Manager
             |
             +------------------- SQLite Database

## 📂 Project Structure

The project is organized as follows:

```
QueueCTL/
├── bin/
│   └── queuectl.ts              # CLI entry point
├── src/
│   ├── cli/
│   │   └── commands/
│   │       ├── config.ts        # Configuration command
│   │       ├── dlq.ts           # Dead Letter Queue commands
│   │       ├── enqueue.ts       # Job enqueuing command
│   │       ├── list.ts          # Job listing command
│   │       ├── metrics.ts       # Metrics command
│   │       ├── status.ts        # Status command
│   │       └── worker.ts        # Worker management commands
│   ├── daemon/
│   │   ├── daemon.ts            # Main daemon process
│   │   └── worker.ts            # Worker process logic
│   ├── db/
│   │   └── better-sqlite.ts     # Database layer & operations
│   ├── lib/
│   │   ├── cli.ts               # CLI-Daemon IPC client
│   │   └── daemon.ts            # Daemon business logic
│   └── type.ts                  # TypeScript interfaces
├── tests/
│   └── scenarios.test.ts        # Integration tests
├── dist/                        # Compiled JavaScript (after build)
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

### System Components

```
┌─────────────┐
│   CLI Tool  │ (queuectl)
└──────┬──────┘
       │ IPC (Unix Socket)
       ↓
┌─────────────┐
│   Daemon    │ (Background process)
└──────┬──────┘
       │
       ├─── Worker Process 1
       ├─── Worker Process 2
       └─── Worker Process N
       │
       ↓
┌─────────────┐
│  SQLite DB  │ (Job persistence)
└─────────────┘
```

### Job Lifecycle

#### 1. Job Enqueuing

```
User → CLI → IPC → Daemon → Database
```

**Process:**
1. User runs `queuectl enqueue <jobJson>`
2. CLI parses command and sends JSON via Unix socket
3. Daemon receives message, validates job data
4. Daemon creates job record in database with state `pending`
5. Response sent back to CLI

#### 2. Job Processing

```
Worker → Database (poll) → Lock Job → Execute → Update State
```

**Process:**
1. Worker polls database for available jobs (`pending` or `failed`)
2. Worker uses transaction (`BEGIN IMMEDIATE`) to lock job atomically
3. Job state changes to `processing`, `locked_at` timestamp set
4. Worker executes command via `child_process.exec()`
5. On success: state → `completed`
6. On failure: state → `failed`, attempts incremented
7. If `attempts >= max_retries`: state → `dead` (DLQ)

#### 3. Retry Logic

```
Failed Job → Calculate Backoff → Update run_after → State: failed
```

**Process:**
1. Job fails execution
2. Calculate exponential backoff: `delay = (base / 1000) ^ attempts` seconds
3. Set `run_after = now + delay`
4. State remains `failed` until `run_after` time passes
5. Worker polls again after `run_after` time

### Data Persistence

#### Database Schema

**Jobs Table:**
```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  command TEXT NOT NULL,
  state TEXT DEFAULT 'pending',
  attempts INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  locked_at DATETIME,
  timeout INT DEFAULT 5000,
  run_after DATETIME DEFAULT CURRENT_TIMESTAMP,
  priority INT DEFAULT 0,
  started_at DATETIME
)
```

**Config Table:**
```sql
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT
)
```

**Metrics Table:**
```sql
CREATE TABLE metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  daemon_startup DATETIME DEFAULT CURRENT_TIMESTAMP,
  total_commands INT DEFAULT 0
)
```

#### Persistence Strategy

- **WAL Mode**: SQLite uses Write-Ahead Logging for better concurrency
- **Transaction Safety**: All job updates use transactions
- **Atomic Operations**: Job locking uses `BEGIN IMMEDIATE` for atomicity
- **Persistence Across Restarts**: All job data survives daemon restarts

### Worker Logic

#### Worker Process Flow

```typescript
let shutdownGracefully = false;

while (!shutdownGracefully) {
  1. Poll database for available job
  2. If no job available:
     - Sleep 1 second
     - Continue polling
  3. Lock job atomically (transaction)
  4. Execute command with timeout
  5. Update job state (completed/failed/dead)
  6. If failed: calculate backoff, schedule retry
  7. If max retries exceeded: move to DLQ
  8. Continue polling for next job
}

// On SIGTERM signal:
shutdownGracefully = true;
// Worker finishes current job, then exits
```

#### Key Worker Features

1. **Continuous Polling Loop**: Workers continuously poll database for available jobs
2. **Idle Handling**: Workers sleep 1 second when no jobs available (prevents CPU spinning)
3. **Atomic Locking**: Uses SQLite transactions to prevent race conditions
4. **Graceful Shutdown**: Handles SIGTERM signal, finishes current job before exit
5. **Timeout Handling**: Commands timeout after configured duration (default: 5 seconds)
6. **Error Handling**: Catches execution errors, updates job state accordingly
7. **No Job Abandonment**: Worker never exits mid-job execution

#### Concurrency Model

- **Database Locking**: Uses SQLite transactions with `BEGIN IMMEDIATE` to prevent race conditions
- **Job Locking**: Jobs are locked when picked up by a worker (`locked_at` timestamp)
- **Lock Timeout**: Locks expire after job timeout, allowing stuck jobs to be retried
- **Worker Isolation**: Each worker runs in a separate process
- **No Duplicate Processing**: Transaction-based locking ensures only one worker processes a job

### Data Flow

1. **User runs CLI command** → CLI parses command
2. **CLI sends JSON message** → Via Unix socket to daemon
3. **Daemon processes command** → Enqueue, start worker, etc.
4. **Workers poll database** → For available jobs
5. **Worker locks job** → Atomic transaction
6. **Worker processes job** → Executes command
7. **Job state updated** → In database
8. **CLI receives response** → Displays result

### IPC Communication

- **Protocol**: Unix Domain Socket (IPC) on Linux/macOS; Named Pipes on Windows
- **Format**: JSON messages
- **Socket Path** (Linux/macOS): `/tmp/queuectl.sock` (configurable via `SOCKET_PATH`)
- **Socket Path** (Windows): `\\.\pipe\queuectl` (configurable via `SOCKET_PATH`)
- **Message Format**: `{ command, option, flag, value }`
- **Response Format**: `{ success: boolean, message: any }`

## 🤔 Assumptions & Trade-offs

### Design Decisions

#### 1. **SQLite over Redis/PostgreSQL**

**Decision:** Use SQLite for job persistence

**Rationale:**
- ✅ No external dependencies required
- ✅ Embedded database, easy to set up
- ✅ Sufficient for single-machine deployments
- ✅ ACID transactions for data consistency
- ✅ WAL mode provides good concurrency

**Trade-off:**
- ❌ Not suitable for distributed systems
- ❌ Limited scalability compared to Redis/PostgreSQL
- ❌ Single-file database (backup/restore simpler but less flexible)

#### 2. **Unix Socket IPC over HTTP/TCP**

**Decision:** Use Unix Domain Socket for CLI-Daemon communication

**Rationale:**
- ✅ Faster than TCP (no network overhead)
- ✅ More secure (local only)
- ✅ Simpler implementation
- ✅ Standard IPC mechanism for local processes

**Trade-off:**
- ❌ Only works on Unix-like systems (Linux, macOS)
- ❌ Not suitable for remote access
- ❌ Socket file management required

#### 3. **Process-based Workers over Threads**

**Decision:** Use separate Node.js processes for workers

**Rationale:**
- ✅ True parallelism (not limited by event loop)
- ✅ Process isolation (worker crash doesn't affect daemon)
- ✅ Easier to manage and monitor
- ✅ Standard Node.js pattern

**Trade-off:**
- ❌ Higher memory overhead per worker
- ❌ Slower startup time compared to threads
- ❌ More complex inter-process communication

#### 4. **Synchronous Database Operations**

**Decision:** Use `better-sqlite3` (synchronous) over async SQLite

**Rationale:**
- ✅ Simpler code (no async/await for DB operations)
- ✅ Better performance for single-threaded operations
- ✅ Atomic transactions easier to manage
- ✅ Sufficient for this use case

**Trade-off:**
- ❌ Blocks event loop during DB operations
- ❌ Not ideal for high-concurrency scenarios
- ❌ Less idiomatic Node.js (async-first)

#### 5. **Polling over Event-Driven Job Processing**

**Decision:** Workers poll database instead of event-driven notifications

**Rationale:**
- ✅ Simpler implementation
- ✅ No need for pub/sub mechanism
- ✅ Works reliably with SQLite
- ✅ Easy to understand and debug

**Trade-off:**
- ❌ Slight delay in job pickup (polling interval)
- ❌ Higher database load (constant polling)
- ❌ Less efficient than event-driven approach

#### 6. **Exponential Backoff Only**

**Decision:** Implement exponential backoff, not configurable strategies

**Rationale:**
- ✅ Standard retry pattern
- ✅ Prevents overwhelming system with retries
- ✅ Simple to implement and understand
- ✅ Covers most use cases

**Trade-off:**
- ❌ No support for fixed delay or other strategies
- ❌ Less flexible for specific retry needs
- ❌ May be too aggressive for some scenarios

#### 7. **In-Memory Worker Management**

**Decision:** Track workers in daemon's memory (Map)

**Rationale:**
- ✅ Simple and fast
- ✅ No need for persistent worker state
- ✅ Workers are ephemeral (can restart)
- ✅ Daemon can manage worker lifecycle cleanly

**Trade-off:**
- ❌ Worker state lost on daemon restart
- ❌ No worker persistence across restarts
- ❌ Cannot track worker history

### 8. **Cross-Platform IPC (Sockets & Named Pipes)**

**Decision:** Use Unix sockets on Linux/macOS; Windows named pipes on Windows

**Rationale:**
- ✅ Fast, local IPC without TCP overhead
- ✅ Platform-native mechanisms
- ✅ More secure (no network exposure)
- ✅ No additional dependencies

**Trade-off:**
- ❌ Not suitable for remote access
- ❌ Platform-specific socket management

### 9. **Graceful Worker Shutdown**

**Decision:** Workers finish current job before exiting on SIGTERM

**Rationale:**
- ✅ No job abandonment mid-execution
- ✅ Ensures job consistency
- ✅ Proper state transitions in database
- ✅ Clean daemon lifecycle

**Trade-off:**
- ❌ Shutdown may take time if job is running
- ❌ Requires SIGTERM handling in worker

### Simplifications Made

1. **No Job Output Storage**: Job output is only logged, not stored in database
2. **No Web UI**: CLI-only interface (no dashboard)
3. **No Job Priorities Beyond 0/1**: Only normal (0) and high (1) priorities

## 🎯 Bonus Features

Beyond the core requirements, QueueCTL includes several production-ready enhancements:

### ✨ Implemented Features

- **Priority Queue**: Jobs support priority levels (0=normal, 1=high)
- **Scheduled Jobs**: Delay job execution with `run_after` timestamp
- **Job Timeout**: Configurable per-job execution timeout
- **Concurrent Workers**: Multiple worker processes process jobs in parallel
- **Graceful Shutdown**: Workers finish current job before exiting on SIGTERM
- **System Metrics**: Real-time daemon metrics (uptime, command count, runtimes)
- **Configurable Retry Policies**: Customize max retries and backoff behavior
- **Dead Letter Queue**: Failed jobs moved to DLQ after exhausting retries
- **Database Persistence**: All job and configuration data survives daemon restarts
- **Duplicate Prevention**: Transaction-based locking prevents job duplication
- **Better Error Messages**: Validation with clear, actionable error text

---

## 🚫 Known Limitations

- **Single-Machine Only**: No support for distributed workers across multiple machines
- **No REST API**: CLI-based interface only (no HTTP endpoints)
- **No Web Dashboard**: Command-line interface required for all operations
- **No Authentication**: Assumes secure, trusted environment
- **No Job Output Storage**: Command output is not persisted (only success/failure state)
- **SQLite Scale Limits**: Not suitable for millions of jobs (single-node SQLite)
- **No Built-in Monitoring**: External monitoring tool integration required

---

### Running Tests

```bash
# Run all tests (integration tests using Vitest)
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Scenarios

The automated test suite (`tests/scenarios.test.ts`) covers the following scenarios:

1. ✅ **Basic Job Completion**: Simple echo command enqueues, worker processes, job completes
2. ✅ **Priority Queue**: Normal and high priority jobs are distinguished
3. ✅ **Retry with Backoff**: Failed jobs retry with exponential backoff, move to DLQ
4. ✅ **Multiple Workers**: Concurrent workers process jobs without duplication
5. ✅ **Invalid Input Handling**: Invalid commands and payloads are rejected gracefully
6. ✅ **Persistence**: Job data survives daemon restart
7. ✅ **Concurrent Processing**: Multiple jobs processed in parallel by worker pool
8. ✅ **Duplicate Prevention**: Transaction-based locking prevents job duplication

### Test Structure

- **Framework**: Vitest (fast unit & integration test runner)
- **Location**: `tests/scenarios.test.ts`
- **Type**: End-to-end integration tests
- **Verification**: Direct database queries (not just CLI output)
- **Isolation**: Each test run uses a fresh, isolated database
- **Coverage**: Covers all major CLI commands and job lifecycle states

### How to Verify Functionality

#### Automated Testing

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Link the CLI:**
   ```bash
   npm link
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

**Expected Output:**
```
 RUN  v4.1.10 D:/QueueCTL

 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  16:33:43
   Duration  29.27s (transform 164ms, setup 0ms, import 281ms, tests 28.09s, environment 0ms)
```

#### Manual Verification

1. **Start the daemon:**
   ```bash
   node dist/src/daemon/daemon.js
   ```

2. **Test basic workflow:**
   ```bash
   # Enqueue a job
   queuectl enqueue '{"id":"test1","command":"echo Hello"}'
   
   # Start worker
   queuectl worker start --count 1
   
   # Check status
   queuectl status
   
   # Verify job completed
   queuectl list --state completed
   ```

3. **Test retry mechanism:**
   ```bash
   # Configure retries
   queuectl config set max-retries 2
   
   # Enqueue failing job
   queuectl enqueue '{"id":"fail1","command":"nonexistent-cmd"}'
   
   # Start worker and wait
   queuectl worker start --count 1
   # Wait 5-10 seconds
   
   # Check DLQ
   queuectl dlq list
   ```

4. **Test persistence:**
   ```bash
   # Enqueue job
   queuectl enqueue '{"id":"persist1","command":"echo test"}'
   
   # Stop daemon (Ctrl+C)
   # Restart daemon
   node dist/src/daemon/daemon.js
   
   # Verify job still exists
   queuectl list --state pending
   ```

5. **Test worker stop robustness:**
   ```bash
   # Start worker
   queuectl worker start --count 2
   
   # Check status
   queuectl status
   
   # Stop workers
   queuectl worker stop
   
   # Try stopping again (should gracefully handle no active workers)
   queuectl worker stop
   ```

6. **Stress test (multiple jobs and workers):**
   ```bash
   # Enqueue 50 test jobs
   for i in {1..50}; do
     queuectl enqueue "{\"id\":\"stress-$i\",\"command\":\"echo task-$i\"}"
   done
   
   # Start 8 concurrent workers
   queuectl worker start --count 8
   
   # Monitor progress
   sleep 2
   queuectl status
   
   # Wait for completion
   sleep 5
   queuectl status
   
   # Verify all jobs completed
   queuectl list --state completed
   
   # Cleanup
   queuectl worker stop
   ```

### Test Coverage

Run with coverage to see which parts of the codebase are tested:

```bash
npm run test:coverage
```

## 📖 Commands Reference

### `enqueue`

Enqueue a new job to the queue.

**Usage:**
```bash
queuectl enqueue '<jobJson>'
```

**Job JSON Format:**
```json
{
  "id": "unique-job-id",
  "command": "command to execute",
  "run_after": "2025-11-10T15:00:00Z",  // Optional: schedule for later
  "priority": 1                           // Optional: 0=normal, 1=high
}
```

**Examples:**
```bash
# Basic job
queuectl enqueue '{"id":"job1","command":"sleep 2"}'

# Job with scheduled execution
queuectl enqueue '{"id":"job2","command":"echo hi","run_after":"2025-11-10T15:00:00Z"}'

# High priority job
queuectl enqueue '{"id":"job3","command":"ls","priority":1}'
```

---

### `worker`

Manage worker processes.

#### Start Workers
```bash
queuectl worker start [--count <number>]
```

#### Stop Workers
```bash
queuectl worker stop
```

---

### `status`

Show summary of all job states and active workers.

```bash
queuectl status
```

---

### `list`

List jobs filtered by state.

```bash
queuectl list --state <state>
```

**States:** `pending`, `processing`, `completed`, `failed`, `dead`

---

### `dlq`

Manage Dead Letter Queue.

#### List DLQ Jobs
```bash
queuectl dlq list
```

#### Retry DLQ Job
```bash
queuectl dlq retry <jobId>
```

---

### `config`

Manage system configuration.

```bash
queuectl config set <key> <value>
```

**Supported Configuration Keys:**

| Key | Type | Valid Values | Example | Description |
|-----|------|--------------|---------|-------------|
| `max-retries` | Number | Positive integers | `5` | Max times to retry failed jobs |
| `delay-base` | Number | Positive integers (ms) | `5000` | Base delay for backoff (milliseconds) |
| `timeout` | Number | Positive integers (ms) | `10000` | Job execution timeout (milliseconds) |
| `backoff` | String | `exponential`, `fixed` | `exponential` | Retry backoff strategy |

**Examples:**
```bash
# Set max retries to 5
queuectl config set max-retries 5

# Set base delay to 2 seconds (2000 ms)
queuectl config set delay-base 2000

# Set job timeout to 10 seconds
queuectl config set timeout 10000

# Use fixed backoff strategy
queuectl config set backoff fixed
```

---

### `metrics`

Show daemon metrics and aggregated statistics.

```bash
queuectl metrics
```

## 🔄 Job Lifecycle

### Job States

| State | Description |
|-------|-------------|
| `pending` | Job is waiting to be picked up by a worker |
| `processing` | Job is currently being executed by a worker |
| `completed` | Job executed successfully |
| `failed` | Job failed but will retry (has retries remaining) |
| `dead` | Job permanently failed (moved to DLQ after exhausting retries) |

### State Transitions

```
pending → processing → completed ✅
         ↓
      failed → pending (retry with backoff)
         ↓
       dead (after max retries) → pending (if retried from DLQ)
```

### Backoff Strategies

When a job fails, it's scheduled for retry using one of two strategies:

**Exponential Backoff (default):**
```
delay = (delay_base / 1000) ^ attempts seconds
```

Each retry waits increasingly longer:
- `delay_base = 5000` (5 seconds)
- Attempt 1: `5^1 = 5` seconds
- Attempt 2: `5^2 = 25` seconds
- Attempt 3: `5^3 = 125` seconds

**Fixed Backoff:**
```
delay = delay_base / 1000 seconds (constant)
```

Each retry waits the same duration:
- `delay_base = 5000` (5 seconds)
- Attempt 1: 5 seconds
- Attempt 2: 5 seconds
- Attempt 3: 5 seconds

To switch backoff strategies:
```bash
queuectl config set backoff fixed      # Use fixed delays
queuectl config set backoff exponential # Use exponential delays (default)
```

## ⚙️ Configuration

### Default Configuration

- **max-retries**: `3` (number of times to retry a failed job)
- **delay-base**: `5000` ms (5 seconds, base for exponential backoff)
- **backoff**: `exponential` (retry delay strategy)
- **timeout**: `5000` ms (5 seconds, timeout for job execution)

### Configuration Command

```bash
queuectl config set <key> <value>
```

**Supported Keys & Values:**

| Key | Type | Valid Values | Default |
|-----|------|--------------|---------|
| `max-retries` | Number | Positive integers | 3 |
| `delay-base` | Number | Positive integers (ms) | 5000 |
| `timeout` | Number | Positive integers (ms) | 5000 |
| `backoff` | String | `exponential`, `fixed` | `exponential` |

### Backoff Strategies

**Exponential Backoff:**
```
delay = (delay_base / 1000) ^ attempts (seconds)
```
- Attempt 1: `5^1 = 5` seconds
- Attempt 2: `5^2 = 25` seconds
- Attempt 3: `5^3 = 125` seconds

**Fixed Backoff:**
```
delay = delay_base / 1000 (seconds for each attempt)
```
- Always: `delay_base` milliseconds between retries

### Environment Variables

- `DB_PATH`: Path to SQLite database file (default: `./queuectl.db`)
- `SOCKET_PATH`: Path to Unix socket for IPC (default: `/tmp/queuectl.sock` on Unix; `\\.\pipe\queuectl` on Windows)

---

## 📝 License

ISC

---

**QueueCTL** - A production-grade CLI-based background job queue system

