# FMT kütüphanesi ve dosya uzantısı düzeltmesi — v1.1.3 eki

## Eklenen optikler

| Gönderilen dosya | Sistemdeki adı | Kütüphane kodu |
| --- | --- | --- |
| kurmay-oo-sekonic-form-1858-1.fmt | Kurmay Fenomen Ortaokul | kurmay-fenomen-1858 |
| 26-27 GÜNCEL O.O SEKONİC 1923.fmt | Hız Yayınları 1923 Ortaokul Optiği | hiz-1923 |
| FERNUS SECONIC 5-6-7- LGS.fmt | Dakika / Karekök Yayınları Ortaokul Optik | dakika-karekok |

Üç dosya **FMT İndir** kartlarına ve **FMT Paylaş** seçimine eklendi. İndirme kartından doğrudan süreli paylaşım da oluşturulabilir. Birlikte paylaşımda beş sistem FMT'si (önceki 7108/8050 dahil) seçilebilir. Bayi/yönetici yetkileri ve paylaşım süresi/iptal/anahtar kontrolleri korunur.

Kaynakların özgün Windows-1254 baytları, satır sonları ve optik koordinatları değiştirilmedi. Dosyalar API paketinin assets/templates dizinine dahil edilir. API ve Web aynı catalog.json dosyasını kullanır. Dosya yolu, istekten gelen serbest bir adla değil katalogdaki izinli kod üzerinden seçilir. Dakika / Karekök adındaki eğik çizgi yalnızca indirme dosya adında güvenli tireye dönüştürülür.

### Kaynak/kopya SHA-256 özetleri

- Kurmay: `86faec74b3f1272b931a4a8a5f5d051dd06580cd1ab6a53e9c6728d8f2b6dbc4`
- Hız: `9f0ff72e81dec86f8c16db6e30efeee5a548612e2ec1785dede0c6dd0c368d29`
- Dakika / Karekök: `bddcc16c587bb819cad9aba3fddabdeada416e62740c681b739d51b811a1aaca`

**İndirme/paylaşım için ek bilgi gerekmez.** Bu ekleme, yeni dosyaları doğrulanmış TXT değerlendirme yerleşimleri olarak etkinleştirmez veya otomatik veritabanı kaydı oluşturmaz. Yeni optiklerde gerçek anonim TXT çıktısı, kullanılan okuyucu/program adı ve beklenen alan değerleriyle mevcut FMT doğrulama/onay akışı ayrıca tamamlanmalıdır. Örneğin Hız dosyasında mevcut parser'ın doğruladığı K işaretinin yanında S işaretleri de bulunur; bunların TXT çıktısına etkisi tahmin edilmedi. Ekranda TXT/okuyucu doğrulamasının beklediği açıkça belirtilir.

## Dosya uzantısı

Üç ayrı durum ele alındı:

1. Eski güvenli ad fonksiyonu adın ilk 180 karakterini alıyordu; uzun dosya adlarında sonda kalan uzantı kesilebiliyordu. Yeni fonksiyon uzantıyı ayırıp gövdeyi UTF-8 bayt sınırına göre kısaltır; PDF/FMT/XLSX/DOCX ve tar.gz gibi uzantılar korunur.
2. Yeniden adlandırmada kullanıcı uzantıyı kaldırabiliyordu. API artık önceki uzantıyı korur. Ad kutusunda da bu davranış belirtilir. Bu işlem dosya türü dönüştürmez.
3. Paylaşım indirmesinde tarayıcı Content-Disposition başlığını okuyamazsa genel “evrak” adına düşülebiliyordu. Yeni, anahtar ve zaman kontrolünden geçen POST info ucu uzantılı adı sağlar; indirme bu adı yedek olarak kullanır. Bu uç, yanlış anahtarda veya gelecekteki/bitmiş/iptal edilmiş paylaşımda dosya adını açıklamaz. İndirme isteğinde zaman ve iptal yeniden kontrol edilir.

Ayrıca multipart yüklemelerde Türkçe dosya adlarının latin1/UTF-8 karışması, yalnızca geçerli UTF-8 gidiş-dönüş kontrolüyle düzeltilir. Dosyanın gizli depolama adının rastgele ve uzantısız olması normaldir; kullanıcıya indirilen ad ayrı tutulur.

Önceden adı zaten uzantısız kaydedilmiş dosyalar içerik tahminiyle topluca yeniden adlandırılmaz. Böyle bir kayıt varsa özgün dosya adı doğrulanarak ayrıca düzeltilmelidir.

## Doğrulama

- **118 otomatik test geçti, 0 başarısız.** Yeni testler; üç dosyanın sabit kaynak özetlerini, adlarını, özgün baytlarını, yeni FMT indirme API'sini, birlikte süreli paylaşımı, yanlış anahtar/iptal/süre aşımını, uzun Türkçe adları, uzantısız yeniden adlandırmayı ve korunan dosya bilgisi ucunu kapsar.
- API ve Web üretim derlemeleri başarılı (Node 24.22.1). Yeni katalog ve üç FMT, dist/assets/templates çıktısında mevcut.
- Yerel Chromium testi başarılı: üç optik ekrandaki doğru adlarla indirilir; indirilen baytlar kaynak kopyayla aynıdır. Türkçe adlı FMT yükleme, uzantısız yeniden adlandırma ve normal indirme doğrulandı. Content-Disposition kaldırılarak süreli bağlantıdan indirmede .fmt uzantısının kaldığı doğrulandı. Önceki profil/blog/PDF ve mobil testler de geçti.
- git diff --check başarılı.

Yeni migration veya npm bağımlılığı yok. Canlı sunucuya/veritabanına bağlanılmadı; dağıtım yapılmadı. Canlıya geçerken API ve Web birlikte güncellenmeli; Web build'i gerçek API adresiyle yeniden alınmalıdır. Yerel test build'i https://localhost:4443 adresini kullanır.

## Değişen / eklenen dosyalar

- apps/api/assets/templates/catalog.json
- apps/api/assets/templates/kurmay-fenomen-1858.fmt
- apps/api/assets/templates/hiz-1923.fmt
- apps/api/assets/templates/dakika-karekok.fmt
- apps/api/src/fmt-library.ts
- apps/api/src/file-names.ts
- apps/api/src/optical-routes.ts
- apps/api/src/fmt-share.ts
- apps/api/src/admin-content.ts
- apps/web/app/panel/fmt-downloads.tsx
- apps/web/app/panel/fmt-sharing.tsx
- apps/web/app/panel/file-management.tsx
- apps/web/app/dosya-paylasim/[id]/download.tsx
- apps/web/app/styles.css
- tests/fmt-library-files.test.ts
- tests/run.ts
- tests/e2e/v113.cjs
- tests/api-package-smoke.cjs
- docs/v1.1.3-release.md
- docs/fmt-library-extension-fix.md
