import express from 'express';
import cors from 'cors';
import { createIdePlatform } from '@playground/ide-core';

const PORT = Number(process.env.PORT ?? 3100);
const ROOT = process.env.IDE_ROOT ?? process.cwd();

async function main() {
  const platform = await createIdePlatform({ rootPath: ROOT });
  await platform.start();

  const fs = platform.container.resolve(
    (await import('@playground/ide-core')).Tokens.FilesystemService,
  );

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  app.get('/health', (_req, res) => res.json({ status: 'ok', version: '0.1.0' }));

  app.post('/command', async (req, res) => {
    try {
      const { name, args } = req.body as { name: string; args?: Record<string, unknown> };
      const data = await platform.executeCommand(name, args);
      res.json({ success: true, data });
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get('/info/:topic', (req, res) => {
    res.json(platform.getInfo(req.params.topic));
  });

  app.get('/search', async (req, res) => {
    const search = platform.container.resolve(
      (await import('@playground/ide-core')).Tokens.SearchService,
    );
    const q = String(req.query.q ?? '');
    const results = await search.search(q);
    res.json(results);
  });

  app.get('/fs/read', async (req, res) => {
    try {
      const content = await fs.read(String(req.query.path ?? ''));
      res.json({ content });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/fs/write', async (req, res) => {
    try {
      const { path, content } = req.body as { path: string; content: string };
      await fs.write(path, content);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get('/fs/list', async (req, res) => {
    try {
      const entries = await fs.list(String(req.query.path ?? '.'));
      res.json(entries);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get('/fs/exists', async (req, res) => {
    const exists = await fs.exists(String(req.query.path ?? ''));
    res.json({ exists });
  });

  app.post('/fs/mkdir', async (req, res) => {
    const { path, recursive } = req.body as { path: string; recursive?: boolean };
    await fs.mkdir(path, recursive);
    res.json({ success: true });
  });

  app.get('/fs/stat', async (req, res) => {
    const entry = await fs.stat(String(req.query.path ?? ''));
    res.json(entry);
  });

  app.listen(PORT, () => {
    console.log(`IDE API listening on http://localhost:${PORT} (root: ${ROOT})`);
  });
}

main().catch(console.error);
