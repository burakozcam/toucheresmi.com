"use client";
export default function ConsentPreferences(){return <button type="button" className="footer-consent-link" onClick={()=>window.dispatchEvent(new Event('ks-open-consent'))}>Çerez Tercihleri</button>;}
