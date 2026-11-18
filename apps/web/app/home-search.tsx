"use client";
import {API_URL} from '../lib/api';
import UiIcon from './ui-icon';
export default function HomeSearch(){return <form id="sinav-ara" className="hero-search" action="/cevap-anahtarlari" role="search" onSubmit={event=>{
 const term=String(new FormData(event.currentTarget).get('search')??'').trim();if(term)void fetch(`${API_URL}/api/search-history`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({term}),keepalive:true}).catch(()=>{});
 }}><label htmlFor="home-exam-search">Hangi sınava girdin?</label><div><UiIcon name="search"/><input id="home-exam-search" name="search" type="search" placeholder="Yayınevi, sınav veya sınıf ara…" maxLength={200}/><button className="button button-navy" type="submit" aria-label="Cevap anahtarlarını bul">Bul <UiIcon name="arrow"/></button></div><small className="search-privacy">Gönderilen arama ifadeleri, kişisel bilgiler filtrelenerek 30 gün saklanır. Kişisel bilgi yazmayın.</small></form>;}
