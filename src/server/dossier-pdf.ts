import PDFDocument from 'pdfkit';
import type { DossierReport } from '../shared/dossier.js';

const printable = (text: string) => text.replace(/[—–‑]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/×/g, 'x').replace(/≥/g, '>=').replace(/→/g, '->');
export function renderDossierPdf(report: DossierReport): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margins: { top: 55, bottom: 55, left: 48, right: 48 }, bufferPages: true,
      info: { Title: report.input.title, Author: 'ASH procedural generators', Subject: `Seed ${report.input.seed}` } });
    const chunks: Buffer[] = []; doc.on('data', chunk => chunks.push(chunk)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
    const width = doc.page.width - 96;
    let currentRecord = '';
    const measure = (text: string, size: number, bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
      return doc.heightOfString(printable(text), { width, lineGap: 2 }) + size * .65;
    };
    const fieldHeight = (field: DossierReport['cards'][number]['fields'][number]) =>
      measure(`${field.provenance.toUpperCase()} / ${field.label}`, 8, true) + measure(field.value, 10);
    const ensure = (height: number) => {
      if (doc.y + height <= doc.page.height - 60) return;
      doc.addPage();
      if (currentRecord) {
        doc.font('Helvetica').fontSize(8).fillColor('#687466').text(printable(`${currentRecord} / continued`), 48, 25, { width, lineBreak: false });
        doc.y = 55;
      }
    };
    const paragraph = (text: string, size = 10, colour = '#25382c', bold = false) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(colour);
      const normalized = printable(text);
      const height = doc.heightOfString(normalized, { width, lineGap: 2 });
      if (height < doc.page.height - 115) ensure(height + 8);
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size).fillColor(colour);
      doc.text(normalized, 48, doc.y, { width, lineGap: 2 }); doc.moveDown(.45);
    };
    paragraph('ASH / PROCEDURAL FIELDBOOK', 10, '#426451', true);
    paragraph(report.input.title, 30, '#203d30', true);
    paragraph(report.zoneName, 17);
    paragraph(`Seed: ${report.input.seed}\nZone: ${report.input.zoneId}\nEncounter creature level range: ${report.input.minimumLevel}-${report.input.maximumLevel ?? 'unbounded'}\nMonster pool: ${report.input.monsterKeys?.length ? report.input.monsterKeys.join(', ') : 'regional wandering table'}\nRecords: ${report.cards.length} | Format version: ${report.version}`, 10);
    paragraph('Story and descriptions use stored, versioned templates. Tarot meanings remain prompts. Missing mechanics remain unresolved.', 12);
    for (const field of report.story) paragraph(field.value, 11);
    paragraph('PROVENANCE', 11, '#203d30', true);
    paragraph('INPUT: user requirements. SELECTED: assembly choices. GENERATED: seeded results. SOURCE: stored rules. UNRESOLVED: missing or invalid fields.', 10);
    paragraph('REQUIREMENT COVERAGE', 11, '#203d30', true);
    for (const row of report.coverage) paragraph(`${row.status.toUpperCase()} / ${row.requirement.replaceAll('_', ' ')}: ${row.detail}`, 10);
    if (!report.coverage.length) paragraph('No required creature types selected.');
    paragraph('Site guardians use act level bands. NPCs retain generated levels 1-3. The encounter minimum is not a combat-balance assessment. Proxies are not exact matches. Full raw draws are available in the JSON export.', 10, '#5c665d');
    const sectionNames = { site: 'Sites', encounter: 'Encounters', npc: 'NPCs', treasure: 'Treasures' };
    for (const category of ['site', 'encounter', 'npc', 'treasure'] as const) {
      const cards = report.cards.filter(card => card.category === category); if (!cards.length) continue;
      currentRecord = '';
      doc.addPage(); paragraph(`${sectionNames[category]} / ${cards.length}`, 24, '#203d30', true);
      for (const card of cards) {
        currentRecord = '';
        const cardHeight = measure(`${card.id} / ${card.title}`, 17, true) + card.fields.reduce((total, field) => total + fieldHeight(field), 0) + 20;
        if (doc.y > 115 && cardHeight < doc.page.height - 115) ensure(cardHeight);
        ensure(120); paragraph(`${card.id} / ${card.title}`, 17, '#203d30', true);
        currentRecord = `${card.id} / ${card.title}`;
        for (const [fieldIndex, field] of card.fields.entries()) {
          if (fieldIndex === card.fields.length - 4) ensure(card.fields.slice(fieldIndex).reduce((total, next) => total + fieldHeight(next), 0) + 12);
          doc.font('Helvetica').fontSize(10);
          const needed = doc.heightOfString(printable(field.value), { width, lineGap: 2 }) + 28;
          ensure(Math.min(needed, doc.page.height - 115));
          paragraph(`${field.provenance.toUpperCase()} / ${field.label}`, 8, field.provenance === 'unresolved' ? '#88611b' : '#426451', true);
          paragraph(field.value);
        }
        doc.moveDown(1);
      }
    }
    currentRecord = 'Sources and generation policy';
    doc.addPage(); paragraph('Sources and generation policy', 20, '#203d30', true);
    paragraph('Story and description templates: dossier-story.ts; version recorded in the audit export and field sources. These are authored source tables selected by the seeded generator, not live prose from a language model. Record locations follow a published round-robin allocation rule.', 10);
    const sources = [...new Set(report.cards.flatMap(card => card.fields.map(field => field.source)))];
    for (const source of sources) paragraph(source, 8.5, '#58674f');
    const pages = doc.bufferedPageRange();
    for (let i = pages.start; i < pages.start + pages.count; i++) {
      doc.switchToPage(i);
      const bottomMargin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.save(); doc.strokeColor('#c9d3c8').lineWidth(.5).moveTo(48, doc.page.height - 42).lineTo(doc.page.width - 48, doc.page.height - 42).stroke();
      doc.font('Helvetica').fontSize(8).fillColor('#687466');
      doc.text(`ASH / ${i + 1} of ${pages.count}`, 48, doc.page.height - 32, { width, lineBreak: false }); doc.restore();
      doc.page.margins.bottom = bottomMargin;
    }
    doc.end();
  });
}
