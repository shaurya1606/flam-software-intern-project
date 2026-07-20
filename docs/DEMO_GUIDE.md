# QueueCTL Demo Guide

This guide provides a complete walkthrough of QueueCTL's functionality. Follow the commands in order to verify all required features and bonus implementations.

> **Note**
>
> - Run these commands from the project root.
> - Open a **new terminal** for CLI commands while `npm start` is running.
> - The dashboard will be available at **http://localhost:8080**.

---

# 1. Build the Project (Local Only)

```bash
npm install
npm run build
npm link
```

---

# 2. Start QueueCTL

```bash
npm start
```

---

# 3. Open the Dashboard

Open in your browser:

```
http://localhost:8080
```

---

# 4. Check Initial Queue Status

```bash
queuectl status
```

---

# 5. View Current Configuration

```bash
queuectl config show
```

---

# 6. Update Queue Configuration

```bash
queuectl config set max-retries 3
```

```bash
queuectl config set backoff exponential
```

```bash
queuectl config set delay-base 2
```

```bash
queuectl config set timeout 5000
```

---

# 7. Verify Updated Configuration

```bash
queuectl config show
```

---

# 8. Start Workers

### Single Worker

```bash
queuectl worker start --count 1
```

### Multiple Workers

```bash
queuectl worker start --count 3
```

---

# 9. Enqueue a Successful Job

```bash
queuectl enqueue '{"id":"job1","command":"echo Hello QueueCTL"}'
```

---

# 10. Enqueue Another Successful Job

```bash
queuectl enqueue '{"id":"job2","command":"node -v"}'
```

---

# 11. Test Priority Queue (Bonus)

```bash
queuectl enqueue '{"id":"priority-job","command":"echo HIGH PRIORITY","priority":1}'
```

---

# 12. Test Scheduled Job (Bonus)

```bash
queuectl enqueue '{"id":"delay-job","command":"echo DELAYED","run_after":"2026-07-18T15:46:00Z"}'
```

---

# 13. Test Job Timeout (Bonus)

### Linux / macOS / Codespaces

```bash
queuectl enqueue '{"id":"timeout-job","command":"sleep 10","timeout":1000}'
```

### Windows

Replace the command with any long-running command available on your system.

---

# 14. Test Retry Mechanism

### Linux / macOS / Codespaces

```bash
queuectl enqueue '{"id":"retry-job","command":"false"}'
```

### Windows

```bash
queuectl enqueue '{"id":"retry-job","command":"invalid_command_xyz"}'
```

---

# 15. Test Invalid Command

```bash
queuectl enqueue '{"id":"bad-job","command":"this_command_does_not_exist"}'
```

---

# 16. Check Queue Status

```bash
queuectl status
```

---

# 17. View Pending Jobs

```bash
queuectl list --state pending
```

---

# 18. View Processing Jobs

```bash
queuectl list --state processing
```

---

# 19. View Completed Jobs

```bash
queuectl list --state completed
```

---

# 20. View Failed Jobs

```bash
queuectl list --state failed
```

---

# 21. View Dead Letter Queue Jobs

```bash
queuectl list --state dead
```

---

# 22. View Runtime Metrics

```bash
queuectl metrics
```

---

# 23. View DLQ

```bash
queuectl dlq list
```

---

# 24. Retry a Dead Job

```bash
queuectl dlq retry retry-job
```

or

```bash
queuectl dlq retry bad-job
```

---

# 25. Verify Job Returned to Queue

```bash
queuectl list --state pending
```

---

# 26. Check Queue Status Again

```bash
queuectl status
```

---

# 27. View Updated Metrics

```bash
queuectl metrics
```

---

# 28. Stop Workers Gracefully

```bash
queuectl worker stop
```

---

# 29. Final Queue Status

```bash
queuectl status
```

---

# Dashboard API Verification

Open each endpoint in your browser.

## Health Check

```
http://localhost:8080/health
```

## Queue Status

```
http://localhost:8080/api/status
```

## Jobs

```
http://localhost:8080/api/jobs
```

## Metrics

```
http://localhost:8080/api/metrics
```

---

# GitHub Codespaces Demo

After opening the repository in GitHub Codespaces:

```bash
npm install
npm run build
npm start
```

Then execute:

```bash
queuectl status
```

```bash
queuectl config show
```

```bash
queuectl worker start --count 2
```

```bash
queuectl enqueue '{"id":"codespace-job","command":"echo Running in Codespaces"}'
```

```bash
queuectl status
```

```bash
queuectl list --state completed
```

```bash
queuectl metrics
```

---

# Additional Bonus Feature Demonstration

## Priority Queue

```bash
queuectl enqueue '{"id":"priority-demo","command":"echo Priority","priority":1}'
```

## Scheduled Job

```bash
queuectl enqueue '{"id":"scheduled-demo","command":"echo Scheduled","run_after":"2030-01-01T00:00:00Z"}'
```

## Timeout Handling

```bash
queuectl enqueue '{"id":"timeout-demo","command":"sleep 5","timeout":1000}'
```

## Metrics

```bash
queuectl metrics
```

## Configuration

```bash
queuectl config show
```

## Queue Status

```bash
queuectl status
```

---

# Features Demonstrated

## Core Assignment Requirements

- Queue initialization
- Daemon startup
- Worker management
- Job enqueueing
- Parallel workers
- Retry mechanism
- Exponential backoff
- Dead Letter Queue (DLQ)
- DLQ retry
- Persistent job storage
- Queue state inspection
- Runtime metrics
- Configuration management
- Graceful worker shutdown

## Bonus Features

- Priority queues
- Scheduled jobs (`run_after`)
- Job timeout handling
- Runtime metrics dashboard
- Web dashboard
- REST API endpoints
- GitHub Codespaces support
- Browser-based verification environment

---

**Following the above sequence verifies nearly every implemented feature of QueueCTL, including all mandatory assignment requirements and the additional bonus capabilities.**
