(function(root){
  function normalize(value){return String(value||'').normalize('NFKC').replace(/[\u200b-\u200d\ufeff]/g,'').replace(/[\u0660-\u0669]/g,c=>String(c.charCodeAt(0)-0x660)).replace(/[\u06f0-\u06f9]/g,c=>String(c.charCodeAt(0)-0x6f0));}
  function inspect(value,numeric){const text=normalize(value).trim(),broken=/[\ufffd\ue000-\uf8ff\x00-\x08]/.test(text);return{text,needsOcr:!text||broken||(numeric&&!/^\d+$/.test(text)),confidence:!text||broken?0:numeric&&!/^\d+$/.test(text)?20:100};}
  const api={normalize,inspect};if(typeof module==='object'&&module.exports)module.exports=api;else root.PdfTextRecovery=api;
})(typeof globalThis==='object'?globalThis:this);
