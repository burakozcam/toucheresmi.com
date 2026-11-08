/** Legacy optical readers expect Turkish Windows text; newer uploads retain exact source bytes. */
export function fmtBytes(originalFmt: string, originalBase64?: string|null): Buffer {
  if(originalBase64)return Buffer.from(originalBase64,"base64");
  const decoder=new TextDecoder("windows-1254"), mapping=new Map<string,number>();
  for(let b=0;b<256;b++)mapping.set(decoder.decode(Uint8Array.of(b)),b);
  const bytes:number[]=[];
  for(const c of originalFmt){const byte=mapping.get(c);if(byte===undefined)return Buffer.from(originalFmt,"utf8");bytes.push(byte);}
  return Buffer.from(bytes);
}
