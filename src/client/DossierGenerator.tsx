import { useEffect, useState, type FormEvent } from 'react';
import { Dices, Download, Printer, ArrowLeft, RefreshCw } from 'lucide-react';
import { ZONE_PROFILES } from '../shared/zone-profiles';
import { DOSSIER_REQUIREMENTS, type DossierInput, type DossierReport } from '../shared/dossier';
import { renderDossierHtml } from '../shared/dossier-format';
import { SITE_NAME_STYLES, type SiteNameStyle } from '../shared/site-name-qualifiers';
import './dossier.css';

const defaults: DossierInput = { title: 'Skeldir / Hrafnfjord', zoneId: 'midnight_sun', seed: 'skeldir-hrafnfjord-2026-10-03', minimumLevel: 10,
  counts: { sites: 5, encounters: 5, npcs: 5, treasures: 5 }, required: [...DOSSIER_REQUIREMENTS], allowProxies: true };
const labels = { sites: 'Sites', encounters: 'Encounters', npcs: 'NPCs', treasures: 'Treasures' };
const requirementNames = { vampire: 'Vampire', seawolf: 'Seawolf', demon_lord: 'Demon lord', giant: 'Giant' };
const namingStyles = { epithet_subject: 'Type, qualifier and subject', person: 'Named after a person', place: 'Named after a place', short: 'Short: Brazen Keep', tarot: 'Named after the tarot draw', plain: 'Type and subject' };
const save = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export function DossierGenerator() {
  const [input, setInput] = useState<DossierInput>(defaults);
  const [report, setReport] = useState<DossierReport | null>(null);
  const [busy, setBusy] = useState(false); const [exporting, setExporting] = useState(false); const [error, setError] = useState('');
  const [tab, setTab] = useState<'all' | 'site' | 'encounter' | 'npc' | 'treasure'>('all');
  const [provenance, setProvenance] = useState(false);
  const [monsters, setMonsters] = useState<{ key: string; name: string; level: number }[]>([]);
  useEffect(() => { fetch('/api/dossiers/monsters').then(r => { if (!r.ok) throw new Error('Monster catalogue unavailable'); return r.json(); }).then(setMonsters).catch(() => setError('Monster catalogue unavailable. Regional generation remains available.')); }, []);
  const generate = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/dossiers/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Generation failed');
      setReport(data); setTab('all');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Generation failed'); }
    finally { setBusy(false); }
  };
  const download = async (format: 'pdf' | 'html' | 'json') => {
    if (!report) return; setError(''); const filename = report.input.title.replace(/[^a-z0-9-]/gi, '-').replace(/-+/g, '-');
    if (format === 'html') { save(new Blob([renderDossierHtml(report)], { type: 'text/html;charset=utf-8' }), `${filename}.html`); return; }
    if (format === 'json') { save(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }), `${filename}.json`); return; }
    setExporting(true);
    try {
      const response = await fetch('/api/dossiers/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exportId: report.exportId }) });
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'PDF export failed'); }
      save(await response.blob(), `${filename}.pdf`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'PDF export failed'); }
    finally { setExporting(false); }
  };
  const fingerprint = (value: DossierInput) => JSON.stringify([value.title, value.zoneId, value.seed, value.minimumLevel,
    value.counts.sites, value.counts.encounters, value.counts.npcs, value.counts.treasures, value.required, value.allowProxies, value.maximumLevel, value.monsterKeys, value.namingStyle]);
  const stale = report && fingerprint(input) !== fingerprint(report.input);
  return <main className="dossier-app">
    <header className="dossier-header no-print"><a href="/"><ArrowLeft size={16} /> Back to ASH</a><span>ASH / FIELDWORK</span></header>
    <div className="dossier-shell">
      <aside className="dossier-controls no-print">
        <div className="dossier-eyebrow">Procedural adventure desk</div><h1>Roll a fieldbook.</h1><p>Story templates, combat blocks, people and treasure. Every result has a source.</p>
        <form onSubmit={generate}>
          <label>Title<input required maxLength={100} value={input.title} onChange={e => setInput({ ...input, title: e.target.value })} /></label>
          <label>Region<select value={input.zoneId} onChange={e => setInput({ ...input, zoneId: e.target.value as DossierInput['zoneId'] })}>{Object.values(ZONE_PROFILES).map(zone => <option key={zone.id} value={zone.id}>{zone.name} / {zone.sourceVolume.split(': ').at(-1)}</option>)}</select></label>
          <label>Site naming style<select value={input.namingStyle ?? ''} onChange={e => setInput({ ...input, namingStyle: e.target.value ? e.target.value as SiteNameStyle : undefined })}><option value="">Mix all six styles</option>{SITE_NAME_STYLES.map(style => <option key={style} value={style}>{namingStyles[style]}</option>)}</select></label>
          <label>Seed<div className="dossier-seed"><input required maxLength={100} value={input.seed} onChange={e => setInput({ ...input, seed: e.target.value })} /><button type="button" aria-label="New random seed" title="New random seed" onClick={() => setInput({ ...input, seed: crypto.randomUUID() })}><RefreshCw size={16} /></button></div></label>
          <label>Minimum encounter creature level<input type="number" min={1} max={20} required value={input.minimumLevel} onChange={e => setInput({ ...input, minimumLevel: Number(e.target.value) })} /></label>
          <label>Maximum encounter creature level (optional)<input type="number" min={input.minimumLevel} max={30} value={input.maximumLevel ?? ''} onChange={e => setInput({ ...input, maximumLevel: e.target.value ? Number(e.target.value) : undefined })} /></label>
          <p className="dossier-help">At least one creature per encounter must meet this level. NPCs and site guardians keep their own level bands.</p>
          <label>Stock monster pool (optional)<select multiple size={6} value={input.monsterKeys ?? []} onChange={e => setInput({ ...input, monsterKeys: Array.from(e.target.selectedOptions, option => option.value) })}>{monsters.filter(m => m.level >= input.minimumLevel && m.level <= (input.maximumLevel ?? Infinity) || input.monsterKeys?.includes(m.key)).map(m => <option key={m.key} value={m.key}>{m.name} / LV {m.level}</option>)}</select></label>
          {!!input.monsterKeys?.length && <button type="button" onClick={() => setInput({ ...input, monsterKeys: [] })}>Use regional wandering pool</button>}
          <p className="dossier-help">Select several with Ctrl/Cmd. Empty uses the regional wandering table. Selected stock creatures may come from other regions. Required types are added separately. Species repeat only after the pool is exhausted. For a level 1 packet, try LV 1–3; this is not a combat-balance guarantee.</p>
          <fieldset><legend>How many?</legend><div className="dossier-counts">{(Object.keys(labels) as (keyof typeof labels)[]).map(key => <label key={key}>{labels[key]}<input type="number" min={0} max={10} required value={input.counts[key]} onChange={e => setInput({ ...input, counts: { ...input.counts, [key]: Number(e.target.value) } })} /></label>)}</div></fieldset>
          <fieldset><legend>Required encounter types</legend>{DOSSIER_REQUIREMENTS.map(key => <label className="dossier-check" key={key}><input type="checkbox" checked={input.required.includes(key)} onChange={e => setInput({ ...input, required: e.target.checked ? [...input.required, key] : input.required.filter(value => value !== key) })} />{requirementNames[key]}</label>)}</fieldset>
          <label className="dossier-check"><input type="checkbox" checked={input.allowProxies} onChange={e => setInput({ ...input, allowProxies: e.target.checked })} />Allow named substitutes</label>
          <p className="dossier-help">Seawolf uses a Nord crew and sea serpent. Demon lord uses a Balor. Exact matches and substitutes are listed in the report.</p>
          <button className="dossier-generate" disabled={busy || exporting} type="submit"><Dices size={18} />{busy ? 'Rolling the tables…' : 'Generate fieldbook'}</button>
        </form>
      </aside>
      <section className="dossier-output">
        {error && <div className="dossier-error no-print" role="alert">{error}</div>}
        {!report ? <div className="dossier-empty"><div className="dossier-eyebrow">Ready for the table</div><h2>A region, a seed,<br />a set of possibilities.</h2><p>Start with the Hrafnfjord preset or choose another region. Generate to read the adventure, then download a self-contained HTML file or a printable PDF.</p><div className="dossier-sample"><span>01 / Sites</span><span>02 / Encounters</span><span>03 / NPCs</span><span>04 / Treasure</span></div></div> : <>
          <div className="dossier-toolbar no-print"><div><button onClick={() => download('html')}><Download size={15} /> HTML</button><button disabled={exporting || busy} onClick={() => download('pdf')}><Download size={15} />{exporting ? 'Preparing PDF…' : 'PDF'}</button><button onClick={() => { setTab('all'); setTimeout(() => window.print(), 50); }}><Printer size={15} /> Print</button></div><button className="dossier-audit" onClick={() => download('json')}>Raw audit data</button></div>
          {stale && <p className="dossier-stale no-print">Inputs changed. Generate again to update this report; downloads still use the displayed result.</p>}
          <header className="dossier-report-header"><div className="dossier-eyebrow">{report.zoneName} / {report.cards.length} records</div><h1>{report.input.title}</h1><p className="dossier-report-seed">Seed: {report.input.seed}<br />Encounter creature LV {report.input.minimumLevel}–{report.input.maximumLevel ?? 'unbounded'} / {report.input.monsterKeys?.length ? 'selected stock pool' : 'regional wandering pool'}</p></header>
          <div className="dossier-story">{report.story.map(field => <p key={field.label}>{field.value}</p>)}</div>
          <details className="dossier-coverage" open={report.coverage.some(row => row.status !== 'met')}><summary>Requirement coverage</summary>{report.coverage.length ? report.coverage.map(row => <p key={row.requirement}><span className={`dossier-badge ${row.status}`}>{row.status}</span><strong>{requirementNames[row.requirement as keyof typeof requirementNames] ?? row.requirement}</strong> · {row.detail}</p>) : <p>No required creature types.</p>}</details>
          <nav className="dossier-tabs no-print" aria-label="Report sections">{(['all', 'site', 'encounter', 'npc', 'treasure'] as const).map(category => <button key={category} className={tab === category ? 'active' : ''} onClick={() => setTab(category)}>{({ all: 'All', site: 'Sites', encounter: 'Encounters', npc: 'NPCs', treasure: 'Treasure' })[category]}</button>)}<label className="dossier-check"><input type="checkbox" checked={provenance} onChange={e => setProvenance(e.target.checked)} />Show sources</label></nav>
          <div className="dossier-records">{report.cards.filter(card => tab === 'all' || card.category === tab).map(card => <article key={card.id} className={`dossier-card ${card.category}`}>
            <div className="dossier-eyebrow">{card.id} / {card.category}</div><h2>{card.title}</h2>
            {card.fields.map((field, i) => <div key={i} className={`dossier-detail ${field.provenance === 'unresolved' ? 'unresolved' : ''} ${field.label.endsWith('Stats') ? 'stats' : ''}`}><h3>{field.label}</h3><p>{field.value}</p>{provenance && <small><span className="dossier-badge">{field.provenance}</span> {field.source}</small>}</div>)}
          </article>)}</div>
          <footer className="dossier-footnote">Stories and descriptions come from stored templates and explicit allocation rules. Tarot prompts do not automatically grant powers. Missing mechanics are marked unresolved. Raw audit data preserves the underlying records.</footer>
        </>}
      </section>
    </div>
  </main>;
}
