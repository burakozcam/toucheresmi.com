# Kurumsal Sınav v1.2.6 — geliştirme ve kabul raporu

Tarih: 15 Kasım 2026. Next.js + Express + Prisma + PostgreSQL mimarisi korunmuştur. Canlı veritabanına migration, reset, seed veya veri güncellemesi uygulanmadı; canlı sunucuya aktarım, GitHub push veya gerçek kullanıcıyla işlem yapılmadı.

**Kabul durumu:** Kod düzeltmeleri ve aşağıdaki yerel doğrulamalar tamamlandı. Özdebir ders okuma/birleştirme/puan motoru gerçek kaynaklardan türetilmiş anonim verilerle doğrulandı. Tam yayın kabulü verilmez: gerçek `limit 8.pdf` bulunamadığı için o belgedeki bozuk fontun OCR ile `10295` okunması henüz doğrulanmış değildir. Verilen altı referans puan üç ondalıkta eşleşir; verilen altı basamaklı katsayılarla diğer beş karnede 0,001 gösterim farkı vardır. Bu fark gizlenmedi ve puanlar referansa zorla eşitlenmedi.

## 1. Gerçek kaynaklar, kapsam ve mahremiyet

- Depodaki `tests/fixtures/ozdebir/` TXT/FMT örnekleri, önceki sürümde gerçek kaynaklardan anonimleştirilmiş dosyalardır. Kimlik/numara/ad/kurum alanları değiştirilmiş; A→C, B→D, C→A, D→B dönüşümü uygulanmıştır. Alan genişlikleri, boşluklar, kayıt türü ve kitapçıklar korunmuştur.
- Yerel `downloadreport.pdf` bulundu: **427 sayfa, 427 O8126 öğrenci karnesi**. Cevap anahtarı/çapraz eşleştirme çalışma kitabı da O8126 arşivinden yerel olarak incelendi. Ham belgeler depoya alınmadı.
- Yeni `o8126-reference-anonymous.json` yalnız sayfa sıra numarası, ders D/Y değerleri, puan ve cevap ızgarasını içerir. Adlar, TC, gerçek öğrenci numaraları, kurum bilgileri ve başlıklar yoktur. Seçenekler mevcut anonim TXT'lerle aynı dönüşümle değiştirilmiştir. Kaynak SHA-256 ve anonimleştirme `manifest.json` içindedir.
- Eskişehir TXT: **209 kayıt → 105 öğrenci; 104 çift oturum, 1 yalnız sözel**. Reddedilen kayıt ve mükerrer oturum yoktur. Tek optik örnek: **1 kayıt → 1 öğrenci**, kitapçık boş olduğundan uyarıyla A kabul edilir.
- Eskişehir ve tek optik TXT ile 427 karne PDF'si arasında numara veya normalize edilmiş ad üzerinden eşleşen öğrenci bulunmadı. **TXT öğrencilerine PDF'deki kişilerin puanlarını atamak veya bire bir aynı öğrenci karşılaştırması yapmak mümkün değildir.** TXT alanları gerçek anonim TXT'den, hesaplama ve özel soru kuralları ise ayrı 427 gerçek karneden sınandı.

## 2. Özdebir hatalarının kod nedenleri ve düzeltmeleri

### Yanlış ders konumları

Önceki sözel tanım, 20 karakterlik dört bloktaki eski FMT etiketlerini gerçek ders sırası sayıyordu. Din 72–81 yerine son bloktan, İngilizce 112–121 yerine 92'den okunuyordu. Gerçek TXT'de 82–91, 102–111, 122–131 alanları boş; bunlar ek soru değildir. Önceki testler aynı yanlış düzenle beklenen cevapları ürettiğinden bu ders kaymasını yakalamıyordu. Yeni regresyonlar sabit, bağımsız konumlara bakar.

**Son düzen, 1 tabanlı ve iki uç dahil:**

| Alan | Sözel 131 | Sayısal 91 | Tek optik 171 |
|---|---|---|---|
| Öğrenci no | 10–14 | 10–14 | 10–14 |
| TC | 15–25 | 15–25 | 15–25 |
| Kitapçık | 28 | 28 | 28 |
| Türkçe | 52–71 | — | 52–71 |
| Din | 72–81 | — | 92–101 |
| Sosyal | 92–101 | — | 132–141 |
| İngilizce | 112–121 | — | 152–161 |
| Matematik | — | 52–71 | 72–91 |
| Fen | — | 72–91 | 112–131 |

Tek optikte FMT alanlarının kapasitesi 20'dir; 10 soruluk derslerin ikinci on karakteri ayrılmış boş alandır. Gerçek tek optikte 92'deki alanın 10, 112'dekinin 20 işaret taşıması eski Fen/Sosyal adlarıyla çelişiyordu. Bu düzeltme yalnız doğrulanmış Özdebir ailesine uygulanır; özgün FMT/BLDM baytları değiştirilmedi. Örnek fiziksel okuyucuda yeniden taranmadı; fiziksel form kabulü ayrıca yapılmalıdır.

UTF-8/Windows-1254 ve BOM'lu UTF-16 çözümleme korunur. Konumlar çözülmüş metinde okunur; TXT boşlukları kırpılıp kaydırılmaz. `İNG`, `İngilizce`, `Yabancı Dil`, `English`, `FEN BİL.`, `T.C.İNK.` eşleştirmeleri desteklenir. Kayıt türü uzunlukla çelişirse ancak başlık ve cevap alanları yapısal olarak doğrulanan tek alternatif kullanılır; uyarı verilir.

### Birleştirme ve hata toleransı

- Değerlendirme motorundaki oturum birleştirme korunup sonuç toplama katmanı da düzeltildi. `aggregateResults` önceki sürümde son yüklemedeki öğrenciyi önceki kaydın yerine koyarak diğer oturumu kaybedebiliyordu. Şimdi bütün oturum kayıtlarını birleştirir.
- Aynı oturumda en fazla geçerli A–E işareti bulunan **bütün kayıt**, kendi boşları ve kitapçığıyla seçilir; eşitlikte ilk kayıt kalır. Mükerrer ders cevapları ayrı satırlardan karıştırılmaz.
- Aynı numara tek başına birleştirme kanıtı değildir. Kurum, sınıf/şube, ad ve kimlik çelişkileri dikkate alınır. Güvenilir aynı TC ad hatasını aşabilir. Tek karakterlik olası TC okuma hatası ancak kurum/no/ad/sınıf/şube tam uyuştuğunda ve en az bir TC geçersizse uyarıyla tolere edilir. Ayrı yüklemelerde bu kontrol şifrelenmiş kimlik üzerinden yapılabilir; belirsiz kayıt ayrı tutulur.
- **Boş Özdebir kitapçığı A**, açık kullanıcı seçimi varsa o seçim kabul edilir; uyarı kaydedilir. Dolu geçersiz kitapçık değiştirilmez. Diğer yayınevlerinin mevcut katı doğrulaması korunur.
- Eksik oturumda ilgili ders neti/katsayılı neti ve tam puan `null` kalır. Mevcut oturum değerlendirilir. Hatalı satırlar API'nin toleranslı değerlendirmesinde diğer öğrencilerin karnesini durdurmaz.
- Önceki sonuç penceresi, eksik oturum/mükerrer/reddedilen satır ayrıntıları ve kurum/sınav seçili sonuç yönlendirmesi korunur; yayın sınavdan belirlenir.

## 3. Puan modeli, profiller ve özel sorular

Önceki motor katsayılı neti azami katsayılı nete bölüp 500'e ölçekliyordu; **başlangıç puanlı model yoktu**. Kaynak Excel'de katsayı olmayınca puan `null` oluyordu. Bu iki davranış ile yanlış İngilizce alanı, eksik Excel sonuçlarının somut kod nedenleridir. Mevcut sonuçlar görünümde doldurulmadı; motor ve ortak ekran/PDF/Excel verisi düzeltildi.

Yeni soruların sınava özel JSON kopyasında `scoreBase` ve `multipleMark` saklanır. Başlangıç puanı varsa `başlangıç + Σ(net × ders katsayısı)` uygulanır; bu modelde oransal ölçekleme veya yapay 0/500 kırpması yapılmaz. Ara hesaplamalar yuvarlanmaz; puan gösterimi üç basamaktır. Başlangıç yoksa eski model korunur. Katsayısız D/Y/net her zaman hesaplanır.

Özdebir 8. sınıf için verilen katsayılar ve 203.052560 başlangıcı yalnız **yeni, henüz katsayı tanımlanmamış** anahtarlara varsayılan olur. Mevcut anahtarlar otomatik değiştirilmez. Editörde sınava uygulama, ders katsayıları/başlangıç/işaret kuralını değiştirme ve `ScoreProfile` üzerinden yeni sınav varsayılanı kaydetme vardır. Diğer yayın/sınıflara otomatik uygulanmaz. Bu profil O8126 incelemesinden türetilmiştir; evrensel resmî Özdebir formülü değildir.

427 karnenin Fen anahtarındaki **T = herkese doğru** davranışı, farklı cevaplar ve boş bırakılmış sorularla doğrulandı; motorun H kuralına normalize edilir. X iptal olarak kalır. Referansta `*` işaretleri yanlış sayısına eklenmiyor; bu kural profil içinde `blank` olarak açıkça saklanır. Diğer sınavlarda varsayılan `*` kuralı yanlış olmaya devam eder. Eski anahtarın X/normal cevapları kendiliğinden T/H'ye çevrilmez; O8126'da A 2 ve 11. Fen sorularını referans karnesine göre onaylayın. Kullanıcı anahtarda H veya T seçebilir/girebilir.

### Referans karşılaştırması

**427 × 6 = 2.562 dersin D/Y/net değeri motorla eşleşti.** Yanıt ızgaraları PDF karakter koordinatlarından çıkarıldı; sentetik doğru cevaplar kullanılarak resmî sonuç iddiasında bulunulmadı.

| Referans puan | Karne sayfası | Yuvarlanmamış hesap | Üç basamak gösterim |
|---:|---:|---:|---:|
| 500.000 | 330 | 500.000020000 | 500.000 |
| 471.550 | 1 | 471.550310667 | 471.550 |
| 392.133 | 2 | 392.132864000 | 392.133 |
| 422.487 | 3 | 422.487292000 | 422.487 |
| 489.031 | 4 | 489.031372000 | 489.031 |
| 494.965 | 5 | 494.964844000 | 494.965 |

Verilen katsayılarla en büyük mutlak fark **0.000526**, üç basamakta tam eşleşme **422/427**. Kalan sayfalar: 53 (474.273 → 474.272), 211 (416.843 → 416.844), 223 (460.384 → 460.383), 283 (405.484 → 405.483), 394 (420.233 → 420.234). Kaynak puanlar zaten üç basamaklıdır; daha hassas resmî katsayılar olmadan tam model ispatlanamaz. Bu beş fark regresyonda açıkça izlenir; başarı diye gizlenmez.

Anonim gerçek referansın örnek PDF'si `output/pdf/v126/o8126-anonymous-reference-card.pdf` ve Excel üretim kontrolü aynı 471,550 puanı kullanır. Diğer v126 PDF örneklerinin anahtarları sentetiktir; kaynak kabulü yerine geçmez.

## 4. Paylaşım araçları

- FMT İndir'deki mevcut doğrudan Paylaş butonları ve mevcut paylaşım uçları korundu. Aynı `FmtShare` altyapısı PDF ve üyelik kategorileriyle genişletildi; ikinci token/depolama sistemi kurulmadı.
- Admin menüsüne **Paylaşım Bağlantıları** eklendi. FMT / cevap PDF / üyelik kategorileri; ad, oluşturan/Admin, tarihler, aktif/süresi doldu/kullanıldı/iptal durumları; arama, kategori/durum filtreleri vardır. Yeni FMT/PDF anahtarları yetkili yönetici tekrar kopyalayabilsin diye ayrı amaç anahtarıyla AES-GCM şifreli saklanır; erişim doğrulaması hâlâ SHA-256 token hash'iyle yapılır.
- Yeni bağlantıda URL/WhatsApp metni kopyalama, tarih değiştirme, FMT/PDF'yi süresiz yapma, iptal ve FMT/PDF için tekrar etkinleştirme vardır. İptal sunucuda denetlenir. Eski yalnız hash saklanan token geri getirilemez; yönetici yeni bağlantı oluşturmalıdır.
- FMT panelinde dar sütunda tarih/kelime kırılması düzeltildi. FMT ve merkezi paylaşım ekranları 1440/390 px Chromium testinden geçti.
- PDF paylaşımı süreli/süresiz oluşturulur, WhatsApp bağlantısı/kopyalama sunar. Yeni üretilmiş cevap PDF'si veya eski özel depolamadaki yüklenmiş cevap PDF'si paylaşılabilir. Her görüntüleme/indirme isteği token, süre ve iptal kontrolünden geçer; dosyanın depolama yolu istemciye verilmez. Depo dışı yol reddedilir.
- Başarılı FMT/PDF erişimlerinde toplam görüntüleme, indirme, son erişim sayaçları atomik artırılır. Yeni istatistik için IP, ad veya cihaz izi saklanmaz. Tahmini benzersiz ziyaret hesabı eklenmedi; sayaçlar tekil kişi sayısı değildir.
- Üyelik bağlantısı en fazla 30 dakikadır, süresiz veya tekrar etkin olamaz. Yeni admin ve öğrenci/veli hesap davetleri ile kullanım/iptal geçmişi ortak tabloda tutulur; eski bekleyen davetler de listelenir. Geçmişte yalnız kullanıcı tablosunda tutulup kullanılmış/iptal edilmiş eski davetlerin silinmiş token geçmişi geriye dönük üretilemez. Üyelik açılış sayaçları tutulmaz ve ekranda bu durum belirtilir.

## 5. Şifre ve kayıt akışı

Mevcut sistemde MFA yoktur. [NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html) tek faktörlü parola için en az 15 karakter ister; 8 karakter seçeneği ancak güvenilir MFA kurulursa yeniden değerlendirilebilir. Yeni parolalar 15–128 karakter ve yerel yaygın/beklenen parola kontrolünden geçer. Büyük harf/rakam/sembol bileşimi zorunluluğu eklenmedi. Yeni hash'ler scrypt (N=32768, r=8, p=1, rastgele tuz), mevcut bcrypt hash'leriyle giriş uyumludur. Mevcut kullanıcı parolaları değiştirilmedi. Yerel engel listesi tam bir sızmış parola veri tabanı değildir; parolalar dış servise gönderilmez.

IP ve hesap anahtarı başına mevcut hız sınırları korunur. Kayıt/şifre oluşturma alanlarında göster/gizle ve anlaşılır uzunluk geri bildirimi vardır. Yeni parolanın UTF-8 bayt uzunluğu bcrypt'in 72 bayt sınırı nedeniyle kırpılmaz.

Geçerli admin daveti tamamlanınca koşullu güncelleme ve token tüketimi aynı transaction'da yapılır, ardından hash sürümüne bağlı 8 saatlik JWT oluşturulur. Web token'ı mevcut sekme oturumuna yazar ve role uygun panele geçer. Kullanılmış/süresi dolmuş/pasif hesap daveti tekrar kullanılamaz. Başvuru formunun **admin onay süreci korunur**; bu başvurular otomatik girişle onayı atlamaz. Bu önlemler tek başına KVKK uyumluluğu beyanı değildir.

## 6. Öğrenci listeleri ve kampüs

Bu araçta öğrenci Excel'i ve derslikler tarayıcı belleğinde işlenir; bunlara ait bir Express derslik/kampüs yazma uç noktası yoktur. Backend'e istek yapıldığı varsayılarak hayalî bir API düzeltilmedi.

Derslik oluşturma gerçek Chromium'da çalıştı; bildirilen mevcut başarısızlık bire bir yeniden üretilemedi. Üstteki Derslik Ekle düğmesi artık çok adımlı iframe iletişim kutuları yerine doğrudan ad/kapasite formunu odaklar. Oluşturma, tekrar adı reddetme ve mevcut yerleşimleri koruma testleri geçer.

Kampüsün aynı aktarım içinde değişen büyük/küçük harf ve boşluklarla ayrı kalması yeniden üretildi ve düzeltildi. Türkçe başlık normalizasyonu ve Kampüs Bilgisi/Yerleşke/Campus Name adları genişletildi; aynı dosyanın satırları ortak kampüs sözlüğünü kullanır. Adsız hatalı satır atlanıp sayısı bildirilir; geçerli satırlar devam eder. Yeni aktarım mevcut listeyi sessizce silmez. Derslik formundaki mobil minimum genişlik taşması da düzeltildi. Gerçek XLSX biçiminde anonim tarayıcı testi kullanıldı.

## 7. PDF metin ve OCR

Genel metin kurtarma modülü NFKC, görünmez karakterler ve Arapça/Farsça/tam genişlik rakamlarını normalize eder; özel alan/bozuk Unicode karakterlerini güvenilir metin diye kabul etmez. API metin okuyucusu ve tarayıcı PDF araçları bu ortak modülü kullanır. Limit'e özel karakter uydurma tablosu yoktur.

Metne Göre Böl aracı, metin seçimini veya fareyle çizilmiş bölgenin normalize edilmiş koordinatlarını diğer sayfalara uygular. Bozuk/boş metinde veya kullanıcının OCR seçimiyle bölge 3× çözünürlükte render edilir. Sayısal alanda tek satır ve rakam beyaz listesiyle yerel Tesseract.js WASM çalışır. Sonuçlar sayfa bazında güven yüzdesi ve düzenlenebilir adla indirme öncesi önizlenir. 85 altı güven kontrol için işaretlenir. Aynı değerli sayfalar gruplanır; dosya adı çakışması sonek alır, eşleşmeyenler ayrı dosyadadır.

**Çalıştırılan gerçek OCR motoru testi:** tarayıcıda anonim `10295` görsel bölgesi → `10295`, güven **96**. Düşük güvenli değer önizlemede düzeltilebildi. OCR model/worker/WASM isteklerinin aynı yerel kaynağa gittiği denetlendi; öğrenci görüntüsü üçüncü tarafa gönderilmedi. Bu test gerçek Limit belgesi değildir. `limit 8.pdf` mevcut kaynaklarda bulunamadı; font eşlemesinin incelenmesi ve o dosyadan `10295.pdf` ZIP çıktısının uçtan uca kabulü **bekliyor**.

## 8. Test ve derleme sonuçları

- Node.js **22.16.0** ile API derlemesi ve Web üretim derlemesi tamamlandı. Node 24.22.1 ile de önceki derleme/test turları çalıştırıldı.
- Son otomatik sonuç **207/207 geçti; başarısız/atlanan/çalıştırılmayan 0**. Ayrıntılar, `apps/api/assets/test-center-report.json` içindedir. Node 22 test raporlayıcısının `--test-isolation` seçeneği uyumsuzluğu düzeltilerek 22'de `--experimental-test-isolation` kullanılır.
- Webpack worker'ı Node 22'de mevcut paketleri aralıklı bulamıyordu. Aynı dosyalar ana süreçte çözümleniyordu. `webpackBuildWorker: false` ile Node 22 üretim derlemesi başarılı oldu. Bu yerel bulgu cPanel'de aynı hatanın kesin oluşacağı iddiası değildir.
- İlk test turlarındaki hatalar saklanmadı: eski boş-kitapçık beklentileri, yeni transaction/sayaç çağrıları için eksik test taklitleri, gerçek kampüs eşleştirme ve mobil form taşması düzeltildi. Eski sürüm numarası testleri güncellendi. Önceki PDF çıktıları değiştirilmeden yeni çıktılar v126 dizinine alındı.
- `v126-tools.py`: 1440/390 px, derslik, gerçek XLSX aktarımı/Türkçe kampüs başlığı/hatalı satır, yerel WASM OCR, düşük güvenli düzeltme; JS hatası yok, sayfa taşması yok.
- `v126-panel.py`: 1440/390 px merkezi bağlantı ekranı/FMT paylaşım paneli ve davet sonrası otomatik giriş; anonim API taklitleriyle geçti. Bu testler gerçek DB entegrasyonu değildir.
- Önceki tek/çift oturum, mükerrer, eksik oturum, yanlış FMT, TXT arşivi yükleyen kişi, sonuç penceresi, karne 1/2 sayfa/kazanım, renk ve siyah-beyaz desen, yetki/kurum izolasyonu testleri korunur. Gerçek kaynak karşılaştırması, parola uyumluluğu ve paylaşım iptal/süre/yetki/depo sınırı regresyonları eklendi.
- Canlı PostgreSQL entegrasyonu, fiziksel optik okuyucu/yazıcı ve gerçek Limit PDF kabulü çalıştırılmadı. Paket güvenlik incelemesinde mevcut Next/Prisma/Zod/Nodemailer ve alt bağımlılıklarında advisories bildirildi; bu sürümde mimariyi değiştirecek otomatik major yükseltme uygulanmadı. Tesseract eklenmesi bu kayıtların çözüldüğü anlamına gelmez.

## 9. Canlıya aktarım gereksinimleri

1. Mevcut DB, özel TXT/PDF depolaması, `.env`, JWT_SECRET ve TXT_STORAGE_KEY yedeklenip korunmalıdır. Hiçbir mevcut sınav, sonuç, kullanıcı, TXT veya parola toplu dönüştürülmez. Eski hatalı sonuçlar özgün arşiv TXT'den yeniden değerlendirilmelidir; geçmiş snapshot'lar otomatik yeniden yazılmaz.
2. Hazır additive migration: `20261114000000_v126_shares`. `FmtShare` için nullable süre, kategori/hedef/ad, şifreli token, sayaç/son erişim ve kullanıldı zamanı; ayrıca `ScoreProfile` tablosu ve tek etkin varsayılan indeksi ekler. **Canlı migration bu çalışmada uygulanmadı.** Yetkili yayın adımında `npm run db:migrate:deploy` gerekir. Eski FMT linkleri ve token hash'leri korunur.
3. Node.js 22, `npm ci`, `npm run db:generate`, API/Web derlemesi gerekir. Web build sırasında gerçek HTTPS `NEXT_PUBLIC_API_URL`; gerekiyorsa SSR FMT bilgi kontrolü için `API_INTERNAL_URL` tanımlayın. Test adresi `https://api.example.invalid` ile hazırlanmış yerel derleme canlıya aynen kopyalanmamalıdır.
4. Web `prebuild`/`predev`, kilitli npm bağımlılıklarından yerel OCR dosyalarını `public/vendor/ocr/` altına üretir (~32 MB). Bu dizin Git'te tutulmaz; dağıtıma dahil edilmelidir. Worker, WASM ve `.traineddata.gz` dosyaları aynı origin'den erişilmeli; `.gz` model dosyasına yanlış Content-Encoding eklenmemelidir. WASM MIME türü `application/wasm`; CSP varsa `worker-src 'self' blob:` ve gerekli yerel WASM çalıştırması izinli olmalıdır.
5. Yeni OCR bağımlılıkları: `tesseract.js@6.0.1`, `@tesseract.js-data/eng@1.0.0`. Sistem Tesseract, Python/Poppler, root yetkisi veya haricî OCR API'si **üretimde zorunlu değildir**. Python Playwright/Chromium ve Poppler yalnız yerel QA içindir. Mevcut sharp/Prisma platform bağımlılıklarının önceki hosting kuralları sürer.
6. JWT_SECRET değişirse eski oturumlar ve şifreli bağlantı anahtarlarının yeniden kopyalanması etkilenir; mevcut hash ile erişim doğrulaması korunur. Anahtarlar izinsiz değiştirilmemelidir. Paylaşım token'larını günlük/GitHub/analitiğe yazmayın.
7. Migration ve API/Web birlikte yayınlanmalı; sonra gerçek DB üzerinde kurum izolasyonu, özel PDF paylaşımı, davet tüketimi ve gerçek dosyalarla kurum kabulü yapılmalıdır. Bu rapor canlıya aktarım onayı değildir.
