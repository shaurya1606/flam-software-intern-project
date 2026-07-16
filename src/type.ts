export type State = 'pending' | 'processing' | 'completed' | 'failed' | 'dead';

export interface CommObj {
	command: string | null;
	option: string | null;
	flag: string | null;
	value: string | null;
}

export interface JobObj {
	id: string;
	command: string;
	state: State;
	attempts: number;
	max_retries: number;
	created_at: string;
	updated_at: string;
	locked_at: string | undefined;
	timeout: number;
	run_after: string;
	priority: number;
	started_at: string | null;
	stdout?: string | null;
	stderr?: string | null;
	exit_code?: number | null;
};

export interface IPCObj {
    success: boolean;
    message: unknown;
}

export interface MetricsResult {
  total_jobs: number;
  completed_jobs: number;
  uptime: string;
  total_commands: number;
  average_runtime: number;
  max_runtime: number;
  retry_count: number;
  dead_jobs: number;
  workers_running: number;
  success_rate: string;
  failure_rate: string;
}
