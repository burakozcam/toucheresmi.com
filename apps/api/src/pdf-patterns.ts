/** Vector hatch marks are embedded in the PDF, including grayscale printer output. */
export function patternedBar(doc:any,x:number,y:number,w:number,h:number,color:string,pattern=0){
 if(w<=0||h<=0)return;
 doc.save().rect(x,y,w,h).fill(color);
 doc.save().rect(x,y,w,h).clip().lineWidth(.45).strokeColor("#263849").fillColor("#263849");
 if(pattern%3===1){for(let px=x+2;px<x+w;px+=4)for(let py=y+2;py<y+h;py+=4)doc.circle(px,py,.5).fill();}
 else if(pattern%3===2){for(let py=y+3;py<y+h;py+=4)doc.moveTo(x,py).lineTo(x+w,py).stroke();}
 else{for(let d=-h;d<w;d+=5)doc.moveTo(x+d,y+h).lineTo(x+d+h,y).stroke();}
 doc.restore().rect(x,y,w,h).lineWidth(.6).strokeColor("#263849").stroke().restore();
}
