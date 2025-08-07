#!/usr/bin/env node

/**
 * Advanced Server Management System for Audion
 * Prevents port conflicts and manages multiple server environments
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Server configurations
const SERVERS = {
  // Development servers (for user testing)
  dev: {
    backend: { port: 8001, cmd: 'uvicorn', args: ['server:app', '--reload', '--port', '8001'] },
    frontend: { port: 8081, cmd: 'npx', args: ['expo', 'start'] }
  },
  // Testing servers (for AI assistant testing)
  test: {
    backend: { port: 8002, cmd: 'uvicorn', args: ['server:app', '--reload', '--port', '8002'] },
    frontend: { port: 8083, cmd: 'npx', args: ['expo', 'start', '--port', '8083'] }
  }
};

class ServerManager {
  constructor() {
    this.processes = new Map();
    this.lockFile = path.join(__dirname, '.server-locks');
    this.logDir = path.join(__dirname, 'logs');
    
    // Create logs directory
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir);
    }
  }

  async isPortInUse(port) {
    return new Promise((resolve) => {
      exec(`lsof -ti:${port}`, (error, stdout) => {
        resolve(stdout.trim() !== '');
      });
    });
  }

  async killPort(port) {
    return new Promise((resolve) => {
      exec(`lsof -ti:${port} | xargs kill -9`, (error) => {
        setTimeout(resolve, 1000); // Wait for cleanup
      });
    });
  }

  async startServer(env, type) {
    const config = SERVERS[env][type];
    const serverId = `${env}-${type}`;
    
    // Check if port is in use
    if (await this.isPortInUse(config.port)) {
      console.log(`⚠️  Port ${config.port} is in use. Cleaning up...`);
      await this.killPort(config.port);
    }

    console.log(`🚀 Starting ${serverId} server on port ${config.port}...`);
    
    const workDir = type === 'backend' ? 
      path.join(__dirname, 'backend') : 
      path.join(__dirname, 'audion-app');

    // Create log files
    const logFile = path.join(this.logDir, `${serverId}.log`);
    const errorFile = path.join(this.logDir, `${serverId}.error.log`);
    
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    const errorStream = fs.createWriteStream(errorFile, { flags: 'a' });

    // Special handling for backend with virtual environment
    let actualCmd = config.cmd;
    let actualArgs = config.args;
    
    if (type === 'backend') {
      // Check if we need to activate venv
      const venvPath = path.join(__dirname, 'venv', 'bin', 'activate');
      if (fs.existsSync(venvPath)) {
        actualCmd = 'bash';
        actualArgs = ['-c', `source ${venvPath} && cd ${workDir} && uvicorn server:app --reload --port ${config.port}`];
      }
    }

    const childProcess = spawn(actualCmd, actualArgs, {
      cwd: workDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
      env: {
        ...process.env,
        ...(type === 'frontend' && env === 'test' ? { EXPO_PUBLIC_BACKEND_URL: 'http://localhost:8002' } : {}),
        ...(type === 'frontend' && env === 'dev' ? { EXPO_PUBLIC_BACKEND_URL: 'http://localhost:8001' } : {})
      }
    });

    // Log output
    childProcess.stdout.pipe(logStream);
    childProcess.stderr.pipe(errorStream);
    
    // Console output
    childProcess.stdout.on('data', (data) => {
      console.log(`[${serverId}] ${data.toString().trim()}`);
    });
    
    childProcess.stderr.on('data', (data) => {
      console.error(`[${serverId}] ${data.toString().trim()}`);
    });

    childProcess.on('exit', (code) => {
      console.log(`💀 ${serverId} exited with code ${code}`);
      this.processes.delete(serverId);
      this.updateLockFile();
    });

    this.processes.set(serverId, {
      process: childProcess,
      port: config.port,
      env,
      type,
      startTime: new Date()
    });
    
    this.updateLockFile();
    return childProcess;
  }

  updateLockFile() {
    const locks = {};
    for (const [id, info] of this.processes) {
      locks[id] = {
        port: info.port,
        pid: info.process.pid,
        env: info.env,
        type: info.type,
        startTime: info.startTime
      };
    }
    fs.writeFileSync(this.lockFile, JSON.stringify(locks, null, 2));
  }

  async stopAll() {
    console.log('🛑 Stopping all servers...');
    for (const [id, info] of this.processes) {
      console.log(`Stopping ${id}...`);
      info.process.kill('SIGTERM');
    }
    
    // Clean up lock file
    if (fs.existsSync(this.lockFile)) {
      fs.unlinkSync(this.lockFile);
    }
  }

  async startEnvironment(env) {
    console.log(`🌟 Starting ${env} environment...`);
    
    // Start backend first
    await this.startServer(env, 'backend');
    
    // Wait a bit for backend to start
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Start frontend
    await this.startServer(env, 'frontend');
    
    console.log(`✅ ${env} environment started successfully!`);
    console.log(`   Backend: http://localhost:${SERVERS[env].backend.port}`);
    console.log(`   Frontend: http://localhost:${SERVERS[env].frontend.port}`);
  }

  showStatus() {
    console.log('\n📊 Server Status:');
    if (this.processes.size === 0) {
      console.log('   No servers running');
      return;
    }
    
    for (const [id, info] of this.processes) {
      const uptime = Math.floor((Date.now() - info.startTime) / 1000);
      console.log(`   ${id}: PID ${info.process.pid}, Port ${info.port}, Uptime: ${uptime}s`);
    }
  }
}

// CLI Interface
async function main() {
  const manager = new ServerManager();
  const command = process.argv[2];
  const env = process.argv[3] || 'dev';

  // Handle cleanup on exit
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    manager.stopAll().then(() => process.exit(0));
  });

  switch (command) {
    case 'start':
      await manager.startEnvironment(env);
      manager.showStatus();
      // Keep process alive
      process.stdin.resume();
      break;
      
    case 'stop':
      await manager.stopAll();
      break;
      
    case 'status':
      manager.showStatus();
      break;
      
    case 'clean':
      // Kill all processes on common ports
      const ports = [8001, 8002, 8081, 8082, 8083];
      for (const port of ports) {
        await manager.killPort(port);
      }
      console.log('✅ All ports cleaned');
      break;
      
    default:
      console.log(`
🎯 Audion Server Manager

Usage:
  node server-manager.js start [env]  - Start servers (env: dev|test, default: dev)
  node server-manager.js stop         - Stop all servers  
  node server-manager.js status       - Show server status
  node server-manager.js clean        - Clean all ports

Environments:
  dev  - Development servers (backend: 8001, frontend: 8081) - For user testing
  test - Testing servers (backend: 8002, frontend: 8083) - For AI assistant testing

Examples:
  node server-manager.js start dev    # Start development environment
  node server-manager.js start test   # Start testing environment
      `);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = ServerManager;