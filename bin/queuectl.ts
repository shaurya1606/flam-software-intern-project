#!/usr/bin/env node

import { Command } from "commander";
import fs from "fs";
import path from "path";
import { pathToFileURL, fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const program = new Command();

program
	.name("queuectl")
	.description("CLI-based background job queue system")
	.version("1.0.0");

const commandsDir = path.join(__dirname, "..", "src", "cli", "commands");
for (const file of fs.readdirSync(commandsDir)) {
    if (!file.endsWith(".js")) continue;

    const moduleUrl = pathToFileURL(
        path.join(commandsDir, file)
    ).href;

    const mod = await import(moduleUrl);

    if (typeof mod.default === "function") {
        mod.default(program);
    }
}

program.parse(process.argv);
