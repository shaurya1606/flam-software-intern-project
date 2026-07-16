import net from "net";
import os from "os";
import path from "path";
import { CommObj, IPCObj } from "../type.js";
import dotenv from "dotenv";

dotenv.config()

function getSocketPath(): string {
	if (process.env.SOCKET_PATH) return process.env.SOCKET_PATH;

	if (process.platform === "win32") {
		return "\\\\.\\pipe\\queuectl";
	}

	return path.join(os.tmpdir(), "queuectl.sock");
}

const SOCKET_PATH = getSocketPath();

function formatValue(value: unknown, missing = "N/A", empty = "(empty)"): string {
	if (value === undefined || value === null) return missing;
	if (typeof value === "string") {
		if (value.trim() === "") return empty;
		return value;
	}
	return String(value);
}

function formatCount(value: unknown): string {
	if (value === undefined || value === null) return "N/A";
	return String(value);
}

function formatUptime(uptime: unknown): string {
	if (typeof uptime !== "string") return "N/A";
	const minutesMatch = uptime.match(/^(\d+)\s*min/i);
	if (!minutesMatch) return uptime;
	const minutes = Number(minutesMatch[1]);
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00`;
}

function printStatus(status: unknown) {
	if (typeof status !== "object" || status === null) {
		console.log(JSON.stringify(status, null, 2));
		return;
	}

	const data = status as Record<string, any>;
	const jobs = data.jobs ?? {};

	console.log("Queue Status");
	console.log("============");
	console.log("");
	console.log(`Pending      : ${formatCount(jobs.pending ?? "N/A")}`);
	console.log(`Processing   : ${formatCount(jobs.processing ?? "N/A")}`);
	console.log(`Completed    : ${formatCount(jobs.completed ?? "N/A")}`);
	console.log(`Failed       : ${formatCount(jobs.failed ?? "N/A")}`);
	console.log(`Dead         : ${formatCount(jobs.dead ?? "N/A")}`);
	console.log("");
	console.log(`Workers      : ${formatCount(data.workers ?? "N/A")}`);
}

function printMetrics(metrics: unknown) {
	if (typeof metrics !== "object" || metrics === null) {
		console.log(JSON.stringify(metrics, null, 2));
		return;
	}

	const data = metrics as Record<string, any>;

	console.log("QueueCTL Metrics");
	console.log("================");
	console.log("");
	console.log("Queue Statistics");
	console.log("----------------");
	console.log(`Total Jobs    : ${formatCount(data.total_jobs ?? "N/A")}`);
	console.log(`Pending       : ${formatCount(data.pending ?? "N/A")}`);
	console.log(`Processing    : ${formatCount(data.processing ?? "N/A")}`);
	console.log(`Completed     : ${formatCount(data.completed_jobs ?? "N/A")}`);
	console.log(`Failed        : ${formatCount(data.failed ?? "N/A")}`);
	console.log(`Dead          : ${formatCount(data.dead_jobs ?? "N/A")}`);
	console.log("");
	console.log("Workers");
	console.log("-------");
	console.log(`Running       : ${formatCount(data.workers_running ?? "N/A")}`);
	console.log("");
	console.log("Performance");
	console.log("-----------");
	console.log(`Success Rate  : ${formatValue(data.success_rate ?? "N/A")}`);
	console.log(`Failure Rate  : ${formatValue(data.failure_rate ?? "N/A")}`);
	console.log(`Retries       : ${formatCount(data.retry_count ?? "N/A")}`);
	console.log("");
	console.log("Runtime");
	console.log("-------");
	console.log(`Uptime        : ${formatUptime(data.uptime ?? "N/A")}`);
	console.log(`Total Commands: ${formatCount(data.total_commands ?? "N/A")}`);
	console.log(`Average Runtime: ${formatCount(data.average_runtime ?? "N/A")}`);
	console.log(`Max Runtime   : ${formatCount(data.max_runtime ?? "N/A")}`);
}

function printJobs(jobs: unknown) {
	if (!Array.isArray(jobs)) {
		console.log(JSON.stringify(jobs, null, 2));
		return;
	}

	for (const job of jobs) {
		if (typeof job !== "object" || job === null) {
			console.log(JSON.stringify(job, null, 2));
			continue;
		}

		const entry = job as Record<string, unknown>;
		console.log(`Job ID       : ${formatCount(entry.id ?? "N/A")}`);
		console.log(`State        : ${formatValue(entry.state ?? "N/A")}`);
		console.log(`Attempts     : ${formatCount(entry.attempts ?? "N/A")} / ${formatCount(entry.max_retries ?? "N/A")}`);
		console.log(`Priority     : ${formatCount(entry.priority ?? "N/A")}`);
		console.log("");
		console.log("Command");
		console.log("-------");
		console.log(formatValue(entry.command ?? "N/A"));
		console.log("");
		console.log("Exit Code");
		console.log("---------");
		console.log(formatCount(entry.exit_code ?? "N/A"));
		console.log("");
		console.log("STDOUT");
		console.log("------");
		console.log(formatValue(entry.stdout, "N/A", "(empty)"));
		console.log("");
		console.log("STDERR");
		console.log("------");
		console.log(formatValue(entry.stderr, "N/A", "(empty)"));
		console.log("");
		console.log("Created");
		console.log("-------");
		console.log(formatValue(entry.created_at ?? "N/A"));
		console.log("");
		console.log("Updated");
		console.log("-------");
		console.log(formatValue(entry.updated_at ?? "N/A"));
		console.log("");
		console.log("---------------------------------------------");
	}
}

function printSuccessMessage(message: unknown) {
	if (typeof message === "string") {
		console.log(`✔ ${message}`);
		return;
	}

	console.log(JSON.stringify(message, null, 2));
}

export function IPCConnectionWDaemon(commObj: CommObj) {
	const client = net.createConnection(SOCKET_PATH);

	client.on("connect", () => {
		client.write(JSON.stringify(commObj));
	});

	client.on("data", (data) => {
		const res: IPCObj = JSON.parse(data.toString());
		if (res.success) {
			if (commObj.command === "list" || commObj.command === "dlq") {
				printJobs(res.message);
			} else if (commObj.command === "status") {
				printStatus(res.message);
			} else if (commObj.command === "metrics") {
				printMetrics(res.message);
			} else {
				printSuccessMessage(res.message);
			}
			client.end();
			process.exit(0);
		} else {
			console.error(`✖ ${res?.message ?? "Error performing action"}`);
			client.end();
			process.exit(1);
		}
	});

	client.on("error", (err) => {
		console.error(`✖ IPC connection error: ${err.message}`);
		client.end();
		process.exit(1);
	});
};
