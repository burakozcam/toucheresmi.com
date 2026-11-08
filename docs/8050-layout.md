# Palme Ortaokul 8050

Hazır yerleşim, kullanıcı tarafından sağlanan **PALME ORTAOKUL OPTİK 8050.fmt** ile 19 satırlık, her satırı 171 karakter olan 6. sınıf TXT örneği karşılaştırılarak tanımlandı. FMT'nin özgün baytları hazır şablonda korunur; öğrenci verisi içeren gerçek TXT depoya eklenmedi. Test dosyası anonimleştirilmiştir.

6. sınıf örneği format yerleşimini doğrulamak içindir; cevap anahtarı olmadan sınav değerlendirmesi yapılmadı. Sınavdaki gerçek soru sayısını ve cevapları ilgili sınıf/sınavın anahtarı belirler. Hazır tanım gönderilen **Palme Ortaokul 8050** içindir; yalnızca dosya adında 8050 yazması başka bir TXT'nin aynı yerleşimde olduğunu garanti etmez.

## Kullanım

1. Admin: **FMT Yükle → 8050 yerleşimini kullan → FMT şablonunu kaydet**.
2. Verilen FMT dosyası dosya seçicisinden yüklendiğinde de tam içerik eşleşmesiyle yerleşim tanınır. Yalnızca dosya adına bakılmaz.
3. Bayi: **TXT Dönüştür** ekranında kaynak 7108, hedef **PALME ORTAOKUL OPTİK 8050** seçilir; kontrol raporundan sonra TXT indirilir.
4. Aynı kayıt **FMT İndir** ekranında özgün `.fmt` dosyası olarak indirilebilir. Tanımlı 8050, değerlendirme ekranında da kaynak FMT olarak seçilebilir.

Hazır şablon projeye eklenmiştir; mevcut üretim veritabanına otomatik kayıt/deployment yapılmaz. Yeni SQL migration'ı gerekmez; adminin şablonu kaydetmesi gerekir.

## Doğrulanan TXT konumları

Konumlar 1 tabanlıdır. 8050'de başta `8050` sabiti yoktur: ilk sekiz karakter kurum kodudur. Ad ve soyad tek alandadır. Her ders için 20 karakterlik kapasite ayrılır.

| Alan | Başlangıç | Uzunluk |
| --- | ---: | ---: |
| Kurum kodu | 1 | 8 |
| Öğrenci numarası | 9 | 6 |
| Sınıf | 15 | 1 |
| Şube | 16 | 1 |
| Ad soyad | 17 | 20 |
| Kitapçık | 37 | 1 |
| TC | 38 | 11 |
| Türkçe | 49 | 20 |
| Sosyal | 69 | 20 |
| Din | 89 | 20 |
| İngilizce | 109 | 20 |
| Matematik | 129 | 20 |
| Fen | 149 | 20 |
| Sınav numarası | 169 | 1 |
| Cinsiyet | 170 | 1 |
| Oturum | 171 | 1 |

## Dönüşüm ve kontrol

7108 → 8050 dönüşümünde ad/soyad tek alanda birleştirilir; numara, sınıf, şube, TC, kitapçık, cinsiyet, oturum ve ders cevapları ilgili konumlara taşınır. Öğrenci numarasına yeni sıfır eklenmez; mevcut sıfırlar korunur. Kaynak 7108 sabit kodu hedef kurum koduna yazılmaz. Satırlar birleştirilmez veya atlanmaz.

20 karakteri aşan birleşik ad/soyad kesilmez; hata gösterilir. Ters yönde de aynı kapasite denetimleri uygulanır: altı haneli öğrenci numarası beş haneli alana sığmıyorsa veya tek ad/soyad alanı ayrı ad alanına sığmıyorsa çıktı engellenir; soyad tahmini ya da sıfır silme yapılmaz.

Gönderilen örneğin **9. satırında öğrenci numarası ve TC birlikte boş**. Dönüşüm kontrolü bu satırı hata olarak raporlar; numara üretmez veya satırı atlamaz. Üç satırda sınıf, bazı satırlarda numara/TC tek başına boş olduğundan bu alanlar da kullanıcı tarafından gözden geçirilmelidir. Diğer 18 satırın yerleşim kontrolü, satırlar değiştirilmeden geçti.

## Doğrulama

70 test; backend/frontend yerleşim eşitliği, tüm 171 karakterin tanımlanması, 19 satırlık örnekte hatalı satırın korunması, 7108 → 8050 alan/soru taşıma, baştaki sıfırlar, sınıf 8 kaydının aynı 8050 yerleşimine dönüşmesi, sınav numarası kayıp kontrolü ve özgün FMT baytları dahil.

Yerel tarayıcıda gerçek API/multipart akışı ve taklit Prisma kayıtlarıyla admin hazır şablon kaydı, yüklenen gerçek FMT'nin tanınması, 7108 → 8050 TXT indirme, hatalı 9. satırda indirme engeli ve FMT'nin özgün dosyayla bayt eşitliği kontrol edilir. Bu doğrulama canlı PostgreSQL migration/deployment işlemi değildir.
