# Kurumsal Sınav v1.2.8 — yayın ve kabul raporu

Tarih: 15 Kasım 2026. Çalışma yerel depoda yapıldı. Canlı sunucuya aktarım, canlı veritabanı migration, GitHub gönderimi veya gerçek Google anahtarlarıyla işlem yapılmadı.

## Değerlendirme ve gerçek kaynak karşılaştırması

7108 fiziksel alan kapasitesi, seçilen sınavın gerçek soru sayısından ayrıldı. Format başka yayınevine kayıtlı olsa da alanları sınava yetiyorsa kullanılabilir; yayınevi/sınıf etiketi tek başına engel değildir. 20 karakterlik Din/Sosyal/İngilizce alanının yalnız anahtardaki 10 sorusu değerlendirilir. Anahtarda bulunmayan fiziksel dersler puana katılmaz. Anahtarın kapasiteyi aşması engellenir. Özdebir'in sözel/sayısal/tek oturum profilleri ve sınava özel katsayıları korunur.

Boş kitapçık bütün yayınevlerinde A olur; manuel eksik kitapçık seçimi kaldırıldı. Geçersiz dolu kitapçık ayrı hatadır. Boş cevaplar boş kalır. Numarası/TC'si olmayan fakat adı bulunan satır korunur, görünen numara uydurulmaz. Teknik satır kimliği yalnız iç bağlantılar içindir; aynı adlı kimliksiz kayıtlar otomatik birleştirilmez. Tamamen kimliksiz satır reddedilir. Aynı oturumun tekrarı ile eksik oturum ayrılır. Tek optikte tamamen boş bir ders, yok oturum sayılıp kaybedilmez; bölünmüş oturum ancak açık işaret veya doğrulanabilir tamamlayıcı kayıtla daraltılır. Eski 7108 kitapçık/oturum alanlarının yer değiştirdiği kayıtlar yapısal eşitlik durumunda da doğru yerleşime alınır.

Yerel özgün Ankara TXT, özgün cevap/kazanım XLSX ve aynı öğrencileri içeren 40 sayfalık PDF karşılaştırıldı. Ham TXT 198 satırdır: 196 öğrenci, 1 aynı kayıt tekrarı, 1 tamamen kimliksiz ret. Kabul edilen 5 öğrencinin numarası yoktur; boş kalır. Dosya Windows-1254 kodlamasındadır. FMT ve BLDM aynı 764 baytlık okuyucu tanımıdır; SHA-256 `5464cc6f29ad349d1fcb5808e6eb46cd2f5f398a7add899a67992f9fc519b857`.

| Gerçek kaynak kontrolü | Sonuç |
|---|---:|
| TXT ile eşleşen özgün karne | 40 / 40 |
| Ders D/Y/net karşılaştırması | 240 / 240 |
| PDF'de görünen cevap konumu | 3560 / 3560 |
| Basılı ders kitapçığı | 237 / 237 |
| PDF'nin hiç basmadığı boş ders satırı | 3 |

Basılmayan üç satırın 40 fiziksel cevap konumu TXT'de de boştur. Cevap eklenmedi. Test deposunda yalnız anonimleştirilmiş kurum/ad/numara/TC ve döndürülmüş A/B/C/D değerleri bulunur. Anonimleştirme boş kimlikleri, yinelenen kayıtları, alan uzunluklarını ve kaynak satırı ilişkisini korur. Köken özeti `tests/fixtures/7108-v128/provenance.json` içindedir.

**Puan sınırı:** Ankara XLSX resmî katsayı/başlangıç puanı içermiyor. 25 karneyle kurulan tanısal doğrusal model, ayrı 15 karnede de en fazla 0,000639982 puan artık verir. Bu, yuvarlanmış basılı puanlardan çıkarılan yaklaşık modeldir; bütün üç basamaklı puanların birebir resmî eşleşmesi değildir. Yalnız izole test sınavına açıkça atanır; üretime veya tüm yayınevlerine varsayılan olarak yazılmaz. Kesin Ankara puan kabulü için yayınevinin resmî profilinin girilmesi gerekir.

## Öğrenci verisi düzenleme ve yeniden değerlendirme

Bayi/admin paneline Sınav Verilerini Düzenle eklendi. Kurum, yayınevi ve sınav seçimi; bütün kayıtları kapsayan arama/şube/ders filtresi ve sayfalama; öğrenci numarası/ad/sınıf/şube, ortak/sözel/sayısal/ders kitapçığı ve cevap hücreleri düzenlenebilir. Geniş tablo kendi alanında kayar. TSV çoklu hücre yapıştırma, klavye hareketi, değişen hücre işareti ve kaydetmeden geri alma vardır. Kitapçık değişiminde cevaplar eski ham konumdan yeni kanonik konuma taşınır; olmayan oturum yaratılmaz.

Önce sunucuda yeniden değerlendirme ve puan farkı önizlemesi gerekir. Onay, kullanıcıya/değişikliklere/aktif sürüme bağlı süreli HMAC ile korunur. Anahtar değişmişse veya başka revizyon yazılmışsa eski önizleme reddedilir. Transaction yeni snapshot revizyonu oluşturur; ham TXT ve eski snapshot değişmez. Eski yayın kapatılır, yeni revizyon yayımlama kontrolüne girer. Birleşen kaynaklar boş ardıl revizyonla işaretlenir; çift sayım yapılmaz. AuditLog önce/sonra hücreleri, aktör, kurum/sınav ve zamanı tutar.

Gerçek bir hata da hesap bağlantılarında düzeltildi: öğrenci numarası ile snapshot içindeki teknik öğrenci kimliği aynı şey değildir. Öğrenci/veli izinleri doğrulanmış aynı kişiye yeni snapshot kimliğiyle taşınır; belirsiz eşleşme sessizce düşürülmez. Başka bayi reddi, eski sürümün korunması, eski önizleme reddi, yayın sonrası öğrenci/veli özel karne erişimi gerçek PostgreSQL/HTTP ile sınandı. PDF/Excel yeni revizyondan üretilir.

## Derslik aracı ve yükleme rehberi

Kök ve Web public `rebuilder.html` birlikte güncellendi. Üstteki Derslik ekle düğmesi yalnız odak vermek yerine formu gönderir. Daha önemli gerçek panel hatası: iframe sandbox'ında `allow-forms` yoktu; native submit olayı panel içinde engelleniyordu. Yalnız gerekli form izni eklendi; aynı-origin izni açılmadı. Excel kampüsleri normalize edilerek seçime gelir. Aynı ad farklı kampüste kullanılabilir; aynı kampüste yinelenen ad reddedilir. Yeni derslik mevcut atamaları silmez. Kampüse uymayan derslik öğrenci seçeneğine girmez.

Optik yükleme rehberi açılır bölümde format/anahtar/kitapçık/oturum ve önizleme uyarılarını açıklar. Manuel eksik kitapçık seçimi kaldırılmıştır.

## CAPTCHA, parola ve izinler

v3 varsayılanı korunur. Gerçek v2 checkbox için ayrı `RECAPTCHA_VERSION=v2`, `RECAPTCHA_V2_SECRET_KEY` ve Web `NEXT_PUBLIC_RECAPTCHA_V2_SITE_KEY` kullanılır. API `RECAPTCHA_V2_SITE_KEY` yalnız public fallback'tir. v2 ile v3 anahtarları karıştırılmaz. Anahtarsız üretim korunması hata verir; temsili checkbox üretilmez. v3 token yalnız submit'te üretilir; v2 token başarılı/başarısız işlem ve tema değişiminde yenilenir. Dar alanda gerçek compact widget seçilir.

Backend hostname, action (v3), skor (v3), zaman ve tekrar denetimini yapar. Bayi/yönetici/öğrenci/veli girişleri; başvuru, iletişim, sonuç sorgusu ve korumalı PDF yanında hesap kurma, hesap parolası değiştirme ve admin sıfırlaması kapsanır. Google siteverify dışında gerçek HTTP/DB kullanılmıştır; yerel Google cevabı kontrollü taklittir. Gerçek Google hesabı/hostname ve v2 etkileşimli challenge kabulü canlı anahtarlarla ayrıca yapılmalıdır.

Öğrenci/veli giriş bileşeni mevcut olduğu halde hiçbir sayfaya bağlanmamıştı; sonuç sayfasına eklendi. Bütün şifre alanları ortak SVG göz düğmesini kullanır: erişilebilir ad/pressed/controls, klavye Space/Enter, sabit giriş boyutu, yeni parola kuralları korunur.

Form düzeyindeki reCAPTCHA görünür bildirimi ve yerel veri güvenliği bağlantısı kullanılır. Google'ın 2 Nisan 2026 işlemci geçişi sonrası tüketici Privacy/TOS bağlantılarının kaldırılması önerisi esas alınmıştır: [Google reCAPTCHA FAQ](https://developers.google.com/recaptcha/docs/faq), [Google Cloud reCAPTCHA FAQ](https://docs.cloud.google.com/recaptcha/docs/faq). Google cihaz/ağ meta verisi işleyebilir; kullanıcıya sıfır veri aktarımı vaadi verilmez. Hukuki metnin işletmeci tarafından gerçek hizmet ayarlarıyla eşleştirilmesi gerekir.

Çerez metni ve iki düğme istenen ifadelerle yenilendi. Her iki seçim paneli kapatır, localStorage ile yenileme/sayfa değişimi boyunca korunur, footer'dan yeniden açılır ve sekmeler arası eşitlenir. GA4/GTM aynı analitik iznine ve sabit public yol allowlist'ine bağlıdır. GTM ayrıca `NEXT_PUBLIC_GTM_APPROVED=true` ister; etkinse doğrudan GA4 yüklenmez. Yalnız temizlenmiş `ks_public_page_view` olayı gönderilir; özel sonuç/token/sorgu/öğrenci verisi olaya eklenmez. Denetlenmiş container kurulumu yapılmış sayılmaz.

## Toplu sınav, kapak ve ziyaretçi kataloğu

Admin aracı bağımsız açılır sınav kartları, yayınevi/sınıf/ad/tarih, standart soru/çapraz/cevap/katsayı/kazanım sütunları, çok hücre yapıştırma ve satır büyütme sağlar. Kayıt başına hata/başarı döner; bir hatalı sınav diğerini düşürmez. Aynı sınavın yarışan tekrar kaydı transaction/yayınevi kilidiyle engellenir. Mevcut anahtar şeması ve açıkça seçilen puan profilleri kullanılır. Cevap ve kazanım için gerçek ayrı XLSX dosyaları oluşturulur. Kullanıcıya özel IndexedDB taslağı değişikliklerde otomatik saklanır; ayrıca açık saklama düğmesi vardır ve yenilemede geri yüklenir; localStorage kotasına büyük kapaklar yığılmaz.

Yeni taslakta ve mevcut admin sınav kayıtlarında kapak yükleme, 3:4 kırpma, yakınlaştırma/konum önizlemesi, kaydetme ve kaldırma vardır. API raster türünü/çözünürlüğü denetler, Sharp ile 450×600 WebP üretir; SVG kabul etmez. Kapaklar ziyaretçi raf/katalog ve detay sayfasında, yönetimde önizlemede kullanılır; karneye eklenmez.

Katalog en yeni sınavları yatay rafla ve filtrelenmiş kayıtları kompakt kitaplarla gösterir. Kapaksız kayıtlar tutarlı varsayılan tasarıma sahiptir. Yinelenen açıklamalar azaltıldı; “Logo yok” ve “PDF indirme seçenekleri” kaldırıldı. Eski dosya indirme, detay, paylaşım ve SEO yolları korunur. Sınav tarihi ile yayın tarihi ayrıdır.

## Doğrulama

- Node 22.16.0 / npm 10.8.2: `npm test` **222/222** geçti; API ve Web üretim derlemeleri geçti.
- `tests/e2e/v128-integration.cjs`: gerçek geçici PostgreSQL 16, gerçek API handler'ları, şifreli anonim arşiv ve özgün yerel TXT/XLSX; 196 öğrenci, bayi izolasyonu, revizyon/audit/eski token, öğrenci/veli erişimi, PDF/XLSX çıktıları, toplu kısmi başarı/tekrar/yetki ve WebP/SVG denetimi geçti.
- `tests/e2e/v128-security.cjs`: tek kullanımlık kurulum, CAPTCHA zorunluluğu, parola değişince eski JWT reddi, admin sıfırlama, public sonuç ve hesap izolasyonu geçti.
- Tarayıcı kabulünün sonuçları aşağıdaki son kontrol bölümünde belirtilir. Google JavaScript ve siteverify yerelde taklittir; uygulama, HTTP, DB, iframe ve kullanıcı işlemleri gerçektir.

Kabul betikleri yalnız sabit `127.0.0.1:55438/ks_v128` veritabanını kabul eder. Kimlik bilgileri ve ekran görüntüleri depo dışında `/tmp/v128-evidence` altındadır; kalıcı anonim test fixture'ları dışında gerçek öğrenci verisi depoya alınmaz. Önceki sürümün test sonuçları bu sürümün tarayıcı kanıtı gibi kullanılmaz.

## Migration ve canlıya hazırlık

Yeni migration: `apps/api/prisma/migrations/20261115160000_exam_covers/migration.sql`; `PublishedAnswerKey.coverImage` ve `examDate` nullable olarak eklenir. Veri silme/yeniden seed yoktur. Yalnız geçici yerel DB'de uygulandı. Mevcut şema ve revizyonlar korunur. Neon PostgreSQL uyumluluğu additive SQL ile korunur; gerçek Neon bağlantısı test edilmedi.

Operatör sırası: DB/dosya yedeği → Node 22/npm 10 bağımlılıkları → hedef DB adresini doğrulama → kontrollü migration deploy → Prisma client üretimi → doğru HTTPS API ve public değişkenlerle API/Web build → cPanel süreçlerini güncelleme → gerçek alan adında rol/CAPTCHA/izin/dosya/sonuç smoke testi. Var olan JWT/TXT şifreleme anahtarları, mutlak STORAGE_DIR ve dosyalar korunmalıdır. Seed/reset çalıştırılmamalıdır. DIRECT_URL örneği kendiliğinden kullanılmaz; migration için onaylı Neon direct bağlantısı `DATABASE_URL` olarak ayrı oturumda seçilmelidir.

Yeni ortam örnekleri `.env.example` içindedir. Varsayılan v3'ü değiştirmek zorunlu değildir. v2 seçiliyorsa API secret ve Web public anahtarı birlikte değiştirilmeli; Web yeniden derlenmelidir. GA/GTM kimlikleri varsayılan boş, onayları false kalır. Gerçek container denetlenmeden açılmaz.

Windows 11, gerçek cPanel ve fiziksel optik okuyucu bu Linux ortamında çalıştırılmadı. Node 22, kök `.env` yüklemesi ve mevcut cPanel başlangıç düzeni korunur. Canlı Google, resmî Ankara puan profili ve gerçek dağıtım ortamı kabulü açık maddelerdir; bunlar geçti diye işaretlenmez.

## Kesilen oturum sonrası son kontrol

15 Kasım 2026'da mevcut çalışma korunarak doğrulama sürdürüldü. Ana makinenin varsayılan Node 18'i ile iki Sharp testi çalışmadı; hedef Node 22.16.0/npm 10.8.2 ortamına geçildiğinde **222/222 test** geçti. API ve Web üretim derlemeleri son kaynakla yeniden tamamlandı. Bu nedenle Node 18 koşumundaki sonuçlar sürüm kabulü olarak kullanılmaz.

Bu kontrolde bulunan ve giderilen ek nedenler:

- Toplu sınav kartı, ortak `.management-panel` grid düzenini devraldığı için dar ekranda soru tablosunun içerik genişliği sayfayı büyütüyordu. Kart blok yerleşimine alındı; geniş tablo kendi kaydırma alanında kaldı. 320 pikselde ölçülen 980 piksel sayfa genişliği 320 piksele indi.
- Mevcut sınavların kapak düzenleyicisindeki dosya alanları 320 pikselde 6 piksellik taşma oluşturuyordu. Dosya ve konum alanlarının genişliği kapsayıcıya bağlandı. Varsayılan kapaklarda uzun sınav adları üç satırla sınırlandı; tam ad yanındaki bağlantıda korunur.
- Veri düzenleyicisinde sınav/yayınevi seçimi değişince önceki sınav tablosu ekranda kalabiliyordu. Seçim değişikliği tabloyu, önizlemeyi ve filtreleri temizler; istek sürerken seçim kilitlenir. Tarayıcıya bu durum için regresyon adımı eklendi.
- IndexedDB taslak okuması bitmeden yeni kart açılması engellendi; geç gelen eski taslağın kullanıcının yeni girdisini değiştirmesi önlendi.
- Analitik izin geri çekilip yeniden verildiğinde GA4/GTM için ortak consent güncellemesi eklendi. Gerçek Google container/hesap kabulü yapılmış sayılmaz.
- Önceki tarayıcı testindeki iframe depolama hatası test kurulumunun üst pencereyle sınırlandırılmasıyla giderildi; uygulamanın sandbox'ına `allow-same-origin` verilmedi. Kapak detay testi, “kapağı” metnini yanlış arayan eşleştirme yerine tam alternatif metni denetler.

Özgün yerel Ankara TXT/XLSX ile gerçek HTTP/PostgreSQL karşılaştırması yeniden geçti: 198 kaynak kayıt, 196 kabul edilen öğrenci, 40 eşleşen karne, 240 ders karşılaştırması. Puan modelinin en yüksek artık değeri yine 0,0006399818741442687 oldu; bu değer resmî puan profilinin yerini almaz. Güvenlik koşumu da yeniden geçti: tek kullanımlık kurulum bağlantısı, CAPTCHA zorunluluğu, parola değişiminde eski JWT reddi, admin sıfırlama, public sonuç sorgusu ve öğrenci/veli izolasyonu.

Son üretim Web derlemesindeki gerçek Chromium koşumları başarıyla tamamlandı:

| Koşum | Kabul kontrolü | JavaScript hatası | Sayfa taşması |
|---|---:|---:|---:|
| `v128-ui.py` | 28 | 0 | 0 |
| `v128-covers.py` | 56 | 0 | 0 |

Her iki koşum 320, 375, 390, 768, 1024, 1280 ve 1920 piksel genişlikleri kapsar. Ana koşum dört ayrı gerçek giriş formunu, iki çerez tercihinin kapanma/yenileme/gezinme kalıcılığını, bayi panelinin sandbox iframe'i içinde Excel kampüs aktarımı ve derslik ekleme/tekrar/yerleşim korunmasını, 196 öğrencinin tümüne sayfalı erişimi, düzenleme/önizleme/geri alma/yeni revizyon/audit işlemlerini ve toplu sınav TSV yapıştırma/taslak/yenileme/kayıt işlemlerini doğrular. Kapak koşumu yükleme, kırpma, WebP kaydı, ziyaretçi kataloğu, detay ve kaldırma yanında sonuçlar, öğrenci/veli hesapları, paylaşım, üyeler ve hesap ayarları ekranlarını kapsar. Bu kontroller bütün olası veri kümeleri, cihazlar ve üçüncü taraf hizmet davranışları için garanti değildir.

**Kabul sınırı:** yerel uygulama/DB/tarayıcı doğrulamaları geçti. Gerçek Google v3 risk skoru ve v2 challenge, resmî Ankara katsayılarıyla birebir puan kabulü, gerçek cPanel/Neon ve Windows 11 çalıştırması açık kalır. Bu dış doğrulamalar yapılmadan sürüm için koşulsuz canlıya hazır onayı verilmez. Canlıya aktarım, canlı migration ve GitHub gönderimi yapılmadı. Son diff boşluk kontrolü geçti; kök ve Web public rebuilder dosyaları aynıdır. Açılan yerel API/Web test süreçleri koşum sonunda kapatıldı; önceden var olan geçici test PostgreSQL konteyneri ve mevcut proje verileri silinmedi.
