import urllib.request, re, html, json, pathlib, concurrent.futures, zipfile, io, xml.etree.ElementTree as ET
ROOT=pathlib.Path(__file__).parent
CACHE=ROOT/'cache'; CACHE.mkdir(parents=True,exist_ok=True)
def fetch(url):
    import hashlib
    p=CACHE/(hashlib.sha256(url.encode()).hexdigest()+'.bin')
    if not p.exists():
        req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
        for attempt in range(3):
            try:
                p.write_bytes(urllib.request.urlopen(req,timeout=25).read()); break
            except Exception:
                if attempt==2: raise
    return p.read_bytes()
def page(url):
    b=fetch(url)
    try:return b.decode('utf-8')
    except:return b.decode('cp1252')
def clean(s):return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',s))).strip()
if __name__=='__main__':
    u='https://classic.battle.net/diablo2exp/items/normal/armor.shtml'
    h=page(u); i=h.find('Quilted'); print(h[i-600:i+1400])
    u='https://docs.google.com/spreadsheets/d/1IC6VCLGzocHjHTGQHj3yPSY0KOVBY97jFOFQWvMSARs/export?format=xlsx'
    z=zipfile.ZipFile(io.BytesIO(fetch(u)))
    ns={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    strings=[''.join(n.itertext()) for n in ET.fromstring(z.read('xl/sharedStrings.xml'))]
    wb=ET.fromstring(z.read('xl/workbook.xml'))
    rels={r.attrib['Id']:r.attrib['Target'] for r in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
    out={}
    for sh in wb.find('s:sheets',ns):
        target=rels[sh.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
        target=target.lstrip('/') if target.startswith('/') else 'xl/'+target
        rows=[]
        for row in ET.fromstring(z.read(target)).findall('.//s:sheetData/s:row',ns):
            vals={}
            for c in row:
                v=c.find('s:v',ns)
                if v is not None: vals[re.sub(r'\d','',c.attrib['r'])]=strings[int(v.text)] if c.attrib.get('t')=='s' else v.text
            rows.append(vals)
        out[sh.attrib['name']]=rows
    (ROOT/'d4-source.json').write_text(json.dumps(out,ensure_ascii=False),encoding='utf-8')
    print('SHEETS',list(out))
    for k,v in out.items():
        if 'Items' in k: print(k,json.dumps(v[:4],ensure_ascii=True))
