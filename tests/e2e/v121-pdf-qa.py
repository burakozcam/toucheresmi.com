"""Read-only checks on synthetic v121 PDF artifacts. Requires Poppler only."""
import json, subprocess, tempfile, xml.etree.ElementTree as ET
from pathlib import Path
ns={'h':'http://www.w3.org/1999/xhtml'}
evidence=[]
for file,expected in [('v121-1-sayfa.pdf',1),('v121-2-sayfa.pdf',2),('v121-kazanimli.pdf',None),('v121-okul-listesi.pdf',1),('/tmp/ks-v120-stress-list.pdf',None),('/tmp/ks-v120-stress-card.pdf',None)]:
    source=Path('output/pdf')/file
    with tempfile.TemporaryDirectory(prefix='v121-pdf-qa-') as d:
        target=Path(d)/'bbox.html'
        subprocess.run(['pdftotext','-bbox-layout',str(source),str(target)],check=True,capture_output=True)
        pages=ET.parse(target).getroot().findall('.//h:page',ns)
        if expected: assert len(pages)==expected,(file,len(pages))
        else: assert len(pages)>2
        texts=[]
        for page in pages:
            words=page.findall('.//h:word',ns)
            assert len(words)>15,(file,'empty page')
            width=float(page.attrib['width']);height=float(page.attrib['height'])
            for w in words:
                assert float(w.attrib['xMin'])>=22 and float(w.attrib['xMax'])<=width-21,(file,'horizontal overflow',w.text)
                assert float(w.attrib['yMin'])>=20 and float(w.attrib['yMax'])<=height-21,(file,'vertical overflow',w.text)
            texts.append(' '.join(w.text or '' for w in words))
        text=' '.join(texts)
        assert 'null' not in text and 'NaN' not in text
        if 'stress-list' in file:
            assert all(f'Q{i}' in text.split() for i in range(1,151)), 'Missing student row'
            for page_text in texts:
                if any(f'Q{i}' in page_text for i in range(1,151)): assert 'Puan' in page_text and 'soyad' in page_text, 'Missing repeated table header'
        if 'kazanimli' in file:
            assert all(f'TAM-{i}' in text for i in range(18)), 'Missing outcome text'
        evidence.append({'file':str(source),'pages':len(pages),'withinMargins':True,'allPagesContainText':True})
print(json.dumps({'pdfQA':evidence},ensure_ascii=False,indent=2))
