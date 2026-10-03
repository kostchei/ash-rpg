import type { Express } from 'express';
import type { AshDatabase } from './database.js';
import { dossierInputSchema, generateDossier } from './generators/dossier.js';
import { renderDossierHtml } from '../shared/dossier-format.js';
import { renderDossierPdf } from './dossier-pdf.js';
import { randomUUID } from 'node:crypto';
import type { DossierReport } from '../shared/dossier.js';

export function registerDossierRoutes(app: Express, db: AshDatabase) {
  app.get('/api/dossiers/monsters', (_request, response) => response.json(db.listMonsters().map(m => ({ key: m.monsterKey, name: m.name, level: m.level, family: m.family }))));
  const snapshots = new Map<string, { report: DossierReport; createdAt: number }>();
  for (const format of ['generate', 'html', 'pdf'] as const) {
    app.post(`/api/dossiers/${format}`, async (request, response) => {
      if (format === 'pdf' && typeof request.body?.exportId === 'string') {
        const snapshot = snapshots.get(request.body.exportId);
        if (!snapshot || Date.now() - snapshot.createdAt > 3600000) {
          response.status(410).json({ error: 'This export has expired. Generate the report again.' }); return;
        }
        try {
          response.setHeader('Cache-Control', 'no-store');
          response.setHeader('Content-Disposition', 'attachment; filename="ash-fieldbook.pdf"');
          response.type('application/pdf').send(await renderDossierPdf(snapshot.report));
        } catch { response.status(500).json({ error: 'PDF export failed. Please try again.' }); }
        return;
      }
      const parsed = dossierInputSchema.safeParse(request.body);
      if (!parsed.success) { response.status(400).json({ error: parsed.error.issues.map(issue => issue.message).join('; ') }); return; }
      try {
        const report = generateDossier(parsed.data, db);
        const filename = (parsed.data.title.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-').slice(0, 70) || 'ash-dossier');
        response.setHeader('Cache-Control', 'no-store');
        if (format === 'generate') {
          for (const [id, snapshot] of snapshots) if (Date.now() - snapshot.createdAt > 3600000) snapshots.delete(id);
          if (snapshots.size >= 24) snapshots.delete(snapshots.keys().next().value!);
          report.exportId = randomUUID(); snapshots.set(report.exportId, { report, createdAt: Date.now() });
          response.json(report); return;
        }
        response.setHeader('Content-Disposition', `attachment; filename="${filename}.${format}"`);
        if (format === 'html') response.type('html').send(renderDossierHtml(report));
        else response.type('application/pdf').send(await renderDossierPdf(report));
      } catch (error) {
        response.status(422).json({ error: error instanceof Error ? error.message : 'Unable to generate dossier' });
      }
    });
  }
}
