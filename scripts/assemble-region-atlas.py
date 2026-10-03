"""Assemble the twelve procedural fieldbooks and their comparison; no prose generation."""
import json
from pathlib import Path
from xml.sax.saxutils import escape
from pypdf import PdfReader, PdfWriter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4

root = Path(__file__).resolve().parent.parent
folder = root / 'outputs/region-comparison'
results = json.loads((folder / 'results.json').read_text(encoding='utf-8'))
baseline = json.loads((folder / 'baseline.json').read_text(encoding='utf-8'))
styles = getSampleStyleSheet()
styles.add(ParagraphStyle('Packet', parent=styles['Heading2'], textColor=colors.HexColor('#254d38'), spaceBefore=18))
styles.add(ParagraphStyle('Detail', parent=styles['BodyText'], fontSize=9, leading=13, spaceAfter=8))
front = root / 'tmp/pdfs/regions/comparison.pdf'
document = SimpleDocTemplate(str(front), pagesize=A4, leftMargin=48, rightMargin=48, topMargin=48, bottomMargin=48)
flow = [Paragraph('ASH / REGIONAL COMPARISON', styles['Heading2']), Paragraph('Six regions, two levels', styles['Title']),
        Paragraph('Twelve fieldbooks; 240 records', styles['Heading2']),
        Paragraph('Five sites, five encounters, five NPCs and five treasures in each packet. Each region has a level 1 and level 10 packet with distinct seeds. Use the PDF bookmarks to open a packet.', styles['BodyText']), Spacer(1, 14),
        Paragraph('What the comparison found', styles['Packet']),
        Paragraph('The original generator failed on three level 10 regions because their native wandering tables lacked eligible creatures. An unbounded minimum of 1 admitted level 8 creatures to novice packets. The nine successful baseline packets had fifteen repeated species.', styles['BodyText']), Spacer(1, 10),
        Paragraph('The revised generator supports an upper level limit and an explicit existing-stock pool. It samples without replacement until exhausted and seeds repeated profiles independently. These twelve revised samples all succeed without repeated encounter species. The seeds stay fixed across the before/after review; the pool and range changes are intentional.', styles['BodyText']), Spacer(1, 10),
        Paragraph('Level 1 packets use creature LV 1-3. Level 10 packets use LV 10-16, including an explicitly selected LV 16 Balor substitute. These ranges do not establish balanced combats. Site guardians keep their act bands; NPCs retain LV 1-3. The Nord in the Seawolf substitute is LV 2; its Sea Serpent is LV 12.', styles['BodyText']), Spacer(1, 10),
        Paragraph('Regional site details and family activities use version 2 authored source tables, selected procedurally. A Nord without a serpent no longer receives the serpent activity text. Custom stock choices may extend beyond native regional tables; no regional canon is silently enlarged.', styles['BodyText']), Spacer(1, 10),
        Paragraph('Remaining gaps: full room keys and clue chains, magic-item attributes, symbolic weakness effects and malformed source stats. They stay marked unresolved. This is a twelve-sample review, not a statistical balance study. Full audit records and seeds accompany the HTML fieldbooks.', styles['BodyText']), PageBreak()]
for index, result in enumerate(results):
    if index and index % 4 == 0:
        flow.append(PageBreak())
    old = next(b for b in baseline if b['id'] == result['id'] and b['level'] == result['level'])
    before = 'failed: no eligible regional monsters' if 'error' in old else f"{old['repeatedMonsters']} repeats; qualifying creature LV {min(m['level'] for m in old['monsters'])}-{max(m['level'] for m in old['monsters'])}"
    flow.extend([Paragraph(escape(f"{result['region']} / Level {result['level']}"), styles['Packet']),
                 Paragraph('Seed: ' + escape(result['seed']), styles['Detail']),
                 Paragraph(escape('; '.join(f"{m['name']} (LV {m['level']})" for m in result['monsters'])), styles['Detail']),
                 Paragraph(escape(f"Before: {before}. After: {result['repeatedMonsters']} repeats; {result['unresolved']} unresolved fields; treasure {result['treasureGp']:.2f} gp."), styles['Detail'])])
def footer(canvas, doc):
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(colors.HexColor('#65715f'))
    canvas.drawString(48, 26, f'ASH / Comparison / {doc.page}')
document.build(flow, onFirstPage=footer, onLaterPages=footer)
writer = PdfWriter()
writer.append(str(front), outline_item='Comparison and reading guide')
for result in results:
    writer.append(str(root / f"tmp/pdfs/regions/{result['id']}-lv{result['level']}.pdf"), outline_item=f"{result['region']} / Level {result['level']}")
writer.add_metadata({'/Title': 'ASH - Six regions, two levels', '/Author': 'ASH procedural generators'})
destination = root / 'output/pdf/region-comparison-atlas.pdf'
destination.parent.mkdir(parents=True, exist_ok=True)
with destination.open('wb') as output:
    writer.write(output)
print(f'Created {destination}: {len(PdfReader(destination).pages)} pages')
