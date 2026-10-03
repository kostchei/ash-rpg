import fs from 'node:fs/promises';
import {Workbook} from '@oai/artifact-tool';
const dir=new URL('.',import.meta.url);
const mapped=process.argv.includes('--shadowdark');
const rows=JSON.parse(await fs.readFile(new URL(mapped?'shadowdark-mapped.json':'compiled.json',dir),'utf8'));
const cols=mapped?['shadowdark_group','shadowdark_category','game','base_name','category','item_type','mapping_basis','mapping_note','tier','qualifying_rarity','source_url','notes','shadowdark_source','shadowdark_page']:['game','category','item_type','base_name','tier','qualifying_rarity','source_url','notes'];
for(const row of rows){
  if(row.game==='Diablo II')row.qualifying_rarity='Normal / Magic';
  if(row.game==='Diablo III'){
    row.qualifying_rarity='Base type (white/grey/blue)';
    if(row.source_url.includes('/artisan/'))row.notes='Base name listed through a crafting recipe in Blizzard item guide; recipe bonuses excluded.';
  }
  if(row.game==='Diablo IV')row.base_name=row.base_name.replaceAll('\u2019',"'");
  if(row.game==='Diablo I'&&row.base_name==='Sabre'){
    row.source_url='https://diablo.fandom.com/wiki/Sabre_(Diablo_I)';
  }
}
const keys=rows.map(r=>[r.game,r.item_type,r.base_name.toLowerCase()].join('|'));
if(new Set(keys).size!==keys.length)throw Error('Duplicate items');
for(const r of rows){
  if(cols.some(c=>typeof r[c]!=='string')||!r.base_name||!r.source_url.startsWith('https://'))throw Error('Invalid row');
  if(/Mystery | of the | of Haste|\ufffd/.test(r.base_name))throw Error('Unexpected name '+r.base_name);
}
const wb=Workbook.create();
const sheet=wb.worksheets.add('Base items');
const end=mapped?'N':'H';
sheet.getRange(`A1:${end}${rows.length+1}`).values=[cols,...rows.map(r=>cols.map(c=>r[c]))];
wb.recalculate();
console.log((await wb.inspect({kind:'table',range:'A1:F6',tableMaxRows:6,tableMaxCols:6,maxChars:2000})).ndjson);
const values=sheet.getRange(`A1:${end}${rows.length+1}`).values;
const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
const csv='\ufeff'+values.map(row=>row.map(quote).join(',')).join('\r\n')+'\r\n';
await fs.writeFile(new URL(mapped?'diablo_shadowdark_categories.csv':'diablo_base_item_names.csv',dir),csv,'utf8');
console.log(JSON.stringify({rows:rows.length,games:rows.reduce((a,r)=>(a[r.game]=(a[r.game]||0)+1,a),{})}));
