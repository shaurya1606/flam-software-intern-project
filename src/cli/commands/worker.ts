import { Command } from "commander";
import { CommObj } from "../../type.js";
import { IPCConnectionWDaemon } from "../../lib/cli.js";

export default function registerWorker(program: Command) {
	const worker = program
		.command("worker")
		.description("Start or stop worker processes")
		.usage("start --count <number> | stop")
		.addHelpText(
			"after",
			`\nSubcommand options:\n  start: --count <number>  Number of worker processes\n\nExamples:\n  $ queuectl worker start --count 3\n` +
			`\nSubcommand options:\n  stop: Stop worker processes\n\nExamples:\n  $ queuectl worker stop\n`
		);

	worker
		.command("start")
		.description("Start worker processes")
		.option("-c, --count <number>", "Number of worker processes (1-128)", (v) => {
			const value = String(v);
			if (!/^\d+$/.test(value)) {
				throw new Error("--count must be a positive integer");
			}
			const n = Number.parseInt(value, 10);
			if (n <= 0 || n > 128) {
				throw new Error("--count must be between 1 and 128");
			}
			return n;
		}, 1)
		.usage("--count 3")
		.action(async (opts: { count: number }) => {
			const count = opts.count ?? 1;
			const commObj: CommObj = {
				command: "worker",
				option: "start",
				flag: "count",
				value: count.toString()
			};
			IPCConnectionWDaemon(commObj);
		});

	worker
		.command("stop")
		.description("Stop all running worker processes")
		.action(async () => {
			const commObj: CommObj = {
				command: "worker",
				option: "stop",
				flag: null,
				value: null
			};
			IPCConnectionWDaemon(commObj);
		});
}