from research import *
from urllib.parse import urljoin
from collections import Counter
rows=[]
def add(game,category,typ,name,tier,rarity,url,notes=''):
    rows.append(dict(game=game,category=category,item_type=typ,base_name=name,tier=tier,qualifying_rarity=rarity,source_url=url,notes=notes))

# Diablo I: ordinary bases, transcribed from Jarulf's base-item table.
u='https://www.lurkerlounge.com/diablo/jarulf/jarulf162.pdf'
groups={
('Armour','Body armour'):'Rags|Cape|Cloak|Robe|Quilted Armor|Leather Armor|Hard Leather Armor|Studded Leather Armor|Ring Mail|Chain Mail|Scale Mail|Breast Plate|Splint Mail|Plate Mail|Field Plate|Gothic Plate|Full Plate Mail',
('Helms','Helm'):'Cap|Skull Cap|Helm|Full Helm|Crown|Great Helm',
('Armour','Shield'):'Buckler|Small Shield|Large Shield|Kite Shield|Tower Shield|Gothic Shield',
('Weapons','Sword'):'Dagger|Short Sword|Falchion|Scimitar|Claymore|Blade|Sabre|Long Sword|Broad Sword|Bastard Sword|Two-Handed Sword|Great Sword',
('Weapons','Axe'):'Small Axe|Axe|Large Axe|Broad Axe|Battle Axe|Great Axe',
('Weapons','Mace'):'Club|Spiked Club|Mace|Morning Star|War Hammer|Flail|Maul',
('Weapons','Bow'):"Short Bow|Hunter's Bow|Long Bow|Composite Bow|Short Battle Bow|Long Battle Bow|Short War Bow|Long War Bow",
('Weapons','Staff'):'Short Staff|Long Staff|Composite Staff|Quarter Staff|War Staff'}
for (cat,typ),names in groups.items():
    for n in names.split('|'):add('Diablo I',cat,typ,n,'Base','Normal / Magic',u)

def d2_job(job):
    tier,slug,cat,typ=job; u=f'https://classic.battle.net/diablo2exp/items/{tier}/{slug}.shtml'
    h=page(u); names=[]
    for cell in re.findall(r'<td\b[^>]*>(.*?)</td>',h,re.S|re.I):
        if '/images/items/' not in cell:continue
        b=re.findall(r'<b>(.*?)</b>',cell,re.S|re.I)
        if b:
            n=clean(b[-1])
            n=re.sub(r'\s*\*+$','',n).strip()
            if n and len(n)<60:names.append(n)
    return [(tier,slug,cat,typ,n,u) for n in names]
types={x:('Weapons',label) for x,label in [('axes','Axe'),('bows','Bow'),('crossbows','Crossbow'),('daggers','Dagger'),('javelins','Javelin'),('maces','Mace'),('polearms','Polearm'),('scepters','Scepter'),('spears','Spear'),('staves','Staff'),('swords','Sword'),('throw','Throwing weapon'),('wands','Wand'),('amazonweapons','Amazon weapon'),('katars','Assassin claw'),('orbs','Sorceress orb')]}
types.update({'armor':('Armour','Body armour'),'shields':('Armour','Shield'),'boots':('Armour','Boots'),'helms':('Helms','Helm'),'barbhelms':('Helms','Barbarian helm'),'druidpelts':('Helms','Druid pelt'),'paladinshields':('Armour','Paladin shield'),'shrunkenheads':('Armour','Necromancer shrunken head'),'gloves':('Gloves','Gloves'),'belts':('Belts','Belt')})
jobs=[(tier,slug,*v) for tier in ['normal','exceptional','elite'] for slug,v in types.items()]
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    for job,result in zip(jobs,pool.map(d2_job,jobs)):
        print('D2',job[:2],len(result),flush=True)
        for tier,slug,cat,typ,n,u in result:add('Diablo II',cat,typ,n,tier.title(),'Normal / Socketed / Magic',u)
u='https://classic.battle.net/diablo2exp/items/circlets.shtml'; h=page(u)
for name in ['Circlet','Coronet','Tiara','Diadem']:
    assert name in h
    add('Diablo II','Helms','Circlet',name,{'Circlet':'Normal','Coronet':'Normal','Tiara':'Exceptional','Diadem':'Elite'}[name],'Normal / Socketed / Magic',u)

base='https://eu.diablo3.blizzard.com'
h=page(base+'/en-gb/item/')
slugs=list(dict.fromkeys(re.findall(r'href="/en-gb/item/([^"/]+)/"',h)))
exclude={'amulet','ring','enchantress-focus','scoundrel-token','templar-relic','potion','crafting-material','blacksmith-plan','jeweler-design','training-page','page-of-training','dye','gem','misc'}
def d3_job(slug):
    u=base+'/en-gb/item/'+slug+'/'
    h=page(u); found=[]
    for cl,tr in re.findall(r'<tr\b[^>]*class="([^"]+)"[^>]*>(.*?)</tr>',h,re.S|re.I):
        if not re.search(r'\b(common|magic|inferior|crafted)\b',cl) or re.search(r'\b(legendary|set)\b',cl):continue
        m=re.search(r'<h3\b[^>]*>\s*<a href="([^"]+)"[^>]*>(.*?)</a>',tr,re.S)
        if not m:continue
        path,n=m.group(1),clean(m.group(2))
        if any(x in path.lower() for x in ['transmog','unique','set_','retro','-ph_']) or n.startswith('Mystery '):continue
        t=re.search(r'<ul class="item-type">(.*?)</ul>',tr,re.S)
        typ=clean(t.group(1)) if t else slug
        typ=re.sub(r'^(Magic|Rare|Common) ','',typ)
        found.append((n,typ,urljoin(base,path)))
    return found
slugs=[s for s in slugs if s not in exclude]
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    for slug,result in zip(slugs,pool.map(d3_job,slugs)):
        print('D3',slug,len(result),flush=True)
        cat='Helms' if slug in ['helm','spirit-stone','voodoo-mask','wizard-hat'] else 'Gloves' if slug=='gloves' else 'Belts' if slug in ['belt','mighty-belt'] else 'Armour' if slug in ['pauldrons','chest-armor','cloak','bracers','pants','boots','shield','crusader-shield'] else 'Weapons'
        for n,typ,u in result:add('Diablo III',cat,typ,n,'Base','Normal / Magic',u)

d=json.loads((ROOT/'d4-source.json').read_text(encoding='utf-8'))
u='https://docs.google.com/spreadsheets/d/1IC6VCLGzocHjHTGQHj3yPSY0KOVBY97jFOFQWvMSARs/edit'
for key in ['Armor-Items','Weapon-Items']:
    for r in d[key][1:]:
        qual=r.get('T','')
        if not re.search(r'\b(Common|Magic)\b',qual):continue
        if r.get('I') not in ['World Drop','Starting Item','Multiple Item Quality WD']:continue
        if re.search(r'does not drop|do not drop|unobtainable|removed',r.get('W',''),re.I):continue
        n=re.sub(r'\s*\(\d+\)$','',r.get('B','')).strip().replace('\ufffd',"'")
        n=n.replace('Quaterstaff','Quarterstaff').replace('Blanced Quarterstaff','Balanced Quarterstaff')
        n={'LongSword':'Longsword','ShortSword':'Short Sword','BroadSword':'Broad Sword'}.get(n,n)
        typ=r.get('G','')
        cat='Weapons' if key=='Weapon-Items' else 'Helms' if typ=='Helm' else 'Gloves' if typ=='Gloves' else 'Armour'
        if typ=='Shield':cat='Armour'
        rarity=' / '.join(x for x in ['Common','Magic'] if x in qual)
        note='Source catalogue updated 2026-07-27; '+{'Base':'base game','VOH':'Vessel of Hatred','LOH':'Lord of Hatred'}.get(r.get('R'),r.get('R',''))
        add('Diablo IV',cat,typ,n,'Base',rarity,u,note)

# Merge records sharing a game, type and base name; preserve distinct games.
unique={}
for r in rows:
    k=(r['game'],r['category'],r['item_type'],r['base_name'])
    if k not in unique:unique[k]=r
    else:
        prev=unique[k]
        parts=set(prev['qualifying_rarity'].split(' / ')+r['qualifying_rarity'].split(' / '))
        prev['qualifying_rarity']=' / '.join(sorted(parts))
rows=sorted(unique.values(),key=lambda r:(r['game'],r['category'],r['item_type'],r['base_name'].casefold()))
(ROOT/'compiled.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
print('TOTAL',len(rows),'BY GAME',dict(Counter(r['game'] for r in rows)))
print('D4',[(r['item_type'],r['base_name']) for r in rows if r['game']=='Diablo IV'])
