import { mkdirSync, writeFileSync } from 'node:fs';
import { createAshServer } from '../src/server/app.js';
import { generateDossier } from '../src/server/generators/dossier.js';
import { renderDossierHtml } from '../src/shared/dossier-format.js';
import { renderDossierPdf } from '../src/server/dossier-pdf.js';
import type { DossierInput } from '../src/shared/dossier.js';
import express from 'express';
import { resolve } from 'node:path';

// Isolated preview: reads source tables, never a live campaign database.
const server = await createAshServer({ dbPath: ':memory:', frontend: false, port: 3107 });
server.app.get('/comparison/atlas.pdf', (_request, response) => response.sendFile(resolve('output/pdf/region-comparison-atlas.pdf')));
server.app.use('/comparison', express.static(resolve('outputs/region-comparison')));
server.app.use(express.static(resolve('dist/client')));
server.app.use((_request, response) => response.sendFile(resolve('dist/client/index.html')));
const input: DossierInput = { title: 'Skeldir / Hrafnfjord', zoneId: 'midnight_sun', seed: 'skeldir-hrafnfjord-2026-10-03', minimumLevel: 10,
  counts: { sites: 5, encounters: 5, npcs: 5, treasures: 5 }, required: ['vampire', 'seawolf', 'demon_lord', 'giant'], allowProxies: true };
if (!process.argv.includes('--skip-example')) {
const report = generateDossier(input, server.db);
mkdirSync('output/pdf', { recursive: true });
mkdirSync('outputs/hrafnfjord-10plus', { recursive: true });
writeFileSync('output/pdf/hrafnfjord-fieldbook.pdf', await renderDossierPdf(report));
writeFileSync('outputs/hrafnfjord-10plus/fieldbook.html', renderDossierHtml(report));
writeFileSync('outputs/hrafnfjord-10plus/fieldbook.json', JSON.stringify(report, null, 2));
}
if (process.argv.includes('--serve')) {
  await server.listen(); console.log('Dossier preview: http://localhost:3107/generator');
  process.once('SIGINT', async () => { await server.close(); process.exit(0); });
} else await server.close();
