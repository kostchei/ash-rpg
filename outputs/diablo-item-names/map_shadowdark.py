import json,re,csv,pathlib,collections
ROOT=pathlib.Path(__file__).parent
SOURCE='D:/Code/Core_Dark/tmp/extracted_text/Player_s_Guide_to_the_Western_Reaches_V1.json'
book=json.loads(pathlib.Path(SOURCE).read_text(encoding='utf-8'))
weapons=[]
for p in book['pages']:
    if p.get('page_num') in [110,111]:
        lines=p['text'].splitlines()
        for i,s in enumerate(lines):
            if (re.fullmatch(r'\d+ [gsc]p',s) or s=='-') and i+1<len(lines) and lines[i+1] in ['M','R','M/R']:
                weapons.append(lines[i-1])
assert len(weapons)==32, weapons
def names(s):return set(s.lower().split('|'))
TWO_SWORDS=names('Two-Handed Sword|Claymore|Giant Sword|Bastard Sword|Flamberge|Great Sword|Espandon|Dacian Falx|Tusk Sword|Gothic Sword|Zweihander|Executioner Sword|Legend Sword|Highland Blade|Balrog Blade|Champion Sword|Colossus Sword|Colossus Blade')
BIG_AXES=names('Large Axe|Broad Axe|Battle Axe|Great Axe|Giant Axe|Military Axe|Bearded Axe|Tabar|Gothic Axe|Ancient Axe|Feral Axe|Silver-Edged Axe|Decapitator|Champion Axe|Glorious Axe')
BIG_MACES=names('Maul|Great Maul|War Club|Martel de Fer|Ogre Maul|Thunder Maul')
CURVED=names('Sabre|Scimitar|Shamshir|Tulwar|Cutlass|Ataghan|Dao|Saif|Pirate Sword')
SHORT=names('Short Sword|Gladius|Blade|Boot Blade')
SHORTBOW=names("Short Bow|Hunter's Bow|Hunting Bow|Short Battle Bow|Short War Bow|Edge Bow|Razor Bow|Double Bow|Short Siege Bow|Rune Bow|Spider Bow|Blade Bow|Great Bow|Diamond Bow|Ward Bow|Hankyu|Common Bow|Simple Bow|Makeshift Bow|Uncommon Bow|Ashwood Bow|Matriarchal Bow")
LEATHER=names('Quilted Armor|Leather Armor|Hard Leather Armor|Studded Leather Armor|Studded Leather|Ghost Armor|Serpentskin Armor|Demonhide Armor|Trellised Armor|Dusk Shroud|Wyrmhide|Scarab Husk|Wire Fleece|Hide Tunic|Leather Doublet|Etched Jacket|Stygian Harness|Hide Pants|Hide Breeches|Rough Hide Leggings|Leather Pants|Etched Pants|Leather Cuffs|Armbands|Armguards|Bracers|Wristbands|Wristguards|Stabilizers|Warbands|Leather Mantle|Etched Mantle|Shoulder Guards|Ailettes|Epaulets|Espaliers|Sode|Drifter\'s Tunic|Initiate\'s Tunic|Strider\'s Tunic|Drifter\'s Pants|Strider\'s Leggings')
CHAIN=names('Ring Mail|Chain Mail|Scale Mail|Splint Mail|Linked Mail|Tigulated Mail|Mesh Armor|Russet Armor|Tigulated Mail|Diamond Mail|Loricated Mail|Boneweave|Balrog Skin|Jazeraint Mail|Astral Mail|Sovereign Mail|Boneweave Hauberk|Brigandine Coat|Chain Leggings|Chausses|Boneweave Faulds|Mail Bands')
NONE=names('Rags|Robe|Cloth Tunic|Tunic|Cloth Pants|Pants|Legwraps|Bindings|Armwraps|Wristwraps|Amice|Pallium|Bracelets')
HELM_LEATHER=names('Cap|Skull Cap|War Hat|Shako|Leather Hood|Arming Cap|Mask|Death Mask|Demonhead|Bone Helm|Bone Visage|Grim Helm|Drifter\'s Helm|Hellscape Mask')
HELM_NONE=names('Crown|Grand Crown|Corona|Circlet|Coronet|Diadem|Tiara|Strider\'s Crown')
ROUND=names('Buckler|Small Shield|Round Shield|Rondache|Akaran Rondache|Sacred Rondache|Targe|Akaran Targe|Sacred Targe|Targe Shield|Luna|Aspis|Hoplon|Rondache|Pelta')

def implement(r):
    n=r['base_name'].lower(); t=r['item_type']
    if t=='Wand':
        cat='Wand'; why='Wand-family implement.'
    elif t=='Quiver':
        cat='Quiver'; why='Ordinary ammunition container.'
    elif any(word in n for word in ['codex','folio','spellbook']):
        cat='Spellbook'; why='Book-form magical implement.'
    elif t in ['Necromancer shrunken head','Mojo','Phylactery','Totem'] or any(word in n for word in ['skull','talisman','demi lich']):
        cat='Holy symbol'; why='Ritual token, fetish, relic or trophy; holy symbol is a functional category and may represent a dark faith.'
    else:
        cat='Arcane focus'; why='Orb, crystal or other arcane implement; ambiguous forms default to Arcane focus.'
    return 'Equipment',cat,'Equipment reskin',why+' No spells, charges, bonuses or class permissions are granted by this classification.'

def armour(r):
    n=r['base_name'].lower(); t=r['item_type']
    if t in ['Shield','Paladin shield','Crusader Shield']:
        return ('Shield','Round shield' if n in ROUND else 'Shield','Equivalent family','Shield follows its separate shield profile, not a body-armour tier.')
    if t=='Necromancer shrunken head':return implement(r)
    component=r['category']=='Helms' or t in ['Bracers','Pants','Shoulders']
    group='Armour component' if component else 'Armour'
    status='Approximate'
    note='Rough material/coverage tier. A component alone does not grant a full suit\'s AC.' if component else 'Rough protection tier; Diablo power tier does not raise the Shadowdark armour category.'
    if r['category']=='Helms':
        if t in ['Circlet','Spirit Stone','Wizard Hat'] or n in HELM_NONE:cat='none'
        elif t in ['Druid pelt','Voodoo Mask'] or n in HELM_LEATHER:cat='leather'
        elif n in ['chain hood','coif']:cat='chain'
        else:cat='plate'
    elif n in NONE:cat='none'
    elif n in LEATHER:cat='leather'
    elif n in CHAIN:cat='chain'
    else:cat='plate'
    return group,cat,status,note

def weapon(r):
    n=r['base_name'].lower(); t=r['item_type']; g=r['game']
    def out(cat,note='',status='Equivalent family'):
        return 'Weapon',cat,status,note or 'Uses the nearest weapon family from the guide; Diablo bonuses and damage are ignored.'
    if t in ['Wand','Sorceress orb','Mojo','Source','Phylactery','Quiver','Focus','Totem']:
        return implement(r)
    if t=='Amazon weapon':
        if 'javelin' in n:return out('Javelin')
        if 'pike' in n:return out('Pike')
        if 'spear' in n:return out('Spear')
        return out('Shortbow' if n in SHORTBOW else 'Longbow')
    if t in ['Dagger','Ceremonial Knife']:return out('Dagger')
    if t=='Throwing weapon':return out('Handaxe' if any(w in n for w in ['axe','francisca','hurlbat']) else 'Dagger','Thrown axes use Handaxe; thrown blades/darts use Dagger.','Approximate')
    if t=='Assassin claw':return out('Dagger','Wrist blades and claws use Dagger as a rough reskin; attachment and dual-wield properties are not imported.','Approximate')
    if t=='Fist Weapon':return out('Strikes','Knuckles and fist weapons use Strikes as a rough reskin; no extra damage or properties implied.','Approximate')
    if t in ['Crossbow','Hand Crossbow']:return out('Crossbow','Hand/repeating/heavy crossbows collapse to the ordinary Crossbow profile; loading and hands follow that profile.','Approximate' if t=='Hand Crossbow' else 'Equivalent family')
    if t=='Bow':return out('Shortbow' if n in SHORTBOW or n.startswith('short ') else 'Longbow','Short/compact bows map to Shortbow; other bows map to Longbow. Ambiguous fantasy names use the default.','Approximate')
    if t=='Javelin':return out('Javelin')
    if t=='Spear':
        if n=='lance':return out('Lance','Lance retains the guide\'s mounted-only and charge restrictions.')
        if 'pike' in n:return out('Pike')
        if n in ['javelin','pilum','harpoon']:return out('Javelin')
        return out('Spear')
    if t in ['Staff','Daibo','Quarterstaff']:
        cat='Stave' if t in ['Daibo','Quarterstaff'] or n in ['quarter staff','quarterstaff','war staff','battle staff','iron staff','shillelagh','rugged stave'] else 'Staff'
        return out(cat,'Martial/heavy quarterstaves use Stave; ordinary or spellcaster staves use Staff.','Approximate')
    if t in ['Two-Handed Scythe','2H Scythe','Glaive','Polearm']:
        if n in ['lance','dread lance']:return out('Lance','Mounted lance approximation; using this profile imposes its mounted-only restriction.','Approximate')
        return out('Pike','Reach/pole weapon approximation. Scythes, halberds and glaives are absent from the guide; use Pike as a reskin.','Approximate')
    if t=='Scythe':return out('Scimitar','One-handed sickle/scythe approximation using a curved blade profile.','Approximate')
    if t in ['Two-Handed Sword','2H Sword']:return out('Greatsword')
    if t=='Sword':
        if n=='dagger':return out('Dagger')
        if n=='bastard sword':return out('Bastard sword')
        if n=='falchion':return out('Falchion','Named match; the guide\'s Falchion is two-handed, even where the Diablo version is not.','Approximate')
        if g in ['Diablo I','Diablo II'] and n in TWO_SWORDS:return out('Greatsword')
        if n in CURVED:return out('Scimitar')
        if n in SHORT:return out('Shortsword')
        return out('Longsword')
    if t in ['Two-Handed Axe','2H Axe']:return out('Greataxe')
    if t=='Axe':
        big=(g=='Diablo I' and n!='small axe') or (g=='Diablo II' and n in BIG_AXES)
        return out('Greataxe' if big else 'Handaxe','Axe size/handedness sets the rough family; Diablo-only properties are not retained.','Approximate')
    if t in ['Two-Handed Mace','2H Mace']:return out('Warhammer','Heavy two-handed blunt weapons collapse to Warhammer.','Approximate')
    if t in ['Flail','Two-Handed Flail'] or (t=='Mace' and n in ['flail','knout','scourge']):
        return out('Morningstar','Flails use Morningstar as the nearest weighted-head weapon; this does not grant Razor chain reach.','Approximate')
    if t=='Scepter':return out('Mace','Scepters use Mace for physical attacks; magical functions remain separate.','Approximate')
    if t=='Mace':
        if n in BIG_MACES and g in ['Diablo I','Diablo II']:return out('Warhammer','Large two-handed blunt weapon approximation.','Approximate')
        if n in ['morning star','jagged star','devil star']:return out('Morningstar')
        if n in ['club','spiked club','barbed club','cudgel','truncheon','tyrant club','bludgeon']:return out('Club')
        return out('Mace','One-handed hammers use Mace to avoid importing the two-handed Warhammer profile.','Approximate')
    if t=='Mighty Weapon':
        if 'axe' in n or 'cleaver' in n:return out('Handaxe','One-handed fantasy axe approximation.','Approximate')
        if 'sickle' in n or 'scythe' in n:return out('Scimitar','One-handed curved blade approximation.','Approximate')
        return out('Longsword','One-handed mighty blade approximation; no class-specific power retained.','Approximate')
    if t=='Two-Handed Mighty Weapon':
        cat='Warhammer' if any(w in n for w in ['hammer','club','trunk','smash','crusher','battersmash']) else 'Greatsword' if 'sword' in n else 'Greataxe'
        return out(cat,'Two-handed mighty weapon reskin based on its name; ambiguous forms default to Greataxe.','Approximate')
    raise ValueError((g,t,n))

rows=json.loads((ROOT/'compiled.json').read_text(encoding='utf-8'))
old=list(csv.DictReader((ROOT/'diablo_base_item_names.csv').open(encoding='utf-8-sig')))
corrections=sorted(set((r['game'],r['base_name']) for r in old)-set((r['game'],r['base_name'].replace('\u2019',"'")) for r in rows))
out=[]; excluded=[]
for r in rows:
    r['base_name']=r['base_name'].replace('\u2019',"'")
    if r['category'] in ['Gloves','Belts'] or r['item_type'] in ['Boots','Cloak'] or (r['game']=='Diablo I' and r['base_name'] in ['Cape','Cloak']):
        excluded.append(r);continue
    assert not r['base_name'].startswith(('Normal ','Exceptional ','Elite ')),r
    result=weapon(r) if r['category']=='Weapons' else armour(r)
    r.update(dict(zip(['shadowdark_group','shadowdark_category','mapping_basis','mapping_note'],result)))
    r['shadowdark_source']='User-approved equipment grouping' if result[0]=='Equipment' else SOURCE
    r['shadowdark_page']='110-111' if result[0]=='Weapon' else '112' if result[0] in ['Armour','Armour component','Shield'] else ''
    assert result[1] in weapons if result[0]=='Weapon' else True
    assert result[1] in ['none','leather','chain','plate'] if result[0] in ['Armour','Armour component'] else True
    out.append(r)
out.sort(key=lambda r:(r['shadowdark_group'],r['shadowdark_category'],r['game'],r['item_type'],r['base_name'].lower()))
(ROOT/'shadowdark-mapped.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
summary={'input_rows':len(rows),'mapped_rows':len(out),'excluded_rows':len(excluded),'by_group':dict(collections.Counter(r['shadowdark_group'] for r in out)),'by_category':dict(collections.Counter(r['shadowdark_category'] for r in out)),'source_heading_corrections':corrections,'weapon_categories_without_diablo_match':sorted(set(weapons)-set(r['shadowdark_category'] for r in out))}
(ROOT/'shadowdark-summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
print(json.dumps(summary,indent=2))
