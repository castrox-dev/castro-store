import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { openDatabase, createLicenseRepo } from '../db/license-db.js';
import { createLicenseService } from '../../castro-license-service/src/services/license-service.js';
import { createApiServer, startApiServer } from '../../castro-license-service/src/api/server.js';
import { createCommandHandlers } from '../../castro-license-service/src/bot/commands.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function resolveDbPath() {
  const raw = process.env.DATABASE_PATH || './data/licenses.db';
  if (raw.startsWith('./') || raw.startsWith('../')) {
    return join(ROOT, raw);
  }
  return raw;
}

export async function bootstrapLicense(client) {
  const pepper = process.env.LICENSE_PEPPER || 'NW_LIC_V3_2026';
  const db = openDatabase(resolveDbPath());
  const repo = createLicenseRepo(db);
  const licenseService = createLicenseService(repo, pepper);

  if (process.env.LICENSE_API_SECRET) {
    const apiApp = createApiServer(licenseService);
    await startApiServer(apiApp);
    console.log('[licenca] API V3 ativa — validação online disponível');
  } else {
    console.warn(
      '[licenca] LICENSE_API_SECRET não definido — API desligada (só geração offline + DB)'
    );
  }

  client.licenseHandlers = createCommandHandlers(licenseService, repo);
  client.licenseService = licenseService;

  return { licenseService, repo };
}
