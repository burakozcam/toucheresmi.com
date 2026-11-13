> **14 Kasım 2026, v1.2.5 güncellemesi:** Bu belgenin aşağıdaki bölümleri önceki sürümün tarihsel notlarıdır. Artık sözel/sayısal aile düzenleri de destekleniyor; sınama verileri gerçek dosyalardan anonimleştirilerek türetildi. Geçerli oturum konumları, kitapçık davranışı ve test sınırları için [v1.2.5 raporunu](v125-release-report.md) esas alın.

# Özdebir 5/6/7/8 Ortaokul Tek Oturum — TXT ile doğrulanan yerleşim

12 Kasım 2026. Kullanıcının onayladığı görünen ad yukarıdadır. İlk aşamada özgün BLDM kütüphaneye alınmıştı; kullanıcının sonraki oturum açıklaması ve iki TXT örneğiyle **tek oturum için yürütülebilir sistem tanımı** eklendi. Kaynaklar salt okunur incelendi; kişisel öğrenci kayıtları/cevapları repoya, test fixture'larına veya bu rapora kopyalanmadı. Otomatik testler tamamen sentetiktir. Push, dağıtım veya üretim DB işlemi yapılmadı.

## Oturum kodu ve eldeki örnekler

Kullanıcının doğruladığı sözleşme: **1 = sözel, 2 = sayısal, 9 = tek oturum**. BLDM'de ilk alanın adı SINIF olsa da ilk karakter sınıf değildir. Gerçek sınıf 26. karakterdedir.

| Kaynak TXT | Oturum | Kayıt | Satır genişliği |
|---|---|---:|---:|
| ÖZDEBİR TEK OPTİK.txt | 9 | 1 | 171 |
| oz8 (1).txt | 1, sözel | 409 | 131 |
| oz8 (1).txt | 2, sayısal | 410 | 91 |

Her iki örnek Windows-1254 olarak çözüldü. Satır sonu karakterleri genişliğe dahil edilmedi; **sondaki boşluklar korundu**. Son boşlukları trim etmek tek oturum örneğini yanlışlıkla 161 karakter gibi gösterebilir; uygulama bunu yapmaz.

## Yerel sistemde ne kullanılabilir?

`system-fmt-ozdebir-ortaokul-tek-oturum`, Sınav Değerlendir'in FMT seçiminde **Özdebir 5/6/7/8 Ortaokul Tek Oturum** adıyla sunulur. Kodda doğrulanmış tanım kullanılır; DB'deki eski/yanlış JSON bu tanımı değiştiremez. Bilerek pasife alınmış sistem kaydı yeniden açılmaz.

Kütüphane kodu `ozdebir-ortaokul-tek-oturum`. Özgün `.bldm` dosyası 574 bayt olarak saklanır; indirme/paylaşımda uzantı, Türkçe karakterler ve CRLF korunur. SHA-256: `dd3cbc08d0808abfe1dadd6e6e595364d68df1f396c26d160c5e68261623a226`. Kaynak BLDM değiştirilmedi, K/S işaretleri dönüştürülmedi. BLDM fiziksel koordinatlarını düzenleme veya okuyucuya yeniden yazma bu değişikliğin kapsamı değildir.

## Tek oturum TXT sütunları

Konumlar 1 tabanlı ve iki uç dahildir. BLDM tanım sırası ile gerçek 171 karakterlik çıktı birlikte incelendi. Başlıktaki `61=46=03` optik koordinat parametreleridir; TXT alan konumu değildir.

| Alan | TXT konumu | Açıklama |
|---|---|---|
| Oturum | 1 | Sabit `9`; yerleşimde literal olarak denetlenir |
| Kurum kodu | 2–9 | Boş olabilir; kurum yetkisi yine API'deki seçili/yetkili kurumla belirlenir |
| Öğrenci no | 10–14 | Baştaki sıfırlar korunur |
| Kimlik alanı | 15–25 | İlgili API'de mevcut hash/şifreleme akışı kullanılır; raporda ham değer yayımlanmaz |
| Sınıf | 26 | Gönderilen gerçek örneklerde 8; 5/6/7/8 karakterleri sentetik regresyonda kontrol edildi |
| Şube | 27 | Gönderilen tek oturum örneğinde boş |
| Kitapçık | 28 | BLDM'deki A/B alanı; boşsa otomatik A atanmaz |
| Cinsiyet alanı | 29 | BLDM'de yanlışlıkla KITAPCIK adı verilmiş E/K alanı; cevap kitapçığı olarak kullanılmaz |
| Ad / soyad | 30–51 | Birleşik 22 karakter; bozuk ismi tahmin ederek düzeltme yok |
| TÜRKÇE | 52–71 | 20 cevap konumu |
| MATEMATİK | 72–91 | 20 cevap konumu |
| FEN | 92–111 | 20 cevap konumu |
| SOSYAL | 112–131 | 20 cevap konumu |
| İNGİLİZCE | 132–151 | 20 cevap konumu |
| DİN | 152–171 | BLDM'deki DIN KULT, 20 cevap konumu |

120 okuma konumu, sınavın 120 soruluk olduğu anlamına gelmez. Derslerin gerçek soru sayısı cevap anahtarından alınır. Kullanılmayan kuyrukta işaret varsa mevcut parser reddeder. Katsayı dosyada yoktur; uydurulmaz. A/B soru eşleştirmesi FMT'den türetilmez, cevap anahtarından gelir.

## Gerçek tek oturum örneğinin sınırı

Gönderilen tek oturum TXT'sinde 28. karakter **boş**. Dosya yapısı ve ders blokları tek oturum tanımıyla uyumlu bulundu; otomatik tahmin **olası Özdebir** önerisi verir. Aynı gerçek dosyanın değerlendirmesi, kitapçık alanı boş olduğu için **28–28 konumunu açıklayarak reddedilir**. Bu beklenen güvenli davranıştır; yanlış bir A kitapçığı sonucu üretilmedi.

A/B bilgisi bulunan sentetik örneklerde parser, ders konumları, kitapçık eşleştirmesi ve API önizlemesi başarılı. Gerçek öğrenci puanı/karne doğruluğu iddia edilmez: aynı sınavın gerçek cevap anahtarı ve doğru kitapçık bilgisi henüz sağlanmadı. Gerçek anahtarla uçtan uca kabul ayrı adımdır.

## Ayrı sözel/sayısal dosya ve isim hataları

`oz8 (1).txt` tek oturum dosyası değildir. 1/131 ve 2/91 ilişkisi tüm 819 satırda tutarlı. Başlık alanları ilk 51 karakterde aynı konumlarda; cevap bloklarının oturumlara göre alan sırası/gerçek soru sayıları ayrı tanımla doğrulanmalıdır. Bu dosyayı 171'e boşluk ekleyerek veya yalnız prefix'i değiştirerek dönüştürmedik.

Veri kalitesi taramasında dört satırın kitapçığı boş, bir satırın ad alanı tamamen boş. Ham eşleştirme kimliği/numara gruplarında iki oturumda da bulunan 387 grup var; sekizinde ad metni farklı. Bu sayı, doğrulanmış tekil öğrenci sayısı olarak sunulmaz. Kimlik alanlarında da boş/sayısal olmayan örnekler bulunuyor. İsimler benzer diye farklı kayıtlar birleştirilmedi, çelişkiler gizlenmedi, dosyalardan kayıt atılmadı.

Bu ayrı oturumlar şu anda **tek oturum FMT'siyle reddedilir**. Oturum 1/2 kaydını bu şablona zorlamak 131/91 genişliğinde hataya, 171'e yapay uzatılırsa `9` sabit kontrolünde hataya yol açar. Mevcut 7108 oturum birleştirmesi bu Özdebir varyantlarının doğrulanmış desteği olarak gösterilmez.

## Bundan sonra ne gerekir?

- **Tek oturum FMT'sini sisteme eklemek için örnekler yeterli geldi; program adı artık gerekli değil.** Tanım yerelde eklendi.
- Gerçek sınavı değerlendirmek için doğru A/B kitapçık bilgisi ve aynı sınavın cevap anahtarı gerekir. Varsa gerçek katsayı/kazanımlar anahtarla verilebilir; yoksa katsayısız hesap korunur.
- **1/2 ayrı oturumları da desteklemek için** onların FMT/BLDM dosyaları veya ders alanlarının sırasını açıkça gösteren kişisel verisiz boş optik form gerekir. Mevcut tek oturum BLDM'sinin ders sırası ayrı oturumlara varsayımla uygulanmamalı.

## Testler

`tests/ozdebir.test.ts`: sütun ve ders sırası, 9/8 ayrımı, 5/6/7/8 sınıf karakterleri, sentetik A/B dönüşümü, boş/geçersiz kitapçık, boş/çelişen ad, sınıf uyuşmazlığı, 1/2 dosyalarını reddetme, içerikten FMT önerisi, kodda doğrulanmış sistem kaydı ve API önizlemesinin yazma yapmaması.

9 ile başlayan kurum koduna sahip 8050'nin yanlışlıkla Özdebir diye güçlü önerilmemesi için regresyon eklendi. Tahmin, dolu sınıf konumunda sayısal sınıf değeri arar; sınıf alanı boş olan eski örnekler desteklenmeye devam eder. Yalnız `9` öneki değerlendirme başlatmaz. Tek karakterlik prefix, başka bir yerleşim aynı ölçüde uyuyorsa güçlü eşleşme üstünlüğü sağlamaz.

Özgün BLDM indirme/paylaşım bayt testleri korunur. Yeni tanım eklenince mevcut 7108/8050 liste testleri üç şablonu ve pasif kaydın gizlenmesini denetleyecek şekilde güncellendi. Son koşumda **173/173 Node testi başarılı**, başarısız 0. Web production build ve API TypeScript build başarılı; `git diff --check` temiz. Gerçek kaynak TXT'ler test deposuna dahil edilmedi.

Son Node koşumu: 2026-11-12T18:45:40.477Z (UTC), 7.106 saniye. Güncel salt okunur rapor `apps/api/assets/test-center-report.json` içindedir. Önceki kaynak sürümünün ayrı kabul betikleri bu yeni kaynak sürümü için otomatik başarılı sayılmaz.
