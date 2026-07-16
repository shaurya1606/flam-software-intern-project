import { exec } from "child_process";
import util from "util";
import { pollAndLock, updateJobPersistent, getConfig } from "../db/better-sqlite.js";
import { JobObj } from "../type.js";

const execPromise = util.promisify(exec);

let shutdownGracefully = false;

async function workerLoop() {
	try {
		if (shutdownGracefully) return;
		const jobObj: JobObj | null = pollAndLock();

		if (!jobObj) {
			await new Promise(resolve => setTimeout(resolve, 1000));
			return;
		}

		await processJob(jobObj);
	} finally {
		if (!shutdownGracefully) setImmediate(workerLoop);
	}
}
workerLoop();
	
async function processJob(jobObj: JobObj) {
	try {
		const { stdout, stderr } = await execPromise(jobObj.command, {
			timeout: jobObj.timeout || 5000,
			killSignal: "SIGKILL"
		});

		jobObj.attempts += 1;
		jobObj.state = "completed";
		jobObj.locked_at = undefined;
		jobObj.stdout = typeof stdout === 'string' ? stdout.trim() : '';
		jobObj.stderr = typeof stderr === 'string' ? stderr.trim() : '';
		jobObj.exit_code = 0;

		updateJobPersistent(jobObj);

	} catch (err) {
		jobObj.attempts += 1;

		// capture error output if available
		if (err && typeof err === 'object' && 'stderr' in err) {
			try {
				// @ts-ignore
				jobObj.stderr = String((err as any).stderr).trim();
			} catch {}
		}
		if (err && typeof err === 'object' && 'stdout' in err) {
			try {
				// @ts-ignore
				jobObj.stdout = String((err as any).stdout).trim();
			} catch {}
		}
		// exit code if present
		if (err && typeof err === 'object' && 'code' in err) {
			// @ts-ignore
			jobObj.exit_code = Number((err as any).code) || 1;
		} else {
			jobObj.exit_code = 1;
		}

		const maxAttempts = jobObj.max_retries || 0;
		if (jobObj.attempts >= maxAttempts) {
			jobObj.state = "dead";
			jobObj.locked_at = undefined;
			updateJobPersistent(jobObj);
			return;
		}

		jobObj.state = "failed";

		const delayBase = Number(getConfig("delay-base")) || 5000;
		let baseSec = delayBase / 1000;
		if (baseSec < 1) baseSec = 1;

		const delaySec = Math.pow(baseSec, jobObj.attempts);
		const delayMs  = delaySec * 1000;
		
		// Set run_after to future time for exponential backoff
		jobObj.run_after = new Date(Date.now() + delayMs).toISOString();
		jobObj.locked_at = undefined;
		
		updateJobPersistent(jobObj);
	}
}

process.on("SIGTERM", () => {
	shutdownGracefully = true;
})
