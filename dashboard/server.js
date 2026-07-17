import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import net from 'net';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

function getSocketPath() {
  if (process.env.SOCKET_PATH) return process.env.SOCKET_PATH;
  if (process.platform === 'win32') return '\\\\.\\pipe\\queuectl';
  return path.join(os.tmpdir(), 'queuectl.sock');
}

const SOCKET_PATH = getSocketPath();

function sendCommand(command, payload = null) {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(SOCKET_PATH);

    client.on('connect', () => {
      client.write(JSON.stringify({ command, option: null, flag: null, value: payload }));
    });

    client.on('data', (data) => {
      try {
        const res = JSON.parse(data.toString());
        client.end();
        if (res?.success) resolve(res.message);
        else reject(new Error(res?.message || 'Request failed'));
      } catch (error) {
        client.end();
        reject(error);
      }
    });

    client.on('error', (error) => {
      client.end();
      reject(error);
    });
  });
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/status', async (_req, res) => {
  try {
    const status = await sendCommand('status');
    res.json(status);
  } catch (error) {
    res.status(503).json({ error: 'Unable to connect to QueueCTL daemon' });
  }
});

app.get('/api/jobs', async (req, res) => {
  try {
    const state = req.query.state || 'completed';
    const jobs = await sendCommand('list', state);
    res.json(jobs);
  } catch (error) {
    res.status(503).json({ error: 'Unable to connect to QueueCTL daemon' });
  }
});

app.get('/api/metrics', async (_req, res) => {
  try {
    const metrics = await sendCommand('metrics');
    res.json(metrics);
  } catch (error) {
    res.status(503).json({ error: 'Unable to connect to QueueCTL daemon' });
  }
});

const server = app.listen(port, () => {
  console.log(`Dashboard listening on http://localhost:${port}`);
});

server.on('error', (error) => {
  if (error && error.code === 'EADDRINUSE') {
    console.error(`Dashboard port ${port} is already in use. Use PORT=<another-port> and try again.`);
  } else {
    console.error('Dashboard failed to start:', error);
  }
  process.exit(1);
});
