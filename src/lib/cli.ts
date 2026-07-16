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
		console.log("Job ID:", entry.id ?? "");
		console.log("State:", entry.state ?? "");
		console.log("Attempts:", entry.attempts ?? "");
		console.log("Exit Code:", entry.exit_code ?? "");
		console.log("STDOUT:", entry.stdout ?? "");
		console.log("STDERR:", entry.stderr ?? "");
		console.log("\n");
	}
}

export function IPCConnectionWDaemon(commObj: CommObj) {
	const client = net.createConnection(SOCKET_PATH);

	client.on("connect", () => {
		client.write(JSON.stringify(commObj));
	});

	client.on("data", (data) => {
		const res: IPCObj = JSON.parse(data.toString());
		if (res.success) {
			if (commObj.command === "list" && Array.isArray(res.message)) {
				printJobs(res.message);
			} else if (typeof res.message === "object") {
				console.log(JSON.stringify(res.message, null, 2));
			} else {
				console.log(res.message);
			}
			client.end();
			process.exit(0);
		} else {
			console.error(res?.message ?? "Error performing action");
			client.end();
			process.exit(1);
		}
	});

	client.on("error", (err) => {
		console.error("IPC connection error:", err.message);
		client.end();
		process.exit(1);
	});
};
