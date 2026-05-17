import express from 'express';
import { config } from '../config.js';

export function createApiServer(licenseService) {
  const app = express();
  app.use(express.json({ limit: '32kb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'castro-license-service', version: '1.0.0' });
  });

  app.post('/v1/license/validate', (req, res) => {
    const secret = req.get('X-License-Secret') || req.get('x-license-secret');
    if (!config.api.secret || secret !== config.api.secret) {
      return res.status(401).json({ valid: false, reason: 'unauthorized' });
    }

    const { licenseKey, productId, cfxKey, resource } = req.body || {};
    const result = licenseService.validateForApi({ licenseKey, productId, cfxKey, resource });

    return res.status(result.status).json({
      valid: result.valid,
      reason: result.reason,
      licenseId: result.licenseId ?? null,
    });
  });

  return app;
}

export function startApiServer(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(config.api.port, config.api.host, () => {
      console.log(`[api] http://${config.api.host}:${config.api.port}`);
      console.log(`[api] POST /v1/license/validate`);
      resolve(server);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(
          new Error(
            `Porta ${config.api.port} já em uso. Feche a outra instância do bot (Ctrl+C) ou altere API_PORT no .env`
          )
        );
      } else {
        reject(err);
      }
    });
  });
}
