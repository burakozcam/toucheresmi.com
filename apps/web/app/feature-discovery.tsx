"use client";
import Link from 'next/link';
import UiIcon from './ui-icon';
import {useHomeScene,SceneProgress} from './use-home-scene';

const announcementSteps=['Yeni cevap anahtarı ekleniyor','Kayıt başarıyla tamamlandı','Otomatik panel duyurusu oluşturuldu','Duyurunun hedef kitlesi belirlenir','Panel ana sayfasındaki yatay kartlar','Varsayılan yayın süresi: 7 gün','Süre dolunca duyuru geçmişinde'];
export function AnnouncementDiscovery(){
 const scene=useHomeScene(12600,6),history=scene.step===6;
 return <section ref={scene.root} className="feature-discovery" data-feature="announcements"><div><p className="hero-tag">DUYURU MERKEZİ</p><h2>Yeniliklerden anında<br/>haberdar olun.</h2><p>Yeni cevap anahtarlarını ve önemli duyuruları panel ana sayfasında takip edin. Araçlar → Duyurular ekranından güncel ve geçmiş duyurulara ulaşın.</p>{scene.controls}</div>
  <div className="discovery-stage" data-phase={history?'history':scene.step>=4?'live':'preparing'}><div className="discovery-toolbar">{history?'Araçlar → Duyurular → Duyuru geçmişi':'Panel ana sayfası · Temsili örnek'}</div>
   <div className="discovery-event"><UiIcon name={scene.step?'check':'upload'}/><div><strong>{scene.step?'Cevap anahtarı kaydedildi':'Cevap anahtarı ekleniyor'}</strong><small>Örnek Yayın · 8. Sınıf · Örnek Deneme</small></div></div>
   <div className="discovery-channel">{scene.step>=2?'✓ Otomatik duyuru':'Duyuru kayıt tamamlanınca oluşur'}<span>{scene.step>=3?'Hedef: ilgili panel kullanıcıları':'Hedef kitleye göre görünür'}</span></div>
   <div className="discovery-categories"><span>Cevap Anahtarı</span><span>FMT</span><span>Sistem ve Sürüm</span></div>
   {scene.step>=2&&<div className={`discovery-card-track ${scene.step===5?'show-next':''}`}><article className="discovery-announcement"><small>Cevap Anahtarı · {history?'Geçmiş':'Güncel'}</small><strong>Yeni cevap anahtarı eklendi</strong><p>Örnek Yayın · 8. Sınıf · Örnek Deneme</p><span>{history?'Yayın süresi doldu · geçmişte saklanır':scene.step>=5?'Varsayılan olarak 7 gün yayında':'Değerlendirmeye hazır'}</span></article>{!history&&<article className="discovery-announcement"><small>Genel</small><strong>Güncel panel duyuruları</strong><p>Kategorilere göre inceleyin.</p><span>Detayları görüntüle</span></article>}</div>}
   <p className="discovery-caption">{announcementSteps[scene.step]}</p><SceneProgress/>
  </div>
 </section>;
}

const helpSteps=['Örnek Sınav Değerlendir ekranı','Sayfaya özel yardım açılır','Animasyonlu anlatım seçilir','Örnek TXT dosyası bırakılır','FMT önerisi incelenir','Sınav seçimi kontrol edilir','Değerlendirme düğmesi tanıtılır','Örnek anlatım tamamlandı'];
export function HelpDiscovery(){
 const scene=useHomeScene(12800,7);
 return <section ref={scene.root} className="feature-discovery feature-discovery-reverse" data-feature="help"><div><p className="hero-tag">SAYFAYA ÖZEL REHBER</p><h2>Her adımda<br/>yanınızdayız.</h2><p>Bulunduğunuz ekranın yardımını açın. Animasyonlu anlatımı izleyin veya sayfa turuyla işlem alanlarını tanıyın. Örnek eğitim gerçek kayıt oluşturmaz.</p>{scene.controls}</div>
  <div className="discovery-stage discovery-help" data-phase={scene.step}><div className="discovery-toolbar">Sınav Değerlendir <span className={scene.step<=1?'discovery-help-icon pulse':'discovery-help-icon'}>?</span></div>
   <div className="discovery-guide-label">{scene.step>=2?'Yardım · Güvenli örnek anlatım':'Ekrana özel yardım'}</div>
   <div className={`discovery-upload ${scene.step===3?'highlight':''}`}><span className={scene.step===3?'discovery-drag-file':'discovery-demo-file'}>▤ ornek.txt</span><strong>TXT dosyalarını buraya bırakın</strong><span>{scene.step>=3?'✓ Örnek dosya seçildi':'Temsili çalışma alanı'}</span></div>
   <div className="discovery-selects">{[['FMT','Örnek FMT'],['Sınav','Örnek Deneme']].map(([label,value],i)=><div className={scene.step===4+i?'highlight':''} key={label}><span>{label}</span><b>{scene.step>=4+i?value:'Seçin'} ▾</b>{scene.step===4+i&&<div className="discovery-dropdown"><span>✓ {value}</span><span>Diğer örnek</span></div>}</div>)}</div>
   <div className={`discovery-evaluate ${scene.step===6?'highlight':''}`}>{scene.step===7?'✓ Örnek adımlar tamamlandı':'Değerlendir ve kaydet'}</div>
   {scene.step>=1&&<span className={`discovery-pointer step-${scene.step}`} aria-hidden="true"><svg viewBox="0 0 28 32" width="24"><path d="M2 2L24 17L14 19L9 29Z" fill="white" stroke="#163d6c" strokeWidth="2"/></svg><i/></span>}
   <p className="discovery-caption">{helpSteps[scene.step]}</p><SceneProgress/>
  </div>
 </section>;
}

const shareSteps=['Paylaşılacak dosya türünü seçin','Başlangıç ve bitişi planlayın','Bağlantı yayın bekliyor','Belirlenen başlangıç zamanı geldi','Dosya erişime açık','Bitiş zamanına ulaşıldı','Bağlantının süresi doldu'];
export function ScheduledShareDiscovery(){
 const scene=useHomeScene(11900,6),expired=scene.step>=5,active=scene.step>=3&&!expired;
 return <section ref={scene.root} className="feature-discovery" data-feature="sharing"><div><p className="hero-tag">ZAMANLANMIŞ PAYLAŞIM</p><h2>Doğru zamanda,<br/>doğru kişilerle paylaşın.</h2><p>FMT veya cevap anahtarı paylaşımınızı önceden hazırlayın. Başlangıç gelince dosya erişime açılsın, bitişte bağlantının süresi dolsun.</p>{scene.controls}</div>
  <div className="discovery-stage" data-phase={expired?'expired':active?'active':'scheduled'}><div className="discovery-toolbar">Paylaşım planı · Temsili örnek</div><div className="discovery-schedule"><span>Dosya türü <b>FMT / Cevap Anahtarı</b></span><span>Başlangıç · Türkiye saati <b>20 Kasım · 09.00</b></span><span>Bitiş · Türkiye saati <b>27 Kasım · 09.00</b></span></div>
   <div className="discovery-example-link">örnek bağlantı · dosya içeriği gösterilmez</div><div className="discovery-clock"><UiIcon name="calendar"/> <b>{expired?'27 Kasım · 09.00':active?'20 Kasım · 09.00':'20 Kasım · 08.59'}</b></div>
   <div className={`discovery-share-status ${active?'complete':''}`}>{expired?'Süresi doldu':active?'✓ Aktif':'◷ Yayın bekliyor'}</div><div className="discovery-file-access">{expired?'Dosyaya bu bağlantıdan erişilemez':active?'Örnek dosya erişime açık':'Dosya yayın zamanına kadar kapalı'}</div><p className="discovery-caption">{shareSteps[scene.step]}</p><SceneProgress/>
  </div>
 </section>;
}

/** Compact preview in the existing tools row; no additional tall marketing section. */
export function PdfDiscovery(){
 const scene=useHomeScene(8400,2),labels=['PDF düzenleme','Dosya ve sayfa işlemleri','Belge tarama'];
 return <section ref={scene.root} className="home-pdf-card" aria-label="Birleşik PDF ve Belge Araçları tanıtımı"><Link href="/pdf-duzenleyici"><span>03 / HAZIRLA</span><strong>Belgelerin için<br/> tek çalışma alanı.</strong><small>PDF ve Belge Araçlarını keşfet <UiIcon name="arrow"/></small></Link>
  <div className="pdf-discovery-preview" data-phase={scene.step}><div className="pdf-discovery-tabs">{labels.map((label,i)=><span key={label} data-active={scene.step===i}>{label}</span>)}</div><p><UiIcon name={['pencil','convert','image'][scene.step]}/>{['Sayfa ekle; eklenen sayfaya metin veya görsel yerleştir.','Birleştir, böl, dönüştür; metin tanıma ve eşleştirmeyi kontrol et.','Kamera veya dosyadan belgeyi kırp, döndür ve indir.'][scene.step]}</p><small>Dosyalar cihazında işlenir.</small><SceneProgress/></div>{scene.controls}
 </section>;
}
