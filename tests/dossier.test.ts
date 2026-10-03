import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createAshServer } from '../src/server/app.js';
import { generateDossier } from '../src/server/generators/dossier.js';
import { renderDossierHtml } from '../src/shared/dossier-format.js';
import type { DossierInput } from '../src/shared/dossier.js';

const input: DossierInput = { title: 'Skeldir / Hrafnfjord', zoneId: 'midnight_sun', seed: 'dossier-test', minimumLevel: 10,
  counts: { sites: 5, encounters: 5, npcs: 5, treasures: 5 }, required: ['vampire', 'seawolf', 'demon_lord', 'giant'], allowProxies: true };
describe('procedural fieldbook', () => {
  let server: Awaited<ReturnType<typeof createAshServer>>;
  beforeAll(async () => { server = await createAshServer({ dbPath: ':memory:', frontend: false, port: 0 }); });
  afterAll(async () => { await server.close(); });
  it('replays all records and template text without creating campaigns or rewards', () => {
    const before = server.db.db.prepare('SELECT count(*) AS n FROM campaigns').get();
    const first = generateDossier(input, server.db); const repeat = generateDossier(input, server.db);
    expect(repeat).toEqual(first); expect(first.cards).toHaveLength(20);
    expect(first.story.length).toBeGreaterThan(2);
    expect(first.coverage.map(row => row.status)).toEqual(['met', 'proxy', 'proxy', 'met']);
    expect(server.db.db.prepare('SELECT count(*) AS n FROM campaigns').get()).toEqual(before);
    expect(generateDossier({ ...input, seed: 'different-seed' }, server.db)).not.toEqual(first);
    const raw = first.raw as { encounters: { monster: { level: number }; companion?: { level: number } }[] };
    expect(raw.encounters.every(e => (e.companion?.level ?? e.monster.level) >= 10)).toBe(true);
  });
  it('does not report exact fulfilment for unsupported types without proxy permission', () => {
    const report = generateDossier({ ...input, allowProxies: false }, server.db);
    expect(report.coverage.filter(row => row.status === 'unresolved').map(row => row.requirement)).toEqual(['seawolf', 'demon_lord']);
    expect(report.cards.filter(card => card.category === 'encounter')).toHaveLength(5);
  });
  it('flags malformed source movement while retaining the original audit record', () => {
    const report = generateDossier({ ...input, seed: 'skeldir-hrafnfjord-2026-10-03' }, server.db);
    const fields = report.cards.flatMap(card => card.fields);
    expect(fields.some(f => f.provenance === 'unresolved' && f.value.includes('movement source contains another stat block'))).toBe(true);
    expect(fields.filter(f => f.label.includes('combat block')).every(f => !f.value.includes('BEAR, POLAR'))).toBe(true);
    expect(JSON.stringify(report.raw)).toContain('BEAR, POLAR');
  });
  it('validates bounds and reports impossible regional selections without fallback invention', async () => {
    await request(server.app).post('/api/dossiers/generate').send({ ...input, counts: { ...input.counts, sites: 100 } }).expect(400);
    await request(server.app).post('/api/dossiers/generate').send({ ...input, counts: { ...input.counts, encounters: 2 } }).expect(400);
    await request(server.app).post('/api/dossiers/generate').send({ ...input, minimumLevel: 20, required: [] }).expect(422);
  });
  it('handles non-encounter packets without requiring an eligible wandering table', () => {
    const report = generateDossier({ ...input, minimumLevel: 20, required: [], counts: { sites: 1, encounters: 0, npcs: 1, treasures: 1 } }, server.db);
    expect(report.cards).toHaveLength(3);
  });
  it('respects level ceilings and explicit stock pools without avoidable repeats', () => {
    const report = generateDossier({ ...input, minimumLevel: 1, maximumLevel: 3, required: [], monsterKeys: ['nord', 'dverg', 'sea_nymph', 'wolf', 'boar'] }, server.db);
    const raw = report.raw as { encounters: { choice: { key: string }; monster: { level: number } }[] };
    expect(raw.encounters.every(e => e.monster.level >= 1 && e.monster.level <= 3)).toBe(true);
    expect(new Set(raw.encounters.map(e => e.choice.key)).size).toBe(5);
    const nord = report.cards.find(c => c.fields.some(f => f.label === 'Composition' && f.value === '1 Nord'))!;
    expect(nord.fields.find(f => f.label === 'Situation')!.value).not.toMatch(/serpent/);
    const bounded = generateDossier({ ...input, maximumLevel: 12 }, server.db);
    expect(bounded.coverage.find(c => c.requirement === 'demon_lord')!.status).toBe('unresolved');
  });
  it('validates custom monster keys and exposes an existing-stock catalogue', async () => {
    await request(server.app).post('/api/dossiers/generate').send({ ...input, maximumLevel: 1 }).expect(400);
    await request(server.app).post('/api/dossiers/generate').send({ ...input, monsterKeys: ['invented_monster'] }).expect(422);
    await request(server.app).post('/api/dossiers/generate').send({ ...input, monsterKeys: ['nord'] }).expect(422);
    const catalogue = await request(server.app).get('/api/dossiers/monsters').expect(200);
    expect(catalogue.body.some((m: { key: string; level: number }) => m.key === 'nord' && m.level === 2)).toBe(true);
  });
  it('discloses exhausted pools and gives repeated species independent profiles', () => {
    const report = generateDossier({ ...input, seed: 'profile-diversity', required: [], monsterKeys: ['vampire'] }, server.db);
    const raw = report.raw as { encounters: { monster: unknown }[] };
    expect(report.cards.filter(c => c.category === 'encounter').slice(1).every(c => c.fields.some(f => f.label === 'Selection' && f.value.includes('pool exhausted')))).toBe(true);
    expect(new Set(raw.encounters.map(e => JSON.stringify(e.monster))).size).toBeGreaterThan(1);
  });
  it('escapes all user and source text in the standalone HTML', () => {
    const report = generateDossier({ ...input, title: '<script>alert(1)</script>' }, server.db);
    report.cards[0].fields[0].value = '<img src=x onerror=alert(1)>';
    const html = renderDossierHtml(report);
    expect(html).not.toContain('<script>'); expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;'); expect(html).toContain('@media print');
    expect(html).toContain('Requirement coverage'); expect(html).not.toContain('```json');
  });
  it('exports real PDFs from the displayed snapshot without rerunning generation', async () => {
    const generated = await request(server.app).post('/api/dossiers/generate').send(input).expect(200);
    expect(generated.body.cards).toHaveLength(20);
    const sourceLookup = vi.spyOn(server.db, 'getMonstersForZone').mockImplementation(() => { throw new Error('Source has changed'); });
    const pdf = await request(server.app).post('/api/dossiers/pdf').send({ exportId: generated.body.exportId }).buffer(true).parse((res, done) => {
      const chunks: Buffer[] = []; res.on('data', chunk => chunks.push(chunk)); res.on('end', () => done(null, Buffer.concat(chunks)));
    }).expect(200).expect('Content-Type', /application\/pdf/);
    expect(pdf.body.subarray(0, 5).toString()).toBe('%PDF-');
    expect(sourceLookup).not.toHaveBeenCalled(); sourceLookup.mockRestore();
    await request(server.app).post('/api/dossiers/pdf').send({ exportId: 'expired' }).expect(410);
    const html = await request(server.app).post('/api/dossiers/html').send(input).expect(200).expect('Content-Type', /text\/html/);
    expect(html.text).toContain('Skeldir / Hrafnfjord'); expect(html.text).toContain('Stored meaning');
  });
});
