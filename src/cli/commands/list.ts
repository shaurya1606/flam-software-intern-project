import { Command } from "commander";
import { CommObj } from "../../type.js";
import { IPCConnectionWDaemon } from "../../lib/cli.js";

export default function registerList(program: Command) {
	program
		.command("list")
		.description("List jobs for a specific state")
		.option("--state <state>", "Filter by job state (pending, running, done, failed)")
		.usage("--state pending")
		.addHelpText(
			"after",
			`\nExample:\n  $ queuectl list --state pending\n`
		)
		.action(async (opts: { state?: string }) => {
			const state = opts.state;
			if (!state) {
				console.error("Error: --state is required.\n\nExample:\n  $ queuectl list --state pending");
				process.exit(1);
			}
			const commObj: CommObj = {
				command: "list",
				option: null,
				flag: "--state",
				value: state
			};
			IPCConnectionWDaemon(commObj);
		});
}
