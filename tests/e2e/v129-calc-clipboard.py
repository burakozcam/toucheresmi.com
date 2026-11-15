import uno,json
from pathlib import Path
from com.sun.star.beans import PropertyValue
local=uno.getComponentContext();resolver=local.ServiceManager.createInstanceWithContext('com.sun.star.bridge.UnoUrlResolver',local);ctx=resolver.resolve('uno:socket,host=127.0.0.1,port=20129;urp;StarOffice.ComponentContext');desktop=ctx.ServiceManager.createInstanceWithContext('com.sun.star.frame.Desktop',ctx)
hidden=PropertyValue();hidden.Name='Hidden';hidden.Value=True
doc=desktop.loadComponentFromURL('private:factory/scalc','_blank',0,(hidden,));sheet=doc.Sheets.getByIndex(0);result={}
for label,h,w in [('five',5,5),('column',90,1),('wide',90,8),('quoted',2,4)]:
 cells=tuple(tuple(('Türkçe İğdır' if c==0 else '1,25' if c==1 else '' if c==2 else f'Kazanım {r+1}:{c+1}') for c in range(w)) for r in range(h))
 if label=='quoted':cells=(('Türkçe','İki satır\nve "alıntı"','1,25',''),('Fen','Sekme\tiçerir','2.50',''))
 area=sheet.getCellRangeByPosition(0,0,w-1,h-1);area.setDataArray(cells);doc.CurrentController.select(area);transfer=doc.CurrentController.getTransferable();flavors=transfer.getTransferDataFlavors();plain=next(f for f in flavors if f.MimeType.startswith('text/plain'));text=transfer.getTransferData(plain)
 if not isinstance(text,str):text=bytes(text.value).decode('utf-16')
 html_flavor=next((f for f in flavors if f.MimeType.startswith('text/html')),None)
 html=transfer.getTransferData(html_flavor) if html_flavor else ''
 if not isinstance(html,str):html=bytes(html.value).decode('utf-8').rstrip('\x00')
 result[label]={'html':html,'rows':h,'columns':w,'cells':cells,'mime':plain.MimeType,'text':text}
Path('/tmp/v129-evidence/calc-clipboard.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));doc.close(True);print('Real LibreOffice Calc clipboard captured:', [(k,v['rows'],v['columns'],v['mime']) for k,v in result.items()])
