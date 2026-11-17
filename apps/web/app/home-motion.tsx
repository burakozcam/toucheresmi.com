"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import PublisherLogo from "./publisher-logo";

export function PublisherRibbon({ publishers }: { publishers: { id: string; name: string }[] }) {
  const root = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting));
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  if (!publishers.length) return null;
  return <section ref={root} className="publisher-ribbon" aria-label="Yayınevleri" data-paused={!visible}>
    <div className="ribbon-label"><span>Yayınevini seç.<br /><strong>Denemeni bul.</strong></span></div>
    <div className="ribbon-window"><div className="ribbon-track">{[0, 1].map(copy => <div className="ribbon-group" key={copy} aria-hidden={copy === 1 || undefined}>{publishers.map(p => <Link tabIndex={copy === 1 ? -1 : 0} href={`/cevap-anahtarlari?publisherId=${encodeURIComponent(p.id)}`} key={p.id}><PublisherLogo id={p.id} name={p.name} /><span>{p.name}</span></Link>)}</div>)}</div></div>
  </section>;
}

export function ProgressReport() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {if(entry.isIntersecting){root.current?.setAttribute("data-revealed", "true");observer.disconnect();}}, { threshold: .25 });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  return <section ref={root} className="discover-section" aria-labelledby="discover-title">
    <div className="discover-copy"><p className="hero-tag">HER NETİN BİR HİKÂYESİ VAR</p><h2 id="discover-title"><b>Bir</b> <b>puandan</b><br /><span><b>çok</b> <b>daha</b> <b>fazlası.</b></span></h2><p>Güçlü olduğun dersleri gör, geliştireceğin kazanımları keşfet. Bir sonraki denemene nereden başlayacağını bil.</p><Link className="button button-navy" href="/sonuclar">Sınav sonucunu öğren ↗</Link></div>
    <div className="discovery-report"><div className="report-top"><span className="brand-mark">K</span><div><strong>Başarı yolculuğun</strong><small>Temsili karne · gerçek öğrenci verisi değildir</small></div><span className="report-star" aria-hidden="true">✦</span></div><div className="report-score"><strong>72<small> / 90 net</small></strong><span>Her adım ileriye.</span></div><div className="discovery-bars">{[{ name: "Türkçe", net: 17, total: 20 }, { name: "Matematik", net: 16, total: 20 }, { name: "Fen bilimleri", net: 18, total: 20 }].map((d, i) => <div key={d.name} style={{ "--bar-delay": `${i * 140}ms` } as React.CSSProperties}><span>{d.name}</span><span>{d.net} / {d.total}</span><i><b style={{ width: `${d.net / d.total * 100}%` }} /></i></div>)}</div><p className="report-note">↗ Kazanım analiziyle çalışma planını şekillendir.</p></div>
  </section>;
}

const steps = ["Kitapçığın hazır.", "Optik form açılır.", "Cevaplar işaretlenir.", "Tarama başlar.", "Cevaplar değerlendirilir.", "Netler grafiğe dönüşür.", "Karnen karşında."];
export function ScrollStory() {
  const root = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const node = root.current;
    if (!node) return;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer:ReturnType<typeof setInterval>|undefined;let stage=0;
    const finish=()=>{if(timer)clearInterval(timer);node.style.setProperty("--story-progress","1");setStep(6);};
    const changed=()=>{if(motion.matches)finish();};
    const observer=new IntersectionObserver(([entry])=>{if(!entry.isIntersecting)return;observer.disconnect();if(motion.matches){finish();return;}timer=setInterval(()=>{stage++;node.style.setProperty("--story-progress",String(stage/6));setStep(stage);if(stage>=6&&timer)clearInterval(timer);},650);},{threshold:.2});
    observer.observe(node);motion.addEventListener("change",changed);
    return()=>{observer.disconnect();if(timer)clearInterval(timer);motion.removeEventListener("change",changed);};
  }, []);
  return <section ref={root} className="optical-story" data-step={step} aria-labelledby="story-title"><div className="story-sticky"><div className="story-copy"><p className="hero-tag">OPTİKTEN KARNEYE</p><h2 id="story-title">İşaretle.<br /> Keşfet.<br /><span>İleriye git.</span></h2><p>Bir sınavın anlamlı sonuçlara dönüşme yolculuğu.</p><p className="story-current" aria-hidden="true">{steps[step]}</p><ol className="story-steps">{steps.map((text, i) => <li key={text} data-active={i === step}><span>0{i + 1}</span>{text}</li>)}</ol></div><div className="story-art" aria-hidden="true"><div className="story-orbit"/><div className="story-book"><span>KURUMSAL SINAV</span><strong>Bir sonraki<br />adımın.</strong><small>DENEME KİTAPÇIĞI</small></div><div className="story-optic"><strong>CEVAP FORMU</strong><span>8. SINIF · A KİTAPÇIĞI</span><div className="story-bubbles">{Array.from({ length: 9 }, (_, r) => <div key={r}><small>{String(r + 1).padStart(2, "0")}</small>{["A", "B", "C", "D"].map((l, c) => <i key={l} data-marked={c === r % 4}>{l}</i>)}</div>)}</div><div className="story-scan"/></div><div className="story-result"><span>ÖĞRENCİ KARNESİ</span><strong>72 <small>net</small></strong><div className="story-chart">{[65, 40, 70, 50, 80, 90].map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div><small>Temsili değerlendirme</small></div></div><div className="story-timeline" aria-hidden="true"><i/></div></div></section>;
}

export function HomeEffects(){useEffect(()=>{const nodes=document.querySelectorAll<HTMLElement>(".home-exams,.institution-section,.home-tool-links,.progress-section");if(!("IntersectionObserver" in window))return;const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(!entry.isIntersecting)return;entry.target.setAttribute("data-entered","true");observer.unobserve(entry.target);}),{threshold:.12});nodes.forEach(node=>{node.dataset.motion="ready";observer.observe(node);});return()=>{observer.disconnect();nodes.forEach(node=>delete node.dataset.motion);};},[]);return null;}

export function AcademicProgress(){const root=useRef<HTMLElement>(null),[net,setNet]=useState(72);useEffect(()=>{let frame=0;const node=root.current;if(!node)return;const observer=new IntersectionObserver(([entry])=>{if(!entry.isIntersecting)return;observer.disconnect();node.dataset.entered="true";if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){setNet(72);return;}const start=performance.now();const tick=(now:number)=>{const p=Math.min(1,(now-start)/1100);setNet(Math.round(72*(1-Math.pow(1-p,3))));if(p<1)frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);},{threshold:.2});observer.observe(node);return()=>{observer.disconnect();cancelAnimationFrame(frame);};},[]);return <section ref={root} className="progress-section" aria-labelledby="progress-title"><div className="home-section-top"><div><p className="hero-tag">SONUCU ANLA. SONRAKİ ADIMI SEÇ.</p><h2 id="progress-title">Bugünü gör.<br/><span>Gelişimine yön ver.</span></h2></div><p>Bir sınavın ardından güçlü derslerini ve üzerinde çalışacağın kazanımları birlikte incele.</p></div><div className="progress-grid"><article className="progress-chart-card"><span className="hero-tag">ÖRNEK GELİŞİM GRAFİĞİ</span><strong className="progress-net" aria-label="Örnek son sınav: 72 net"><span aria-hidden="true">{net}</span><small aria-hidden="true"> / 90 net</small></strong><svg viewBox="0 0 420 170" role="img" aria-label="Örnek veriler: birinci deneme 48, ikinci 56, üçüncü 61, dördüncü 72 net"><path className="progress-gridline" d="M20 35H400M20 85H400M20 135H400"/><path className="academic-line" pathLength="1" d="M25 130C80 130 95 100 145 96S220 85 270 73S340 36 395 26"/>{[[25,130],[145,96],[270,73],[395,26]].map(([cx,cy],i)=><g key={i}><circle cx={cx} cy={cy} r="5"/><text x={cx} y="165" textAnchor={i===3?"end":"start"}>{i+1}. deneme</text></g>)}</svg><p className="field-help">Grafik ve sayaç örnek veridir. Otomatik sınavlar arası gelişim grafiği veya kazanım eşleştirmesi sunulmaz.</p></article><div className="progress-features"><article><span>01 / ANALİZLİ KARNE</span><h3>Netlerinin arkasındaki konuları keşfet.</h3><p>Kazanım bilgisi içeren sınavlarda doğru, yanlış, boş ve başarı oranlarını incele; çalışma önceliklerini gör.</p></article><article><span>02 / GEÇMİŞ SONUÇLAR</span><h3>Önceki denemelerin elinin altında.</h3><p>Öğrenci ve veli hesabına bağlanan, yayımlanmış sınav sonuçlarına aynı sistemden ulaş. Karnelerini yan yana inceleyerek önceki eksiklerini yeniden değerlendir.</p></article><article><span>03 / KURUMLAR İÇİN</span><h3>Bir sonraki çalışmaya veriyle hazırlan.</h3><p>Kurumunun kayıtlı sınavlarını, öğrenci karnelerini ve sınıf raporlarını aç; kazanım analizlerini karşılaştırarak gelişimi değerlendir.</p></article></div></div><Link className="text-link" href="/sonuclarim">Kişisel sonuçlarına git ↗</Link></section>;}
