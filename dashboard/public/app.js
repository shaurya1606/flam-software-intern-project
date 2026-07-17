const statusSummary = document.getElementById('statusSummary');
const metricsSummary = document.getElementById('metricsSummary');
const jobsTableBody = document.getElementById('jobsTableBody');
const refreshBtn = document.getElementById('refreshBtn');
const updatedAt = document.getElementById('updatedAt');

function setMessage(message, isError = false) {
  statusSummary.textContent = message;
  metricsSummary.textContent = message;
  jobsTableBody.innerHTML = `<tr><td colspan="6" class="${isError ? 'error' : ''}">${message}</td></tr>`;
}

function updateTime() {
  const now = new Date();
  updatedAt.textContent = `Last Updated: ${now.toLocaleTimeString()}`;
}

function renderStatus(data) {
  if (!data || !data.jobs) {
    setMessage('Cannot connect to QueueCTL daemon.\nPlease start the daemon first.', true);
    return;
  }

  const jobs = data.jobs;
  statusSummary.textContent = [
    `Pending: ${jobs.pending ?? 0}`,
    `Processing: ${jobs.processing ?? 0}`,
    `Completed: ${jobs.completed ?? 0}`,
    `Failed: ${jobs.failed ?? 0}`,
    `Dead: ${jobs.dead ?? 0}`,
    `Workers: ${data.workers ?? 0}`
  ].join('\n');
}

function renderMetrics(data) {
  if (!data) {
    setMessage('Cannot connect to QueueCTL daemon.\nPlease start the daemon first.', true);
    return;
  }

  metricsSummary.textContent = [
    `Success Rate: ${data.success_rate ?? 'N/A'}`,
    `Failure Rate: ${data.failure_rate ?? 'N/A'}`,
    `Retries: ${data.retry_count ?? 0}`,
    `Uptime: ${data.uptime ?? 'N/A'}`,
    `Total Jobs: ${data.total_jobs ?? 0}`
  ].join('\n');
}

function renderJobs(jobs) {
  jobsTableBody.innerHTML = '';

  if (!Array.isArray(jobs) || jobs.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="6">No jobs available.</td>';
    jobsTableBody.appendChild(row);
    return;
  }

  for (const job of jobs) {
    const row = document.createElement('tr');
    const state = (job.state || 'unknown').toLowerCase();
    row.innerHTML = `
      <td>${job.id || 'N/A'}</td>
      <td><span class="badge ${state}">${job.state || 'Unknown'}</span></td>
      <td>${job.attempts ?? 0}</td>
      <td>${job.priority ?? 0}</td>
      <td>${job.exit_code ?? 'N/A'}</td>
      <td>${job.updated_at || 'N/A'}</td>
    `;
    jobsTableBody.appendChild(row);
  }
}

async function loadDashboardData() {
  try {
    const [statusRes, metricsRes, jobsRes] = await Promise.all([
      fetch('/api/status'),
      fetch('/api/metrics'),
      fetch('/api/jobs')
    ]);

    if (!statusRes.ok || !metricsRes.ok || !jobsRes.ok) {
      throw new Error('Unavailable');
    }

    const statusData = await statusRes.json();
    const metricsData = await metricsRes.json();
    const jobsData = await jobsRes.json();

    renderStatus(statusData);
    renderMetrics(metricsData);
    renderJobs(jobsData);
    updateTime();
  } catch (error) {
    setMessage('Cannot connect to QueueCTL daemon.\nPlease start the daemon first.', true);
    updateTime();
  }
}

refreshBtn.addEventListener('click', loadDashboardData);

const navButtons = document.querySelectorAll('.nav-item');
const overviewSection = document.getElementById('overview');
const jobsSection = document.getElementById('jobs');
const statusCard = document.getElementById('statusCard');
const metricsCard = document.getElementById('metricsCard');

function setActiveSection(target) {
  navButtons.forEach((btn) => btn.classList.toggle('active', btn.getAttribute('data-target') === target));

  if (target === 'status') {
    overviewSection.style.display = 'grid';
    statusCard.style.display = 'block';
    metricsCard.style.display = 'block';
    jobsSection.style.display = 'none';
  } else if (target === 'jobs') {
    overviewSection.style.display = 'none';
    jobsSection.style.display = 'block';
  } else if (target === 'metrics') {
    overviewSection.style.display = 'grid';
    statusCard.style.display = 'none';
    metricsCard.style.display = 'block';
    jobsSection.style.display = 'none';
  }
}

navButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.getAttribute('data-target');
    setActiveSection(target);
  });
});

setActiveSection('status');
setInterval(loadDashboardData, 2000);
loadDashboardData();
