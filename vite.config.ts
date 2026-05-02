import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const proxyTarget = 'http://localhost:8088';

const apiProxyDiagnostics = (): Plugin => ({
  name: 'api-proxy-diagnostics',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url?.startsWith('/api/')) {
        const target = req.url?.startsWith('/api/admin') ? 'http://localhost:8082' : proxyTarget;
        server.config.logger.info(`[dev-proxy] ${req.method} ${req.url} -> ${target}`, {
          clear: false,
          timestamp: true
        });
      }
      next();
    });

    setTimeout(() => {
      server.config.logger.info(`[dev-proxy] /api/* is proxied to ${proxyTarget}`, {
        clear: false,
        timestamp: true
      });
      server.config.logger.info('[dev-proxy] Open UI only via http://localhost:5173/', {
        clear: false,
        timestamp: true
      });
    }, 0);
  }
});

export default defineConfig({
  plugins: [react(), apiProxyDiagnostics()],
  server: {
    port: 5173,
    host: 'localhost',
    proxy: {
      '/api/admin': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        secure: false
      },
      '/api': {
        target: proxyTarget,
        changeOrigin: true,
        secure: false
      }
    }
  }
});
