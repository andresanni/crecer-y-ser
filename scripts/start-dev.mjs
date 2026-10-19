import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync, spawn } from 'node:child_process';

const resolveMainRepoPath = () => {
  try {
    const commonDirOutput = execSync('git rev-parse --git-common-dir', {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    if (!commonDirOutput) {
      return '';
    }
    const resolvedPath = path.resolve(commonDirOutput);
    if (path.basename(resolvedPath) === '.git') {
      return path.dirname(resolvedPath);
    }
    return path.dirname(path.dirname(resolvedPath));
  } catch {
    return '';
  }
};

const parseKeyValueFile = (filePath) => {
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const content = fs.readFileSync(filePath, 'utf8');
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    result[key] = value;
  }
  return result;
};

const ensureWorktreeFiles = (worktreePath, mainRepoPath, pdfWorkerKeyPath) => {
  if (!mainRepoPath || path.resolve(worktreePath) === path.resolve(mainRepoPath)) {
    return;
  }

  const worktreeNodeModules = path.join(worktreePath, 'node_modules');
  const mainNodeModules = path.join(mainRepoPath, 'node_modules');
  if (!fs.existsSync(worktreeNodeModules) && fs.existsSync(mainNodeModules)) {
    try {
      fs.symlinkSync(mainNodeModules, worktreeNodeModules, 'junction');
      console.log(`[Dev Setup] node_modules enlazado desde ${mainNodeModules}`);
    } catch (error) {
      console.warn(`[Dev Setup] No se pudo crear junction de node_modules: ${error.message}`);
    }
  }

  const worktreeEnvLocal = path.join(worktreePath, '.env.development.local');
  const mainEnvLocal = path.join(mainRepoPath, '.env.development.local');
  if (!fs.existsSync(worktreeEnvLocal)) {
    if (fs.existsSync(mainEnvLocal)) {
      fs.copyFileSync(mainEnvLocal, worktreeEnvLocal);
      console.log(`[Dev Setup] .env.development.local copiado desde ${mainRepoPath}`);
    } else {
      let envContent = 'VITE_POCKETBASE_URL=http://127.0.0.1:8090\n';
      if (fs.existsSync(pdfWorkerKeyPath)) {
        const workerKey = fs.readFileSync(pdfWorkerKeyPath, 'utf8').trim();
        if (workerKey) {
          envContent += `CYS_PDF_WORKER_KEY=${workerKey}\n`;
        }
      }
      fs.writeFileSync(worktreeEnvLocal, envContent, 'utf8');
      console.log('[Dev Setup] .env.development.local generado automáticamente.');
    }
  }

  const worktreeEnv = path.join(worktreePath, '.env');
  const mainEnv = path.join(mainRepoPath, '.env');
  if (!fs.existsSync(worktreeEnv) && fs.existsSync(mainEnv)) {
    fs.copyFileSync(mainEnv, worktreeEnv);
    console.log(`[Dev Setup] .env copiado desde ${mainRepoPath}`);
  }
};

const loadEnvIntoProcess = (filePath, overwrite = false) => {
  if (!fs.existsSync(filePath)) {
    return;
  }
  const entries = parseKeyValueFile(filePath);
  for (const [key, value] of Object.entries(entries)) {
    if (overwrite || !process.env[key]) {
      process.env[key] = value;
    }
  }
};

const checkPocketBaseHealth = async () => {
  try {
    const response = await fetch('http://127.0.0.1:8090/api/health', {
      signal: AbortSignal.timeout(600)
    });
    return response.ok;
  } catch {
    return false;
  }
};

const ensureTeacherLinkKey = (secretPath) => {
  if (fs.existsSync(secretPath)) {
    const key = fs.readFileSync(secretPath, 'utf8').trim();
    if (key.length === 32) {
      return key;
    }
  }
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const randomBytes = crypto.randomBytes(32);
  let secret = '';
  for (let i = 0; i < 32; i += 1) {
    secret += alphabet[randomBytes[i] % alphabet.length];
  }
  fs.writeFileSync(secretPath, secret, 'utf8');
  return secret;
};

const displayMockCredentials = (credentialsPath) => {
  if (!fs.existsSync(credentialsPath)) {
    console.log(`[Dev Setup] Archivo de credenciales no encontrado en ${credentialsPath}`);
    return;
  }
  const credentials = parseKeyValueFile(credentialsPath);
  console.log('\n================================================================');
  console.log(' PocketBase Dev — Credenciales Mock Locales');
  console.log(` Archivo: ${credentialsPath}`);
  console.log('----------------------------------------------------------------');
  if (credentials.ADMIN_URL || credentials.ADMIN_EMAIL) {
    console.log(` Panel Admin: ${credentials.ADMIN_URL || 'http://127.0.0.1:8090/_/'}`);
    console.log(` Admin Email: ${credentials.ADMIN_EMAIL || '-'}`);
    console.log(` Admin Clave: ${credentials.ADMIN_PASSWORD || '-'}`);
  }
  if (credentials.APP_EMAIL) {
    console.log('----------------------------------------------------------------');
    console.log(` App User:    ${credentials.APP_EMAIL}`);
    console.log(` App Clave:   ${credentials.APP_PASSWORD || '-'}`);
  }
  console.log('================================================================\n');
};

const startPocketBaseServer = async ({
  executablePath,
  dataDirectory,
  hooksDirectory,
  migrationsDirectory,
  teacherLinkKey,
  pdfWorkerKey
}) => {
  const origins = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5174',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
    'http://localhost:5176',
    'http://127.0.0.1:5176'
  ];

  const pbProcess = spawn(
    executablePath,
    [
      'serve',
      '--http=127.0.0.1:8090',
      `--origins=${origins.join(',')}`,
      `--dir=${dataDirectory}`,
      `--hooksDir=${hooksDirectory}`,
      `--migrationsDir=${migrationsDirectory}`,
      '--automigrate=true'
    ],
    {
      env: {
        ...process.env,
        CYS_TEACHER_LINK_KEY: teacherLinkKey,
        ...(pdfWorkerKey ? { CYS_PDF_WORKER_KEY: pdfWorkerKey } : {})
      },
      stdio: ['ignore', 'pipe', 'pipe']
    }
  );

  let startupError = '';
  pbProcess.stderr.on('data', (chunk) => {
    startupError += chunk.toString();
  });

  const pollStart = Date.now();
  const maxWaitMs = 10000;
  while (Date.now() - pollStart < maxWaitMs) {
    if (pbProcess.exitCode !== null) {
      throw new Error(`PocketBase finalizó prematuramente con código ${pbProcess.exitCode}: ${startupError.trim()}`);
    }
    const isHealthy = await checkPocketBaseHealth();
    if (isHealthy) {
      pbProcess.stderr.pipe(process.stderr);
      return pbProcess;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  pbProcess.kill();
  throw new Error(`Tiempo de espera agotado para iniciar PocketBase en 127.0.0.1:8090. ${startupError.trim()}`);
};

const main = async () => {
  const currentDir = process.cwd();
  const mainRepoPath = resolveMainRepoPath();
  const pocketBaseRoot = process.env.POCKETBASE_ROOT || 'C:\\pocketbase';
  const credentialsPath = path.join(pocketBaseRoot, 'dev-credentials.txt');
  const executablePath = path.join(pocketBaseRoot, 'pocketbase.exe');
  const dataDirectory = path.join(pocketBaseRoot, 'pb_data');
  const teacherKeyPath = path.join(pocketBaseRoot, 'teacher-link-dev.key');
  const pdfWorkerKeyPath = path.join(pocketBaseRoot, 'pdf-worker-dev.key');
  const hooksDirectory = path.join(currentDir, 'pb_hooks');
  const migrationsDirectory = path.join(currentDir, 'pb_migrations');

  ensureWorktreeFiles(currentDir, mainRepoPath, pdfWorkerKeyPath);

  const envLocalPath = path.join(currentDir, '.env.development.local');
  const envPath = path.join(currentDir, '.env');
  loadEnvIntoProcess(envPath, false);
  loadEnvIntoProcess(envLocalPath, true);

  process.env.VITE_POCKETBASE_URL = 'http://127.0.0.1:8090';
  console.log('[Dev Setup] VITE_POCKETBASE_URL configurado en http://127.0.0.1:8090 (local)');

  const isAlreadyRunning = await checkPocketBaseHealth();
  let spawnedPocketBaseProcess = null;

  if (isAlreadyRunning) {
    console.log('[PocketBase Dev] Instancia activa detectada en http://127.0.0.1:8090.');
  } else {
    if (!fs.existsSync(executablePath)) {
      throw new Error(`No se encontró pocketbase.exe en ${pocketBaseRoot}.`);
    }
    if (!fs.existsSync(path.join(dataDirectory, 'data.db'))) {
      throw new Error(`No se encontró pb_data/data.db en ${pocketBaseRoot}.`);
    }

    const teacherLinkKey = ensureTeacherLinkKey(teacherKeyPath);
    let pdfWorkerKey = '';
    if (fs.existsSync(pdfWorkerKeyPath)) {
      pdfWorkerKey = fs.readFileSync(pdfWorkerKeyPath, 'utf8').trim();
    }

    console.log('[PocketBase Dev] Iniciando servicio PocketBase en http://127.0.0.1:8090...');
    spawnedPocketBaseProcess = await startPocketBaseServer({
      executablePath,
      dataDirectory,
      hooksDirectory,
      migrationsDirectory,
      teacherLinkKey,
      pdfWorkerKey
    });
    console.log('[PocketBase Dev] Servicio PocketBase listo.');
  }

  displayMockCredentials(credentialsPath);

  const viteBin = path.join(currentDir, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!fs.existsSync(viteBin)) {
    throw new Error(`No se encontró el ejecutable de Vite en ${viteBin}.`);
  }

  const forwardArgs = process.argv.slice(2);
  const viteArgs = forwardArgs.some((arg) => arg.startsWith('--clearScreen'))
    ? forwardArgs
    : ['--clearScreen=false', ...forwardArgs];

  const viteProcess = spawn(process.execPath, [viteBin, ...viteArgs], {
    stdio: 'inherit',
    env: process.env
  });

  const cleanup = () => {
    if (spawnedPocketBaseProcess && !spawnedPocketBaseProcess.killed) {
      console.log('\n[PocketBase Dev] Deteniendo instancia local de PocketBase...');
      spawnedPocketBaseProcess.kill();
    }
  };

  process.on('SIGINT', () => {
    cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    cleanup();
    process.exit(0);
  });

  viteProcess.on('exit', (code) => {
    cleanup();
    process.exit(code ?? 0);
  });
};

main().catch((error) => {
  console.error(`\n[Dev Setup Error] ${error.message}\n`);
  process.exit(1);
});
