# KurumsalSınav v1.4.2 — yerel geliştirme ve kabul raporu

23 Kasım 2026, Europe/Istanbul. Bu rapor yalnız yerel kaynak, sentetik test kayıtları ve localhost kabulünü kapsar. Gerçek üretim verisi kullanılmadı.

## A. Sürüm bilgileri ve kapsam

- Proje/API/Web sürümü: **1.4.2**. Kök statik örneğin sürüm etiketi de güncellendi.
- Başlangıç commit'i: `45c3013aaa2484991c3218993cddf2875284f961`. Bu çalışma yeni commit oluşturmadan yerel çalışma ağacında bırakıldı.
- Ortam: Node **22.23.5**, Next **15.5.28**, React 19, Prisma **6.19.3**, geçici PostgreSQL **16**. Paket sürümleri yükseltilmedi; lock dosyasında yalnız proje/workspace sürüm metadata’sı güncellendi.
- Yeni uygulama, dağıtım programı veya paralel panel oluşturulmadı. Mevcut Next paneli, Express yetkilendirmesi, sonuç/rapor motoru ve FMT kütüphanesi geliştirildi.
- Önceden takip edilmeyen `output/pdf/v126`, `output/pdf/v130`, `output/pdf/v132` klasörleri korundu. `.env` veya gerçek JWT/SMTP/Neon/MFA/TXT anahtarları değiştirilmedi ve rapora kopyalanmadı.

Ana değişiklikler: ana sayfa sıralaması ve daha geniş animasyon alanları; üst renk seçicinin kaldırılması; kategori menüsü ve URL geçmişi; sınav → kurum → rapor alanı; yayınevi kartları; tek FMT yönetim/paylaşım alanı; ortak seçim/işlem stilleri; Son Giriş sütunu; URL'ye token koymadan aynı sekmede tam yetkili bayi geçişi ve asıl oturuma güvenli dönüş.

### Keşifte bulunan mevcut işlevler

`User.lastLoginAt`, `AuthSession.actorAdminId/parentSessionId`, zorunlu yönetici MFA'sı, taze MFA kontrolü ve bayi izinleri zaten vardı. Yeni kullanıcı/sunucu oturum modeli eklemek yerine bunlar kullanıldı. Eski bayi geçişi tokenı URL parçasına koyup yeni sekme açıyor, dönüşte sekmeyi kapatmayı veya yeniden girişi deniyordu.

Rapor envanteri korundu: Öğrenci Karnesi, Okul Sonuç Karnesi, Sınıf Sonuç Listesi; altı karne ve üç liste şablonu; PDF önizleme/PDF/Excel/öğrenci başına PDF ZIP; sıralama, sınıf, öğrenci, TC gizleme, katılım/sıralama, site adresi ve sınav logosu seçenekleri. Genel analiz, kalite karnesi, soru inceleme kararları ve Okul Çalışma Önerileri sonuç alanında ayrıca erişilebilir kaldı.

## B. 17 maddelik kontrol tablosu

**TAMAMLANDI**, belirtilen yerel değişiklik ve aşağıdaki somut test kanıtı anlamına gelir; bütün cihazların veya canlı hosting'in kabulü anlamına gelmez. Ortak CSS değişiklikleri `apps/web/app/styles.css` içindedir. Tabloda diğer Web dosyaları `apps/web/app/` köküne göre verilmiştir.

| No | İstenen değişiklik | Durum | Değişen dosyalar | Test sonucu ve kalan sınır |
|---|---|---|---|---|
| 1 | “Arkasında güçlü bir sistem var.” bölümünün renkleri | **TAMAMLANDI** | `styles.css`, `tests/e2e/v142-institution.py` | Kullanıcının bölümü belirtmesinden sonra sabit lacivert/beyaz renkler ortak canvas/ink/muted tema renkleriyle değiştirildi. Açık temada açık zemin ve koyu yazı; koyu temada diğer animasyonlarla aynı tema yüzeyi. Grid, boşluk ve boyutlar diğer büyük sahnelerle eşleştirildi. 1440/768/390 px iki tema görsel kabulü geçti; metin/düğme kontrastı en az 4.5:1. 12 kart ve 24 bağlantı path’i, oynat/durdur/yeniden oynat, reduced motion ve iki gerçek CTA yönlendirmesi korundu. |
| 2 | Animasyonları büyütme | **TAMAMLANDI** | `styles.css` | Sahne sınırı 1200→1480 px; gerçek grid sütunları ve iç metinler büyüdü. CSS scale ile büyütme yapılmadı. Etkileşim, beş sahne, üç genişlik/iki tema ve reduced motion Chromium'da geçti. |
| 3 | Yapay başlığı kaldırma | **TAMAMLANDI** | `page.tsx` | Başlık DOM'da yok; yerine slogan eklenmedi. Giriş hizalaması ve boşluklar görüntülendi. |
| 4 | Açıklamayı sadeleştirme | **TAMAMLANDI** | `page.tsx` | Görünür açıklama ve OpenGraph açıklaması “Cevap anahtarını kontrol et, sınav sonucunu görüntüle.” oldu; birebir metin kontrolü geçti. |
| 5 | Sınav/yayınevi bölümlerini animasyonların altına alma | **TAMAMLANDI** | `page.tsx` | Beş ana animasyon → yeni sınavlar → yayınevi şeridi sırası DOM'da doğrulandı. Mevcut API verileri, arama ve yönlendirmeler korundu. |
| 6 | Üst renk seçiciyi gerçekten kaldırma | **TAMAMLANDI** | `theme-toggle.tsx`, `layout.tsx`, `styles.css` | Renk düğmesi, seçenek arayüzü ve ona özel CSS kaldırıldı; eski palet tercihi başlangıçta uygulanmıyor. Ortak palet değişkenleri/modül altyapısı silinmedi. DOM'da seçici yok; standart tema düğmesi ve iki tema çalışıyor. |
| 7 | Rapor Al'ı sonuç/değerlendirme akışına taşıma | **TAMAMLANDI** | `panel/page.tsx`, `panel/exam-results.tsx`, `panel/school-location-select.tsx`; API `result-routes.ts` | Mevcut sonuç ekranı üç seçim alanına dönüştü. Sınav arama/yayınevi/sınıf filtresi, ilgili kurum, rapor/parametre/önizleme/indirme test edildi. Üç rapor PDF/Excel ve tek öğrenci ZIP gerçek baytlarla doğrulandı. Okul yöneticisinin yalnız anonim analiz yetkisi korundu. |
| 8 | Açılır/kapanır sol menü | **TAMAMLANDI** | `panel/page.tsx`, `apps/web/lib/panel-navigation.ts` | Sınav Değerlendir kategorisinde değerlendirme, Rapor Al ve ilgili sonuç işlemleri bulunuyor. Kategoriler klavyeyle açılıp kapandı; aktif sayfa, URL, yenileme, geri/ileri ve bayi rolünün yasak menüleri görememesi geçti. Kaydedilmemiş düzenlemede geçiş uyarısı korunuyor. |
| 9 | Veri düzenleyici hizası ve seçim listeleri | **TAMAMLANDI** | `panel/result-editor.tsx`, `panel/searchable-select.tsx`, `panel/exam-picker.tsx`, yeni `panel/floating-panel.tsx` | Native alanlar ortak grid/etiket ölçülerini kullanıyor. Kurum/yayınevi/sınav bağımlılıkları ve gerçek verileri açma geçti. Özel listeler body portalında; dış tıklama/odak, Escape, arama, ok/Enter, mobil sınırlar doğrulandı. Kaynakta kapsayıcıya bağlı absolute yerleşim ve tekrar eden seçenek ID riski giderildi. Bildirilen canlı açılmama olayının tek kök nedeni yerelde kesin olarak yeniden üretilemedi; “z-index kesin neden” iddiası yok. |
| 10 | Değerlendirmeleri yayınevi kartlarıyla gösterme | **TAMAMLANDI** | `panel/exam-results.tsx`, API `result-routes.ts` | Yalnız kayıtlı sonucu olan yayınevleri; açılır/kapanır başlık, ayrı sınav kartı, seçili durum, yükleme/kurum sayısı. Grup kapatma/açma ve gerçek sınavı seçme geçti. Aynı sınav farklı kurumlardan çoğaltılmıyor. |
| 11 | FMT yönetimi/paylaşımını birleştirme | **TAMAMLANDI** | yeni `panel/fmt-workspace.tsx`, `panel/page.tsx`, `apps/web/lib/panel-navigation.ts` | Mevcut FmtManager/FmtSharing bileşenleri tek alanda yeniden kullanıldı; yükleme alanı yöneticiye özel. Kütüphane, paylaşım, yükleme açılması ve dönüştürücü erişimi geçti. Eski fmt-share/download/edit/delete/optical-keys adresleri ortak alana açılıyor; bayi yönetici yükleme alanını görmüyor. |
| 12 | FMT dönüştürücü/paylaşım kartları | **TAMAMLANDI** | `panel/txt-converter.tsx`, `panel/share-links.tsx`, `panel/fmt-workspace.tsx`, `styles.css` | Dönüştürücü gerçek TXT önizlemesi ve aynı yerleşimde kayıpsız indirme yaptı. FMT bağlantısı oluşturuldu, panoya kopyalandı ve paylaşım listesinde doğrulandı. Üç kategori kartı açıldı; aktif durum ve listeler çalışıyor. Diğer paylaşım üretim kuralları mevcut regresyon kapsamındadır. |
| 13 | Öğrenci/veli hesabı ekranını sadeleştirme | **TAMAMLANDI** | `panel/reader-accounts.tsx` | İçteki tekrar başlık ve uzun giriş kaldırıldı; yayın/erişim uyarıları, hesap/öğrenci seçimleri korundu. Ekran açıldı; kaldırılan başlığın yokluğu doğrulandı. Öğrenci/veli erişim regresyonu geçti. |
| 14 | PDF araç kartları ve statik izinler | **TAMAMLANDI** | `pdf-duzenleyici/editor.tsx`, `styles.css`, yeni `scripts/static-assets-preflight.cjs`, `package.json`, `DEPLOYMENT.md` | Üç ana ve sekiz alt kart ayrı gridlerde; üç genişlikte taşma yok. İki gerçek iframe ve statik dosyalar 200; PDF aracı iki temsilî PDF'yi birleştirip indirdi. Public ve derlenmiş static izin denetimi geçti. Canlı Apache/cPanel izinleri kontrol edilmedi. |
| 15 | Bayi faaliyetleri ve Son Giriş | **TAMAMLANDI** | `panel/dealer-activities.tsx`, `panel/dealer-management.tsx`, `panel/registration-requests.tsx`; API `security-routes.ts`, `server.ts` | Faaliyet yenileme ve aktör gösterimi geçti. Mevcut nullable lastLoginAt kullanıldı; başarılı parola/MFA, başarısız giriş, refresh/token doğrulama, rol gizliliği ve UTC tarayıcıda Europe/Istanbul gösterimi sınandı. Oturum yazılamazsa son giriş yazılmıyor. |
| 16 | Mağaza/arama geçmişini soldan hizalama | **TAMAMLANDI** | `panel/store-management.tsx`, `styles.css` | Ortak studio-actions soldan başlar; mağazanın düz işlem düğmeleri mevcut button stillerini kullanır. Ürün sekmesi, faaliyet yenileme ve arama filtreleme gerçek servisle açılıp çalıştı; ekran görüntüleri alındı. Mağaza fiyat/stok/toplu işlemleri bu CSS değişikliği nedeniyle yeniden yazılmadı. |
| 17 | Süper Yönetici'nin tam yetkili bayi geçişi | **TAMAMLANDI** | `panel/page.tsx`, `panel/dealer-management.tsx`; API `auth.ts`, `auth-sessions.ts`, `dealer-routes.ts`, `security-routes.ts`, `server.ts` | Yalnız taze MFA'lı gerçek yönetici; doğru bayi rolü/kapsamı, gerçek yazma, aktör denetimi, refresh, sabit kırmızı dönüş, parent logout/iptal/süre sonu, başka bayiye geçiş ve eski token reddi gerçek PostgreSQL/HTTP'de geçti. Chromium'da bayi listesi→portal→kurum düzenleme→yenileme/dönüş doğrulandı; mobil/iki temada dönüş düğmesi erişilebilir. |

### Ortak tasarım ve gezinme notları

Düğme/filtre/etiket hizası, odak çerçevesi, seçili kart sınırları ve taşma kuralları ortak CSS'de tutuldu. Ekranlar tek renge boyanmadı. Yeni kontroller mevcut yardım envanterine kararlı kimliklerle işlendi; envanterin kaynakla birebir eşleşme testi geçti. Mevcut PDF çalışma alanından çıkış uyarısı ve düzenleyicinin kaydedilmemiş hücre uyarısı korunur.

## C. Güvenlik ve veritabanı

**Yeni migration yok.** `User.lastLoginAt`, AuthSession, DealerActivity ve AuditLog mevcut şemadadır. `schema.prisma` ve eski migration SQL dosyaları değiştirilmedi. Yeni, tmpfs üzerinde geçici localhost PostgreSQL test konteynerinde mevcut **26 migration** başarıyla kuruldu. Başlangıç şema kontrolü de ayrı boş sentetik DB'de yapıldı; üretim veya önceki test verileri sıfırlanmadı.

Bayi geçişinde sunucu seçilen bayinin etkin ve kurulmuş gerçek DEALER hesabını seçer. Süper Yönetici rolü bu hesaba verilmez. İmzalı çocuk tokenı bayi kimliğine bağlanır; her istekte veritabanındaki çocuk/asıl oturum, kullanıcılar, MFA/güvenilir cihaz, iptal ve süre kontrol edilir. Hesap başka bayiye taşınırsa eski temsil oturumu iptal olur. Aynı asıl oturum için yeni geçiş eski çocukları sonlandırır; iç içe geçiş yasaktır. Süre en fazla 15 dakika ve asıl oturumun kalan süresidir. Mevcut işlem/bölge/kota/dışa aktarım izinleri aynen geçerlidir.

Asıl yönetici tokenı mevcut uygulamanın sekmeye özel sessionStorage modelinde saklanır; geçiş artık URL/hash veya log üzerinden aktarılmaz. Dönüş, asıl yönetici bearer'ıyla `/api/security/impersonation/end` çağırarak çocukları sunucuda iptal eder ve asıl paneli geri yükler. Normal arayüz çıkışı asıl oturumu ve çocuklarını sonlandırır. Hassas hesap/MFA/şifre ayarları temsil oturumunda değiştirilmez; bu bayi iş modüllerindeki tam yetkiyi sınırlayan bir salt okunur mod değildir. Bu oturum türü için hesap sahibinin güvenlik bilgilerine müdahale engeli önceki mimariden korunmuştur.

Başlatma/bitirme denetimi yönetici kimliğini içerir. Genel sunucu işlemleri gerçek aktör ve ayrı etkin kullanıcı/bayi kapsamını kaydeder. DealerActivity'nin mevcut actorAdminId ve actorUserId ayrımı korunur; faaliyet arayüzü yönetici işlemini açıkça gösterir. Bearer yetkilendirmesi, mevcut yabancı Origin reddi ve CSP zayıflatılmadı. Tokenlar URL'ye yazılmadı.

Son giriş yalnız tamamlanan kimlik doğrulamada yazılır. Normal parola/güvenilir cihaz yolunda oturum oluşturma, tarih güncelleme ve başarı kaydı tek transaction içindedir; MFA yolları mevcut atomik transaction'ı kullanır. Hesap görüntüleme, sayfa yenileme, temsil oturumu oluşturma ve MFA step-up bir giriş sayılmaz. Eski bilinmeyen tarihler doldurulmadı; kullanıcı listesinde “Giriş kaydı yok” gösterilir. Alan yalnız Süper Yönetici'nin mevcut `/api/admin/users` sözleşmesine eklendi.

Kaynak taraması yeni dosyaları da içerdi; özel anahtar/sağlayıcı tokenı/gömülü JWT/uzak veritabanı parolası kalıplarında aday bulgu yok. Bu sezgisel kontrol tam güvenlik kanıtı değildir. Yeni bağımlılık, harici LLM veya bu turda npm audit yapılmadı. v1.4.1'in kayıtlı bağımlılık uyarıları giderildiği iddia edilmiyor; [önceki güvenlik raporu](v141-security-and-deployment.md) üretim öncesi ayrıca değerlendirilmelidir.

## D. Gerçek test sonuçları

| Kontrol | Sonuç | Kanıt / kapsam |
|---|---|---|
| `npm test` | **312/312 geçti** | Yeni navigasyon izinleri, imzalı bayi kapsamı, atomik giriş başarısızlığı ve statik izin testleri dahil mevcut parser/optik/FMT/karne/hesap/mağaza/güvenlik regresyonu. |
| Frontend TypeScript | **Geçti** | `npm exec -w @optik/web tsc -- --noEmit`; son üretim build'i de tür kontrolü yaptı. |
| Backend derlemesi | **Geçti** | `npm run build -w @optik/api`, v1.4.2. |
| Web üretim derlemesi | **Geçti** | `apps/web` dizininden Next production build, localhost:4022 API. Next'in önceden var olan CSS align-items:start uyumluluk uyarısı kaldı; derleme hatası yok. |
| Mevcut migration zinciri | **26/26 geçti** | Yalnız boş `ks_v142_acceptance`, localhost PostgreSQL 16. |
| Yeni HTTP kabulü | **21/21 geçti** | `tests/e2e/v142-http.cjs`; gerçek rol/kapsam/son giriş/rapor/temsil/asıl oturum testleri. |
| Mevcut kapsamlı güvenlik kabulü | **22/22 geçti** | `KS_QA_PROFILE=v142 ... v132-security.cjs`; 259 yöntem envanteri, 170 özel yöntemde kimliksiz erişim reddi ve yönetici uçlarında bayi reddi. |
| Öğrenci/veli/analiz regresyonu | **19/19 geçti** | `KS_QA_PROFILE=v142 ... v141-http.cjs`; öğrenci grant izolasyonu, asistan, anonim analiz/PDF, yayın/silme/kod iptali. |
| Gerçek Chromium kabulü | **25/25 geçti** | `node tests/e2e/v142-browser.cjs`; ayrıntı `test-results/v142/browser-acceptance.json`. Menü, URL/history, native/özel seçim, dirty uyarısı, rapor/PDF.js, FMT oluştur/kopyala/TXT indir, PDF birleştir, bayi portalı ve dönüş; pageErrors boş. |
| 1. madde için odaklı görsel kabul | **6/6 geçti** | `python3 tests/e2e/v142-institution.py`; yalnız localhost Web, DB bağlantısı yok. 1440/768/390 px × açık/koyu tema, kontrast/yerleşim/taşma, 12 kart/24 bağlantı, animasyon kontrolleri, reduced motion ve CTA gezinmesi. Görüntüler ve ölçümler `test-results/v142/institution/` altında. |
| Statik izinler | **Geçti** | 45 public dosyası/6 dizin ve 108 derlenmiş static dosyası/38 dizin; erişim sorunu yok, symlink/dünya yazması yok. Script salt okunur. |
| Kaynak/gizli kalıp ve diff | **Geçti** | İzlenen+yeni kaynak listesinde aday yok; `git diff --check` temiz. `.env` içerikleri rapora alınmadı. |

Yeni testler ve çalıştırma talimatı: [tests/e2e/README.md](../tests/e2e/README.md). Yerel ekran görüntüleri/indirmeler/JSON sonuçları `test-results/v142` altındadır ve Git dışında tutulur. Test oturumu içeren sentetik `ui-seed.json` dağıtım paketine dahil edilmez.

### İlk denemelerdeki hatalar ve düzeltmeler

- İlk Web build'i depo kökünden yanlış çalışma diziniyle başlatıldı; OpenGraph font yolu bulunamadı. Doğru `apps/web` dizinindeki build başarılı oldu. Bu nedenle uygulamaya gereksiz font/yol yaması eklenmedi.
- İlk birim turunda eski hesap-daveti taklidi atomik girişin yeni yeniden okumasını sağlamıyordu; test fixture'ı güncellendi. Sonraki turda eski elle oluşturulmuş temsil tokenı bayi bağlama iddiası taşımıyordu; gerçek yeni sözleşmeye göre düzeltildi. Kök statik sürüm etiketi ve yeni yardım kontrol kayıtları da tutarlı hâle getirildi. Son tam turda başarısız test yok.
- Eski eşzamanlı kota senaryosu, korunan ağır iş sınırının 429 yanıtını hesaba katmıyordu. Test, iş tamamlandıktan sonra reddedilen isteği tekrar göndererek kota reddini doğrular; sunucu iş sınırı gevşetilmedi.
- Ekran görüntüleri, renk geçişinin ortasında alınmaması için sonlu animasyonlar sabitlenerek yenilendi. İlk tarayıcı senaryolarında eski tablo CSS seçicisi ve cevap dosyası olmayan sentetik sınav fixture'ı düzeltildi. PDF birleştirme testinde iframe gövdesinin görünmesi yerine modül yüklemesinin tamamlanması beklendi. Bunlar başarı diye kaydedilmedi; son kabul gerçek dosyalarla tamamlandı.

### Çalıştırılmayan kontroller ve sınırlar

- Canlı Veridyen/Apache/Passenger, gerçek Neon, gerçek kullanıcı/MFA cihazı, SMTP veya harici CAPTCHA üzerinde test yapılmadı. Bunlar staging/işletim kabulündedir.
- Kullanıcı 1. maddedeki bölümü sonradan başlığıyla belirtti; ilgili renk düzeltmesi ve yerel görsel kabul tamamlandı. Chromium dışında Safari/Firefox ve fiziksel mobil cihaz kabulü yapılmadı.
- Her PDF alt aracının bütün dosya biçimleri bu turda yeniden uçtan uca denenmedi; iframe/asset erişimi, yerleşim, karne önizlemesi ve temsilî gerçek PDF birleştirme test edildi. Değişmeyen PDF/karne motorunun mevcut birim/regresyon testleri geçti.
- Üç paylaşım kategorisinin liste/aktif/kopyalama arayüzü korundu; bu turda tarayıcıdan yeni üretilen bağlantı FMT'dir. PDF/üyelik üretimi ve erişimi mevcut testlerdedir.
- Büyük rapor kataloğu öğrenci snapshot'larını istemciye taşımaz: yetkili aktif kurumların küçük metadata sorgusu ve SQL ile gruplanmış sınav/kurum ilişkileri kullanılır. 1.000 kurum veya 5.000 ilişki aşılırsa sessiz eksiltme yerine açık hata döner. Sınırsız katalog/sunucu sayfalaması eklenmedi. Genel analiz/rapor kapasite kuralları korunur; yük/kapasite vaadi verilmez.
- Tam bayi yazma yetkisi mevcut bayi hesabının gerçekten yetkili olduğu işlerle sınırlıdır. Yeni tablo, yönetici yetkisi, başka bayi erişimi veya bayi şifresine erişim verilmez.


### 1. madde takip düzeltmesi — 23 Kasım 2026

“Arkasında güçlü bir sistem var.” alanındaki sabit `#172b4d` zemin kaldırıldı. Bölüm diğer animasyonlarla aynı `--canvas` zeminini; başlık `--ink`, açıklama `--muted` renklerini kullanır. Bu nedenle açık temada açık zemin üzerinde koyu metin, koyu temada diğer sahnelerle uyumlu koyu yüzey ve okunabilir açık metin vardır. İletişim düğmesi/kurum giriş bağlantısı tema renklerini kullanır. Sağdaki SystemArchitecture bileşeninin kodu ve SVG geometrisi değiştirilmedi.

Bu takip çalışmasında yalnız ilgili bölümün CSS'i, odaklı tarayıcı testi ve bu rapor değiştirildi; önceki v1.4.2 kaynak değişiklikleri korundu. Güncel Web üretim derlemesi de başarılı oldu. Önceki tam test sayıları önceki kabul turuna aittir; bu küçük CSS değişikliğinden sonra tüm backend/DB paketi yeniden çalıştırılmadı. Odaklı tarayıcı kabulünde altı kontrol geçti ve sayfa hatası oluşmadı. Yerel test sunucusu test sonunda kapatıldı; üretime bağlantı veya dağıtım yapılmadı.

## E. Dağıtım hazırlığı

Kısa operatör kontrol listesi [DEPLOYMENT.md — v1.4.2](../DEPLOYMENT.md) bölümüne eklendi. Kaynak public dosyalarında önceki 600 sorunu görülmedi; mevcut dosyalar herkese okunabiliyor. Önerilen teslim izinleri dosya **644**, dizin **755**; Git bunu tek başına garanti etmediğinden kaynak/artifact ve kopyalama sonrası hedef ayrıca kontrol edilmeli. Hiçbir özel dosyanın izinleri gevşetilmedi; toplu chmod uygulanmadı.

Özet sıra: doğrulanmış yedek/geri dönüş artifact'ı → aynı lock ve Node/Next sürümleri → mevcut migration durumunu doğrulama → gerçek HTTPS API ile API/Web derleme → `npm run check:static -- --with-build` → staging ekran/rol/indirme/temsil kabulü → ayrı yayın yetkilendirmesi. Kaynak çekmek tek başına Next/Express build ve Passenger restart'ın yerini tutmaz. Bu geliştirme oturumu zincirin canlı adımlarını çalıştırmadı.

Yeni migration olmadığından v1.4.1'den ek veritabanı uygulama adımı yoktur. Eski temsil tokenlarının yeni bayi bağlama iddiası olmadığı için reddedileceği dikkate alınmalı. Dönüşte Web/API birlikte önceki artifact'lara alınır; veritabanı/storage/anahtarlar ve kullanıcı kayıtları korunur, ters migration/reset uygulanmaz. Mevcut temsil sekmeleri sonlandırılarak asıl yönetici girişi doğrulanır.

## F. Son değerlendirme

**READY FOR STAGING**

Yerel derleme ve yukarıdaki işlev/yetki kontrolleri geçti. Kullanıcı 1. maddeyi netleştirdikten sonra ilgili bölümün renk/görünüm düzeltmesi ve görsel kabulü de tamamlandı; 17 maddelik tablonun tamamı **TAMAMLANDI** durumundadır. Önceki bağımlılık uyarıları, gerçek hosting izinleri ve cihaz/ortam kabulü ayrıca açıktır. Bu karar üretime hazır olunduğu, güvenlik değerlendirmesinin tamamlandığı veya canlı dağıtım izni verildiği anlamına gelmez.

GitHub push/force push, Git geçmişi değişikliği, canlı bağlantı/deploy/restart, üretim migration/seed/reset ve gerçek kayıt silme yapılmadı. Çalışma yerel geliştirme ağacında bırakıldı.
