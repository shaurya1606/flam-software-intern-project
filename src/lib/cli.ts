import net from "net";
import os from "os";
import path from "path";
import { CommObj, IPCObj } from "../type.js";
import dotenv from "dotenv";

dotenv.config();

function getSocketPath(): string {
	if (process.env.SOCKET_PATH) return process.env.SOCKET_PATH;

	if (process.platform === "win32") {
		return "\\\\.\\pipe\\queuectl";
	}

	return path.join(os.tmpdir(), "queuectl.sock");
}

const SOCKET_PATH = getSocketPath();

export function IPCConnectionWDaemon(commObj: CommObj) {
	const client = net.createConnection(SOCKET_PATH);

	client.on("connect", () => {
		client.write(JSON.stringify(commObj));
	});

	client.on("data", (data) => {
		const res: IPCObj = JSON.parse(data.toString());
		if (res.success) {
			if (typeof res.message === "object") {
				console.log(JSON.stringify(res.message, null, 2));
			} else {
				console.log(res.message);
			}
		} else {
			console.error(res.message);
		}
		client.end();
	});

	client.on("error", (err) => {
		console.error("IPC connection error:", err.message);
		client.end();
	});
};
