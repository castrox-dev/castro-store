import { assertConfig, config } from './config.js';
import { openDatabase, createLicenseRepo } from './db/index.js';
import { createLicenseService } from './services/license-service.js';
import { createApiServer, startApiServer } from './api/server.js';
import { startDiscordBot } from './bot/index.js';

async function main() {
  console.log('[castro-license-service] build: node:sqlite (v1.0.1 — sem better-sqlite3)');
  assertConfig();

  const db = openDatabase(config.databasePath);
  const repo = createLicenseRepo(db);
  const licenseService = createLicenseService(repo, config.pepper);

  const apiApp = createApiServer(licenseService);
  await startApiServer(apiApp);

  await startDiscordBot(licenseService, repo);

  console.log('[castro-license-service] Pronto.');
  console.log(`[info] Pepper: ${config.pepper.slice(0, 8)}…`);
  console.log('[info] Configure nos tablets:');
  console.log(`       Config.LicenseApiUrl = 'http://SEU_IP_PUBLICO:${config.api.port}/v1/license/validate'`);
  console.log('       Config.LicenseApiSecret = (mesmo LICENSE_API_SECRET do .env)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
