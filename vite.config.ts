
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react-swc';
  import path from 'path';
  import fs from 'fs';

  const GRAPH_PATH = path.resolve(__dirname, 'src/data/contextGraph.json');
  const FEEDBACK_PATH = path.resolve(__dirname, 'src/data/feedback.json');

  function graphApiPlugin() {
    return {
      name: 'graph-api',
      configureServer(server: any) {
        server.middlewares.use('/api/graph', (req: any, res: any) => {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') { res.end(); return; }

          if (req.method === 'GET') {
            res.end(fs.readFileSync(GRAPH_PATH, 'utf-8'));
            return;
          }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', () => {
              try {
                JSON.parse(body); // validate
                fs.writeFileSync(GRAPH_PATH, body, 'utf-8');
                res.end('{"ok":true}');
              } catch {
                res.statusCode = 400;
                res.end('{"error":"invalid json"}');
              }
            });
            return;
          }

          res.statusCode = 405;
          res.end();
        });
      },
    };
  }

  function feedbackApiPlugin() {
    return {
      name: 'feedback-api',
      configureServer(server: any) {
        server.middlewares.use('/api/feedback', (req: any, res: any) => {
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

          if (req.method === 'OPTIONS') { res.end(); return; }

          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', () => {
              try {
                const entry = JSON.parse(body);
                const existing = fs.existsSync(FEEDBACK_PATH)
                  ? JSON.parse(fs.readFileSync(FEEDBACK_PATH, 'utf-8'))
                  : [];
                existing.push(entry);
                fs.writeFileSync(FEEDBACK_PATH, JSON.stringify(existing, null, 2), 'utf-8');
                res.end('{"ok":true}');
              } catch {
                res.statusCode = 400;
                res.end('{"error":"invalid json"}');
              }
            });
            return;
          }

          res.statusCode = 405;
          res.end();
        });
      },
    };
  }

  export default defineConfig({
    plugins: [react(), graphApiPlugin(), feedbackApiPlugin()],
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
      alias: {
        'vaul@1.1.2': 'vaul',
        'sonner@2.0.3': 'sonner',
        'recharts@2.15.2': 'recharts',
        'react-resizable-panels@2.1.7': 'react-resizable-panels',
        'react-hook-form@7.55.0': 'react-hook-form',
        'react-day-picker@8.10.1': 'react-day-picker',
        'lucide-react@0.487.0': 'lucide-react',
        'input-otp@1.4.2': 'input-otp',
        'embla-carousel-react@8.6.0': 'embla-carousel-react',
        'date-fns@4.1.0': 'date-fns',
        'cmdk@1.1.1': 'cmdk',
        'class-variance-authority@0.7.1': 'class-variance-authority',
        '@radix-ui/react-tooltip@1.1.8': '@radix-ui/react-tooltip',
        '@radix-ui/react-toggle@1.1.2': '@radix-ui/react-toggle',
        '@radix-ui/react-toggle-group@1.1.2': '@radix-ui/react-toggle-group',
        '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
        '@radix-ui/react-switch@1.1.3': '@radix-ui/react-switch',
        '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
        '@radix-ui/react-slider@1.2.3': '@radix-ui/react-slider',
        '@radix-ui/react-separator@1.1.2': '@radix-ui/react-separator',
        '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
        '@radix-ui/react-scroll-area@1.2.3': '@radix-ui/react-scroll-area',
        '@radix-ui/react-radio-group@1.2.3': '@radix-ui/react-radio-group',
        '@radix-ui/react-progress@1.1.2': '@radix-ui/react-progress',
        '@radix-ui/react-popover@1.1.6': '@radix-ui/react-popover',
        '@radix-ui/react-navigation-menu@1.2.5': '@radix-ui/react-navigation-menu',
        '@radix-ui/react-menubar@1.1.6': '@radix-ui/react-menubar',
        '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
        '@radix-ui/react-hover-card@1.1.6': '@radix-ui/react-hover-card',
        '@radix-ui/react-dropdown-menu@2.1.6': '@radix-ui/react-dropdown-menu',
        '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
        '@radix-ui/react-context-menu@2.2.6': '@radix-ui/react-context-menu',
        '@radix-ui/react-collapsible@1.1.3': '@radix-ui/react-collapsible',
        '@radix-ui/react-checkbox@1.1.4': '@radix-ui/react-checkbox',
        '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
        '@radix-ui/react-aspect-ratio@1.1.2': '@radix-ui/react-aspect-ratio',
        '@radix-ui/react-alert-dialog@1.1.6': '@radix-ui/react-alert-dialog',
        '@radix-ui/react-accordion@1.2.3': '@radix-ui/react-accordion',
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
    },
    server: {
      port: 3000,
      open: true,
      proxy: {
        '/api/openai': {
          target: 'https://api.openai.com',
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/api\/openai/, '/v1'),
          configure: (proxy: any) => {
            proxy.on('proxyReq', (proxyReq: any) => {
              // Inject the real key server-side — never exposed to the browser
              proxyReq.setHeader('Authorization', `Bearer ${process.env.OPENAI_API_KEY}`);
            });
          },
        },
      },
    },
  });