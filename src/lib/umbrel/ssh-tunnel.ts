import { Client } from 'ssh2';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

interface TunnelConfig {
  sshHost: string;
  sshPort: number;
  sshUser: string;
  sshKeyPath: string;
  remoteHost: string;
  remotePort: number;
  localPort: number;
}

let activeConnection: Client | null = null;
let tunnelServer: net.Server | null = null;

function expandTilde(filePath: string): string {
  if (filePath.startsWith('~')) {
    return path.join(os.homedir(), filePath.slice(1));
  }
  return filePath;
}

export async function createSSHTunnel(config: TunnelConfig): Promise<number> {
  return new Promise((resolve, reject) => {
    // Close existing connection if any
    if (activeConnection) {
      activeConnection.end();
      activeConnection = null;
    }
    if (tunnelServer) {
      tunnelServer.close();
      tunnelServer = null;
    }

    const conn = new Client();
    const keyPath = expandTilde(config.sshKeyPath);

    // Check if key file exists
    if (!fs.existsSync(keyPath)) {
      reject(new Error(`SSH key file not found: ${keyPath}`));
      return;
    }

    const privateKey = fs.readFileSync(keyPath);

    conn.on('ready', () => {
      console.log('SSH Connection established');
      activeConnection = conn;

      // Create local server for port forwarding
      tunnelServer = net.createServer((sock) => {
        conn.forwardOut(
          sock.remoteAddress || '127.0.0.1',
          sock.remotePort || 0,
          config.remoteHost,
          config.remotePort,
          (err, stream) => {
            if (err) {
              sock.end();
              return;
            }
            sock.pipe(stream).pipe(sock);
          }
        );
      });

      tunnelServer.listen(config.localPort, '127.0.0.1', () => {
        console.log(`SSH Tunnel established: localhost:${config.localPort} -> ${config.remoteHost}:${config.remotePort}`);
        resolve(config.localPort);
      });

      tunnelServer.on('error', (err) => {
        reject(err);
      });
    });

    conn.on('error', (err) => {
      console.error('SSH Connection error:', err);
      reject(err);
    });

    conn.on('close', () => {
      console.log('SSH Connection closed');
      if (tunnelServer) {
        tunnelServer.close();
        tunnelServer = null;
      }
      activeConnection = null;
    });

    conn.connect({
      host: config.sshHost,
      port: config.sshPort,
      username: config.sshUser,
      privateKey: privateKey,
    });
  });
}

export function closeTunnel(): void {
  if (activeConnection) {
    activeConnection.end();
    activeConnection = null;
  }
  if (tunnelServer) {
    tunnelServer.close();
    tunnelServer = null;
  }
}

export function isTunnelActive(): boolean {
  return activeConnection !== null && tunnelServer !== null;
}

// Get default tunnel config from environment
export function getDefaultTunnelConfig(): TunnelConfig {
  return {
    sshHost: process.env.UMBREL_SSH_HOST || 'umbrel.local',
    sshPort: parseInt(process.env.UMBREL_SSH_PORT || '22'),
    sshUser: process.env.UMBREL_SSH_USER || 'umbrel',
    sshKeyPath: process.env.UMBREL_SSH_KEY_PATH || '~/.ssh/id_ed25519_umbrel',
    remoteHost: 'localhost',
    remotePort: parseInt(process.env.UMBREL_DB_PORT || '5432'),
    localPort: 15432, // Use different local port to avoid conflicts
  };
}
