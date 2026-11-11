"""Read-only PDF QA with Poppler and Python's standard library; no student data."""
import json, subprocess, tempfile, xml.etree.ElementTree as ET
from pathlib import Path
files=[Path('output/pdf/v120-ogrenci-ozet.pdf'),Path('output/pdf/v120-ogrenci-ayrintili.pdf'),Path('output/pdf/v120-okul-sonuc-listesi.pdf'),Path('/tmp/ks-v120-stress-list.pdf'),Path('/tmp/ks-v120-stress-card.pdf')]
ns={'h':'http://www.w3.org/1999/xhtml'}
evidence=[]
for file in files:
    with tempfile.TemporaryDirectory(prefix='ks-v120-qa-') as directory:
        xml=Path(directory)/'bbox.html'
        subprocess.run(['pdftotext','-bbox-layout',str(file),str(xml)],check=True,capture_output=True)
        root=ET.parse(xml).getroot();pages=root.findall('.//h:page',ns)
        assert pages, str(file)
        texts=[]
        for page in pages:
            words=page.findall('.//h:word',ns);assert len(words)>15, f'Empty page: {file}'
            width=float(page.attrib['width']);height=float(page.attrib['height'])
            for word in words:
                assert float(word.attrib['xMin'])>=22 and float(word.attrib['xMax'])<=width-21, f'Horizontal overflow: {file}'
                assert float(word.attrib['yMin'])>=20 and float(word.attrib['yMax'])<=height-21, f'Vertical overflow: {file}'
            text=' '.join(word.text or '' for word in words);texts.append(text)
            if 'stress-list' in file.name and any((w.text or '').startswith('Q') and (w.text or '')[1:].isdigit() for w in words):
                assert 'soyad' in text and 'Puan' in text, 'Missing repeated table headers'
        all_text=' '.join(texts)
        if 'stress-list' in file.name:
            present={w.text for page in pages for w in page.findall('.//h:word',ns)}
            assert all(f'Q{i}' in present for i in range(1,151)), 'Student rows missing'
        if file.name=='v120-ogrenci-ozet.pdf':
            assert len(pages)==1
            assert '363,64' in all_text and 'ÇAĞRI' in all_text and 'TOPLAM' in all_text
            assert 'ÖRNEK TEST 102' not in all_text
        evidence.append({'file':str(file),'pages':len(pages),'allPagesContainText':True,'withinMargins':True})
print(json.dumps({'pdfQA':evidence,'all150StudentRowsPresent':True,'repeatedHeadersVerified':True},ensure_ascii=False))
