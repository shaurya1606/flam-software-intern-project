import { Command } from "commander";
import { CommObj } from "../../type.js";
import { IPCConnectionWDaemon } from "../../lib/cli.js";

export default function registerStatus(program: Command) {
	program
		.command("status")
		.description("Show queue status and worker counts")
		.usage("")
		.addHelpText(
			"after",
			`\nExample:\n  $ queuectl status\n`
		)
		.action(async () => {
			const commObj: CommObj = {
				command: "status",
				option: null,
				flag: null,
				value: null
			};
			IPCConnectionWDaemon(commObj);
		});
}
