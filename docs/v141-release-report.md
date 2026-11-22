# KurumsalSınav v1.4.1 — yerel geliştirme ve kabul raporu

22 Kasım 2026, Türkiye saati. **Sürüm kararı: v1.4.1 BLOCKED.** Yerel özellikler uygulanmıştır; bütün koşullu ekranların kabulü, canlı 403 kök nedeni ve güvenlik uyarılarının kapatılması açık kalır. Bu sürüm bütün kapsamıyla READY ilan edilmez.

Canlı deploy, Neon işlemi, üretim migration/seed/reset, servis yeniden başlatma, canlı izin değiştirme, Git commit/push ve otomatik paket yükseltmesi yapılmadı. Harici LLM veya yeni npm bağımlılığı yok.

## 1. Sürüm özeti ve aşamalar

- Başlangıç `main`; takip edilen kullanıcı değişikliği yoktu. Önceden takip edilmeyen `output/pdf/v126`, `v130`, `v132` klasörleri korunur. Regresyon PDF’leri `test-results/regression-pdfs` altında üretildi.
- Mevcut optik/Excel/FMT/PDF, sonuç grant/revizyon ve dışa aktarım altyapıları incelendi. Başlangıç sınıfları aşağıdaki v140 kaynak envanteridir; son durum ayrı sütundadır.
- Öğrenci asistanı, ortak Analizim, kazanım kanıtı ve ihtiyatlı uyarılar; hesapla ve kişisel kodla girişte gerçek servise bağlandı. Veli/admin/bayi asistanı yapılmadı. Hafif karşılama, yayımlanmış kendi özetlerinden kanıtlı rekor/net artışı da gösterir.
- Genel analiz/kalite, anonim PDF, gerekçeli inceleme ve okul çalışma önerileri eklendi. Var olan soru motorundaki çoklu işaret politikasının analizde eksik uygulanması düzeltildi.
- Kompakt cevap kayıtları, aranabilir yayınevi aktarımı, modal ekleme, FMT metadata/katalog önerileri, paylaşım sadeleştirmesi ve Mola Alanı uygulandı.
- İki sayfalık karne cevap/kazanım düzeni bilgi kaybı olmadan yenilendi; mevcut ana sayfa sahneleri ve yardım oynatma geliştirildi. PDF 403 için yerel kanıt ve güvenli canlı kontrol listesi hazırlandı.
- Son aşama: birim/regresyon, yeni localhost DB’de HTTP yetkileri, temsilî Chromium ve PDF görsel QA. Sayılar aşağıdaki teslim kaydıyla kesinleştirilir.

## 2. 82 maddelik kabul tablosu

`MEVCUT`: belirtilen yerel uygulama ve somut kanıt vardır; tüm hosting/cihaz/koşul kabulü anlamına gelmez. `KISMEN MEVCUT`: yazılı eksik/sınır açıktır. `BLOKE`: dış ortam kanıtı gerekir. Başlangıç sütunu v1.4.0 kaynak durumudur.

| No | Madde | v140 başlangıcı | Son durum | Dosya / modül | İşlem, kanıt ve açık sınır |
|---|---|---|---|---|---|
| 01 | Sürüm özeti | EKSİK | MEVCUT | `student-insights.ts`, `student-assistant.ts`, `student-services.ts`, `student-workspace.tsx` | İki öğrenci girişinde ortak çalışma alanı; mobil/iki tema ve gerçek API asistan akışı Chromium ile sınandı. |
| 02 | 82 maddelik kabul tablosu | EKSİK | MEVCUT | `student-insights.ts`, `student-assistant.ts`, `student-services.ts`, `student-workspace.tsx` | 18 genişletilebilir niyet, 126 kaynak ifade ve üretken parametre kuralları. 126 ifadenin tamamı, Türkçe/ASCII, kısaltma ve örnek yanlış yazımlar test edildi; yüzlerce if veya LLM yok. |
| 03 | Test sonuçları | EKSİK | MEVCUT | `student-insights.ts`, `student-assistant.ts`, `student-services.ts`, `student-workspace.tsx` | Sonuç/puan/net/D-Y-B, aynı içerikte min/max, ders/kazanım, karne ve karşılaştırma. Yalnız açık grant ve yayımlanmış/güncel sonuç; farklı zorlukta sayısal kıyas engellenir. |
| 04 | Veritabanı değişiklikleri | EKSİK | MEVCUT | `student-insights.ts`, `student-assistant.ts`, `student-services.ts`, `student-workspace.tsx` | Ders, önceki sınav ve karne bağlamı; sunucu bağlam ID’sini erişilebilir sınavlara karşı doğrular. UI en fazla 12 soru tutar; kalıcı sohbet deposu yok. |
| 05 | Dağıtım notları | EKSİK | MEVCUT | `student-insights.ts`, `student-assistant.ts`, `student-services.ts`, `student-workspace.tsx` | Giriş sonrası tek hafif karşılama isteği; hesap yolunda yalnız metadata SQL, portalda grantsiz kimlik kontrolü. Sürekli öğrenci sonuç polling’i kaldırıldı; odak yenileme korunur. |
| 06 | Sürüm kararı | EKSİK | MEVCUT | `student-welcome.ts`, `student-insights.ts`, öğrenci çalışma alanı | İki girişte en fazla beş yetkili kaydın yalnız kendi özeti okunur; aynı içerik/kuralda önceki kanıt varsa yeni puan rekoru ve anlamlı net artışı gösterilir. Sınıf snapshot’ı istemciye taşınmaz; aynı sonuç bildirimi oturum içinde tekrar edilmez. Gerçek HTTP ve birim testi geçti. |
| 07 | Duyuru Merkezi entegrasyonu | EKSİK | MEVCUT | `student-insights.ts`, `student-assistant.ts`, `student-services.ts`, `student-workspace.tsx` | Mevcut Announcement tabloları, tarih penceresi, ALL/kendi okul/kendi kullanıcı ve yayın kaynağı kontrolleri. Yabancı okul/bayi/öğrenci ve gelecek duyurular gerçek HTTP’de dışlandı. |
| 08 | Akıllı yanıt görünümü | EKSİK | MEVCUT | `student-insights.ts`, `student-assistant.ts`, `student-services.ts`, `student-workspace.tsx` | Sonuç/karne/Analizim eylemleri ve uygun karşılaştırma tablosu; grafikler aynı Analizim verisini kullanır. Yanıt gerçek grant üzerinden açılır. |
| 09 | Güvenlik ve performans | EKSİK | MEVCUT | `student-insights.ts`, `student-assistant.ts`, `student-services.ts`, `student-workspace.tsx` | Harici LLM, API anahtarı, model veya yeni bağımlılık eklenmedi. Öğrenci sorgusu sunucu oturumundan daraltılır; kimlik/bağlam sahteciliği 400/404 alır. |
| 10 | Kapsam sınırı | EKSİK | MEVCUT | `student-insights.ts`, `student-assistant.ts`, `student-services.ts`, `student-workspace.tsx` | STUDENT dışındaki hesaplara asistan API’si 403; veli UI’sinde bulunmadığı Chromium’da doğrulandı. Admin/bayi asistanı yok. |
| 11 | Analizim düğmesi | EKSİK | MEVCUT | `student-insights.ts`, `student-assistant.ts`, `student-services.ts`, `student-workspace.tsx` | Analizim düğmesi ve isteğe bağlı açılan gerçek çalışma alanı, iki öğrenci girişinde sınandı. |
| 12 | Son beş sınav | EKSİK | MEVCUT | `student-insights.ts`, `student-assistant.ts`, `student-services.ts`, `student-workspace.tsx` | En son beş uygun sınav; hesapta son 100 açık bağlantı metadata’sından aday seçilir, yalnız aday grupların snapshot’ı alınır. Aynı sınavın açık oturumları mevcut merge motoruyla birleştirilir. |
| 13 | Öğrenme Açığı Haritası | EKSİK | MEVCUT | `student-insights.ts`, `student-assistant.ts`, `student-services.ts`, `student-workspace.tsx` | Güçlü/tekrarlayan/tekrar/yetersiz ve aynı içerikte gelişen gözlem. Kanıt en az iki sınav/beş ilgili soru; H/X ve eksik oturumdan kazanım uydurulmaz. |
| 14 | Erken Uyarı Sistemi | EKSİK | MEVCUT | `student-insights.ts`, `student-assistant.ts`, `student-services.ts`, `student-workspace.tsx` | Aynı içerik/kuralda net ve boş artışı, üç gözlemde süregelen düşüş; tekrarlayan kazanım zorlanması. Teşhis dili kullanılmaz; yetersiz örneklem açıkça yazılır. |
| 15 | Veri güvenilirliği | EKSİK | MEVCUT | `student-insights.ts`, `student-assistant.ts`, `student-services.ts`, `student-workspace.tsx` | Sınav/soru sayısı, tarih aralığı ve kayıt tarihi anlamı gösterilir. Kazanımın kendi soru/sınav kanıtı ayrıca gösterilir. |
| 16 | Gelişim grafikleri | EKSİK | MEVCUT | `student-insights.ts`, `student-assistant.ts`, `student-services.ts`, `student-workspace.tsx` | Bağımsız genel/ders net çubukları, D-Y-B dağılımı, kazanım oranları ve son beş sınav tablosu. Zorluk eşdeğerliği olmadan çizgisel gelişim iddiası yok. |
| 17 | Asistan entegrasyonu | EKSİK | MEVCUT | `student-insights.ts`, `student-assistant.ts`, `student-services.ts`, `student-workspace.tsx` | Asistan ile Analizim studentInsights/opticalSummary kullanır; ayrı puan veya gelişim motoru oluşturulmadı. |
| 18 | Yanlış yönlendirmeyi önle | EKSİK | MEVCUT | `student-insights.ts`, `student-assistant.ts`, `student-services.ts`, `student-workspace.tsx` | Soru/kural/ölçek imzası farklıysa karşılaştırma ve düşüş çıkarımı yok. Tek sorudan güçlü/zayıf teşhisi üretilmediği birim testinde doğrulandı. |
| 19 | Sınav Genel Analiz Raporu | KISMEN MEVCUT | MEVCUT | `exam-quality.ts`, `exam-analytics-routes.ts`, `exam-analysis-pdf.ts`, `panel/exam-analytics.tsx` | Rapor Al alanı admin/bayi/okul rollerine ve mevcut karne ekranına bağlandı. Okul için kapsamlı kurum seçici gerçek API/Chromium ile doğrulandı. |
| 20 | En zor ve en kolay sorular | KISMEN MEVCUT | MEVCUT | `exam-quality.ts`, `exam-analytics-routes.ts`, `exam-analysis-pdf.ts`, `panel/exam-analytics.tsx` | Mevcut doğru oranına göre en zor/en kolay listeleri; H/X hariç, boşlar paydada. Birim ve gerçek HTTP kanıtı. |
| 21 | Seçenek dağılımları | KISMEN MEVCUT | MEVCUT | `exam-quality.ts`, `exam-analytics-routes.ts`, `exam-analysis-pdf.ts`, `panel/exam-analytics.tsx` | Kanonik A soru sırası, A-E dağılımı, en fazla iki işaretlenen seçenek ve doğru oranı; eşitlikte deterministik sıra. Kitapçık dönüşümü mevcut parseOptical’a aittir. |
| 22 | Yanlış ve boş analizleri | KISMEN MEVCUT | MEVCUT | `exam-quality.ts`, `exam-analytics-routes.ts`, `exam-analysis-pdf.ts`, `panel/exam-analytics.tsx` | En çok yanlış/boş listeleri ve soru D-Y-B değerleri; çoklu işaretin boş politikası eski analize de düzeltildi. |
| 23 | Ders ve kazanım istatistikleri | KISMEN MEVCUT | MEVCUT | `exam-quality.ts`, `exam-analytics-routes.ts`, `exam-analysis-pdf.ts`, `panel/exam-analytics.tsx` | Mevcut ders ve kazanım toplamları kullanılır; tanımsız kazanımlar öneriye dönüştürülmez. |
| 24 | Şüpheli Soru Dedektörü | EKSİK | MEVCUT | `exam-quality.ts`, `exam-analytics-routes.ts`, `exam-analysis-pdf.ts`, `panel/exam-analytics.tsx` | ≥20 yanıtla uç güçlük, baskın çeldirici, yüksek boş ve düşük/negatif düzeltilmiş korelasyon işaretleri. Otomatik hatalı soru kararı yok. |
| 25 | Sınav Kalite Karnesi | EKSİK | MEVCUT | `exam-quality.ts`, `exam-analytics-routes.ts`, `exam-analysis-pdf.ts`, `panel/exam-analytics.tsx` | Güçlük dağılımı, düzeltilmiş madde-toplam korelasyonu ve KR-20; yöntem ve veri yeterliliği UI/PDF’de açıklanır. Sabit varyansta null; negatif değer zorla sıfırlanmaz. |
| 26 | İnceleme geçmişi | EKSİK | MEVCUT | `exam-quality.ts`, `exam-analytics-routes.ts`, `exam-analysis-pdf.ts`, `panel/exam-analytics.tsx` | AuditLog’da kişi/tarih/gerekçe/durum ve anahtar fingerprint’i; Serializable transaction, kurum kapsamı ve stale guard. İnceleme puanı değiştirmez, temizlikten korunur. |
| 27 | Genel analiz PDF'si | EKSİK | MEVCUT | `exam-quality.ts`, `exam-analytics-routes.ts`, `exam-analysis-pdf.ts`, `panel/exam-analytics.tsx` | Türkçe fontlu anonim genel analiz PDF’si; gerçek okul indirmesi ve Poppler görsel kontrolü. Footer’ın ürettiği boş sayfa düzeltildi. |
| 28 | KVKK ve anonimlik | KISMEN MEVCUT | KISMEN MEVCUT | `exam-quality.ts`, `exam-analytics-routes.ts`, `exam-analysis-pdf.ts`, `panel/exam-analytics.tsx` | DTO’da öğrenci adı/numara/bireysel puan/kimlik metadata’sı yok; <5 grup ve küçük tamamlayıcı şube gizlenir. Dış paylaşım için yeniden tanımlama risk değerlendirmesi ayrıca gerekir. |
| 29 | Kitapçık ve soru eşleştirmesi | KISMEN MEVCUT | MEVCUT | `exam-quality.ts`, `exam-analytics-routes.ts`, `exam-analysis-pdf.ts`, `panel/exam-analytics.tsx` | Mevcut A/B/C/D sıralama ve H/X/eksik oturum kuralları korunur; ters B eşleştirmesi ve çoklu işaret testleri başarılı. Karma anahtar yüklemesine kısmi rapor verilmez. |
| 30 | Okul Çalışma Önerileri | EKSİK | MEVCUT | `exam-quality.ts`, `exam-analytics-routes.ts`, `exam-analysis-pdf.ts`, `panel/exam-analytics.tsx` | Rapor Al → Okul Çalışma Önerileri, isteğe bağlı ayrı görünüm ve gerçek API ile bağlı. |
| 31 | Öncelikli tekrar alanları | EKSİK | MEVCUT | `exam-quality.ts`, `exam-analytics-routes.ts`, `exam-analysis-pdf.ts`, `panel/exam-analytics.tsx` | Son beş güncel sınavda en az iki sınav/üç uygun soruyla tekrar eden toplu kazanım zorlanması; tek sınavda öneri üretilmez. |
| 32 | Soru güçlüğünü dikkate alma | EKSİK | MEVCUT | `exam-quality.ts`, `exam-analytics-routes.ts`, `exam-analysis-pdf.ts`, `panel/exam-analytics.tsx` | İnceleme işaretli/aşırı güç sorular dışlanır; kalan uygun soruların başarı oranı yeniden kontrol edilir. Öğretmen/okul başarısızlığı hükmü yok. |
| 33 | Gerekçeli öneriler | EKSİK | MEVCUT | `exam-quality.ts`, `exam-analytics-routes.ts`, `exam-analysis-pdf.ts`, `panel/exam-analytics.tsx` | Öneride sınav ad/ID ve ortak A soru numaraları, kazanım, başarı ve gerekçe bulunur; öğrenci listesi yok. |
| 34 | Okul kapsamı ve gizlilik | KISMEN MEVCUT | MEVCUT | `exam-quality.ts`, `exam-analytics-routes.ts`, `exam-analysis-pdf.ts`, `panel/exam-analytics.tsx` | Her okul seçimi okul/bayi/admin sunucu kapsamıyla AND birleşir; yabancı okul analiz/study/PDF/review denemeleri reddedildi. |
| 35 | Modern karne | KISMEN MEVCUT | MEVCUT | `result-reference-pdf.ts`, mevcut PDF yolları | Nötr ders panelleri ve iki sayfalık şablonda ilk sayfa sonuç hiyerarşisi, ikinci sayfada ders içinde cevap/kazanım düzeni. Eski şablonlar korunur. |
| 36 | Birinci sayfa | KISMEN MEVCUT | MEVCUT | `result-reference-pdf.ts`, mevcut PDF yolları | Kimlik/kurum, puan/net, D-Y-B, ders oranları, ortalamalar ve sıralamalar eski hesaplarla korunur. Katılım/kimlik gizleme seçenekleri değişmedi. |
| 37 | İkinci sayfa | KISMEN MEVCUT | MEVCUT | `result-reference-pdf.ts`, mevcut PDF yolları | İkinci sayfada kaynak kitapçık, soru numarası, anahtar/öğrenci çifti, doğru/yanlış işareti ve tam kazanım/kodlar. Bilinmeyen kitapçık uydurulmaz. |
| 38 | PDF bütünlüğü | KISMEN MEVCUT | MEVCUT | `result-reference-pdf.ts`, mevcut PDF yolları | Özdebir 87 kaynak kazanımı iki A4’te kaldı; aşırı uzun metinler kayıpsız devam eder. Eski sayfa sayısı/bounds/Türkçe testleri ve temsilî görsel QA geçti. |
| 39 | Mevcut karne yetenekleri | MEVCUT | MEVCUT | `result-reference-pdf.ts`, mevcut PDF yolları | Altı karne şablonu, tekli/toplu, katılım/site adresi/logo ve mevcut PDF/Excel yolları korunur; geniş regresyon paketi kullanıldı. |
| 40 | FMT Ekleme Aracı | MEVCUT | MEVCUT | `fmt-bulk.ts`, `fmt-analyze.ts`, `fmt-bulk-upload.tsx`, `fmt-manager.tsx` | Var olan tekli/toplu FMT aracı korundu; en fazla 30 dosyalı kuyruk, satır bazlı hata/başarı ve onay akışı yeniden yazılmadı. |
| 41 | Dosya doğrulama | MEVCUT | MEVCUT | `fmt-bulk.ts`, `fmt-analyze.ts`, `fmt-bulk-upload.tsx`, `fmt-manager.tsx` | Mevcut 64 KB, format, koordinat, yerleşim, gerçek TXT örneği ve doğrulama tokenı kuralları korunur. |
| 42 | Akıllı eşleştirme | KISMEN MEVCUT | MEVCUT | `fmt-bulk.ts`, `fmt-analyze.ts`, `fmt-bulk-upload.tsx`, `fmt-manager.tsx` | Mevcut içerik/yerleşim ve açık dosya adı üzerinden yayınevi/sınıf; mevcut algılayıcıdan kaynak; katalogdan ders kapasitesi uygun sınav adayları önerilir. Sınav cevap eşleşmesi iddia edilmez, FMT sınava bağlanmaz. |
| 43 | Mükerrer kayıt kontrolü | MEVCUT | MEVCUT | `fmt-bulk.ts`, `fmt-analyze.ts`, `fmt-bulk-upload.tsx`, `fmt-manager.tsx` | Mevcut içerik/yerleşim/kapsam tekilleştirmesi korunur. Aynı ad farklı içerik birleştirilmez; belirsiz metadata önerilmediği test edildi. |
| 44 | Önizleme | MEVCUT | KISMEN MEVCUT | `fmt-bulk.ts`, `fmt-analyze.ts`, `fmt-bulk-upload.tsx`, `fmt-manager.tsx` | Öneri alanları taslağa açık eylemle uygulanır; önizleme, düzenleme ve TXT alan onayı korunur. Yeni öneri helper’ı birim testli; bütün FMT modal durumları tarayıcıda yeniden denenmedi. |
| 45 | Onaylı kaydetme | MEVCUT | MEVCUT | `fmt-bulk.ts`, `fmt-analyze.ts`, `fmt-bulk-upload.tsx`, `fmt-manager.tsx` | Kayıt aynı yetkili templates API’sine, mevcut doğrulama ve kullanıcı onayıyla gider. Yeni bağımsız kayıt yolu yok. |
| 46 | Mevcut motoru koru | MEVCUT | MEVCUT | `fmt-bulk.ts`, `fmt-analyze.ts`, `fmt-bulk-upload.tsx`, `fmt-manager.tsx` | FMT tanıma, eşleme ve doğrulama motoru korunur; küçük öneri katmanı mevcut metadata’yı kullanır. |
| 47 | Cevap anahtarı kayıtları | KISMEN MEVCUT | MEVCUT | `answer-key-management.tsx`, `publisher-transfer.tsx`, `publisher-management.tsx`, `styles.css` | Kart grid’i yatay kompakt listeye çevrildi; yönetim/dosya ayrıntıları açılır. Gerçek katalog kaydı ve mobil taşma Chromium’da denendi. |
| 48 | Yayınevini değiştir | MEVCUT | MEVCUT | `answer-key-management.tsx`, `publisher-transfer.tsx`, `publisher-management.tsx`, `styles.css` | Yayınevi değiştir mevcut kayıt ayrıntısında açık isimli; eski önizleme ve onay yolu korunur. |
| 49 | Aranabilir yayınevi seçimi | KISMEN MEVCUT | MEVCUT | `answer-key-management.tsx`, `publisher-transfer.tsx`, `publisher-management.tsx`, `styles.css` | Aranabilir aktif yayınevi listesi, stale expectedPublisher/updatedAt ve eski güvenli önizleme/onay API’si. Arama filtresi Chromium’da denendi. |
| 50 | Yayınevi ekleme penceresi | KISMEN MEVCUT | MEVCUT | `answer-key-management.tsx`, `publisher-transfer.tsx`, `publisher-management.tsx`, `styles.css` | Native dialog, kendi kaydırması, başlık/kapama ve mevcut gerçek form. Açma/kapama Chromium’da doğrulandı. |
| 51 | Dekoratif halka | KISMEN MEVCUT | MEVCUT | `answer-key-management.tsx`, `publisher-transfer.tsx`, `publisher-management.tsx`, `styles.css` | Default kitap kapağındaki halka, mevcut favicon logosunun düşük opaklıkta görünümüne çevrildi; hero güvenlik/marka çizimleri değiştirilmedi. |
| 52 | İşlev kaybını önle | MEVCUT | MEVCUT | `answer-key-management.tsx`, `publisher-transfer.tsx`, `publisher-management.tsx`, `styles.css` | Ekle/düzenle/incele/kazanım/PDF paylaş/indir/yayın/sil kontrolleri kaldırılmadı; yalnız ayrıntıya alındı. Kritik sunucu yolları korunur. |
| 53 | Paylaşım Bağlantıları | MEVCUT | MEVCUT | `share-links.tsx`, `panel/page.tsx`, `styles.css` | Üç tarafsız kategori kartı ve mevcut kompakt paylaşım ayrıntıları; kategori açma gerçek API’yi kullanır. |
| 54 | Gereksiz kategori seçicileri | KISMEN MEVCUT | MEVCUT | `share-links.tsx`, `panel/page.tsx`, `styles.css` | Tekrarlayan kategori select kaldırıldı; tek kart seçimi kalır. |
| 55 | Boş ekran kalabalığı | KISMEN MEVCUT | MEVCUT | `share-links.tsx`, `panel/page.tsx`, `styles.css` | Kategori kapalıyken durum/arama, açıklama ve sayfalama çizilmez; Chromium görünürlük kabulü geçti. |
| 56 | Responsive düzeltmeler | KISMEN MEVCUT | KISMEN MEVCUT | `share-links.tsx`, `panel/page.tsx`, `styles.css` | Öğrenci 1440/390 × iki tema ve temsilî admin mobil kayıtlarında taşma yok. Bütün eski ekran/koşul/tema kombinasyonları yeniden kabul edilmedi. |
| 57 | Renk karmaşası | MEVCUT | MEVCUT | `share-links.tsx`, `panel/page.tsx`, `styles.css` | Yeni kartlar mevcut tema değişkenlerini ve nötr çizgileri kullanır; eski çok renkli kategori düzenine dönülmedi. |
| 58 | Anlamlı durum renkleri | MEVCUT | MEVCUT | `share-links.tsx`, `panel/page.tsx`, `styles.css` | Doğru/yanlış/boş, hata/başarı ve silme anlam renkleri korunur. Yeni anonim rapor uyarıları metinle de açıklanır. |
| 59 | Mola Alanı | MEVCUT | MEVCUT | `share-links.tsx`, `panel/page.tsx`, `styles.css` | Oyunlar aynı IDs/izinler ve motorlarla Mola Alanı menü grubunda toplandı; oyun motorları değiştirilmedi. |
| 60 | Yardım animasyonları | KISMEN MEVCUT | MEVCUT | `help-center.tsx`, `home-demos.tsx`, `use-home-scene.tsx` | Yardım açılışta oynar; duraklat ve tekrar izle gerçek Chromium’da denendi. Reduced-motion ve belge gizlenme korumaları korunur. |
| 61 | Ana sayfa animasyonlarının kapsamlı yenilenmesi | KISMEN MEVCUT | MEVCUT | `help-center.tsx`, `home-demos.tsx`, `use-home-scene.tsx` | Mevcut akademik sahne üç gerçek ürün akışıyla yeniden tasarlandı; inference sahnesine veri akışı haritası, ortak sahne hook’una viewport/pointer tepkileri eklendi. Yeni boş tanıtım bölümü yok. |
| 62 | Fare etkileşimleri | KISMEN MEVCUT | MEVCUT | `help-center.tsx`, `home-demos.tsx`, `use-home-scene.tsx` | Yalnız mouse/visible/hareket açık durumda kontrollü sahne perspektifi; dokunmatik/reduced-motion kısıtları var. |
| 63 | Kaydırma ve veri akışı | KISMEN MEVCUT | MEVCUT | `help-center.tsx`, `home-demos.tsx`, `use-home-scene.tsx` | Mevcut sahnelerde viewport ile sınırlı kaydırma tepkisi ve çizgi/paket akışı; tek görünürlük kontrollü saat kullanılır. |
| 64 | Bölümler arası ferahlık | KISMEN MEVCUT | MEVCUT | `help-center.tsx`, `home-demos.tsx`, `use-home-scene.tsx` | Bölümler arası ölçülü marj; mobilde azaltılır. Büyük yeni boş bölüm eklenmedi. |
| 65 | Yeni özellik tanıtımları | KISMEN MEVCUT | MEVCUT | `help-center.tsx`, `home-demos.tsx`, `use-home-scene.tsx` | Aynı akademik sahnede öğrenci gelişimi, genel analiz ve okul önerisi sekmeleri gerçek özellikleri anlatır; temsilî veriler etiketlidir. |
| 66 | Performans ve erişilebilirlik | KISMEN MEVCUT | KISMEN MEVCUT | `help-center.tsx`, `home-demos.tsx`, `use-home-scene.tsx` | IntersectionObserver, visibilitychange, reduced-motion ve 20 fps sahne boyama sınırı; mobilde perspektif kapalı. Chromium offscreen/reduced-motion kabulü geçti; gerçek düşük güçlü cihaz ölçümü yok. |
| 67 | Tasarım kararı | MEVCUT | MEVCUT | `help-center.tsx`, `home-demos.tsx`, `use-home-scene.tsx` | Aydınlık/karanlık ve profesyonel mevcut kimlik korundu; beyaz-mavi dönüşümlü sahnelere dönülmedi. |
| 68 | PDF araçlarındaki 403 | KISMEN MEVCUT | BLOKE | `pdf-assets-preflight.cjs`, Next public PDF varlıkları | Yerel izin/varlık ve production HTTP 200 doğrulandı. Canlı cPanel/Apache/WAF 403 kök nedeni erişim/log olmadan belirlenemedi; güvenli operatör kontrol listesi ayrı belgede. |
| 69 | PDF araçlarını koru | MEVCUT | MEVCUT | `pdf-assets-preflight.cjs`, Next public PDF varlıkları | Mevcut PDF araç varlıkları ve güvenlik sandbox/CSP’si korunur; statik HTML/CSS/PDF.js uçları yerelde 200. Otomatik soru kesme eklenmedi. |
| 70 | Merkezi dışa aktarım | MEVCUT | MEVCUT | `exports.ts`, `export-core.ts`, `export-center.tsx` | Var olan exports adaptörleri kullanılır; log/anahtar/FMT/yayınevi/ürün/TXT/takvim kapsamı yeniden yazılmadı. Yeni genel analiz PDF’si ayrı yetkili rapor yoludur. |
| 71 | Filtreler, doğruluk ve bütünlük | MEVCUT | MEVCUT | `exports.ts`, `export-core.ts`, `export-center.tsx` | Mevcut türe özel filtre, proof/digest/manifest, özgün dosya ve kurum kuralları korunur. Genel analiz PDF’de bayi canExport gerçek HTTP’de sınandı. |
| 72 | Yedekleme ve Sürüm Kurtarma Merkezi | MEVCUT | MEVCUT | `backup-center.tsx` | BackupCenter hazırlık ekranı korunur; yeni sahte işlem, başarı, yedek veya geri yükleme motoru eklenmedi. |
| 73 | KVKK ve veri güvenliği | MEVCUT | KISMEN MEVCUT | İlgili mevcut modüller ve v141 testleri | Öğrenci/bayi/okul API izolasyonu, no-store, anonim DTO ve özel PDF kontrolleri doğrulandı. Hukuki hazırlık ve bütün kopyalarda nihai silme/üretim denetimi tamamlanmış sayılmaz. |
| 74 | Gerçek öğrenci verisine geçiş | KISMEN MEVCUT | MEVCUT | İlgili mevcut modüller ve v141 testleri | Teknik ve hukuki gerçek veri geçiş kontrol listesi ayrı güvenlik/dağıtım belgesinde. Hukuki uygunluk ilanı yok. |
| 75 | Çalışan özellikleri yeniden yazma | MEVCUT | MEVCUT | İlgili mevcut modüller ve v141 testleri | opticalSummary, parseOptical, mergeStudentData, mevcut PDF, grant, FMT/Excel/anahtar yolları kullanılır. Regresyon sonucu aşağıda; ikinci puan motoru yok. |
| 76 | Kritik işlem güvenliği | MEVCUT | MEVCUT | İlgili mevcut modüller ve v141 testleri | Kritik anahtar/tekrar değerlendirme/silme onayları değiştirilmedi. Yeni incelemede confirm, kapsam/fingerprint ve bayi düzenleme izni de sunucuda zorunlu. |
| 77 | Gereksiz metinler | MEVCUT | MEVCUT | İlgili mevcut modüller ve v141 testleri | Paylaşım tekrarları ve kart kalabalığı azaltıldı; kullanıcıyı yönlendiren kapsam/veri yeterliliği uyarıları korundu. |
| 78 | Performans değerlendirmesi | KISMEN MEVCUT | KISMEN MEVCUT | İlgili mevcut modüller ve v141 testleri | 50/500/5.000 × 90 soru yerel hesaplama ölçümü, beş sınav öğrenci analizi ve gerçek temsilî PDF/HTTP ölçümü var. Büyük DB/çok worker/eşzamanlı toplu PDF kapasitesi ölçülmedi. |
| 79 | Rol ve yetki doğrulaması | MEVCUT | MEVCUT | İlgili mevcut modüller ve v141 testleri | STUDENT/PARENT/DEALER/SCHOOL_ADMIN/SUPER_ADMIN mevcut rolleri; gerçek HTTP ve öğrenci/veli/okul/admin Chromium senaryoları. Toplu rapor öğrenci/veliye açılmaz. |
| 80 | Aşamalı uygulama | MEVCUT | MEVCUT | İlgili mevcut modüller ve v141 testleri | Aşamalar, ilk başarısız denemeler, açık maddeler ve kanıt sınırları bu raporda; eksikler hazır diye işaretlenmedi. |
| 81 | Salt-okunur güvenlik taraması | KISMEN MEVCUT | MEVCUT | `security-scan-v141.cjs`, `next.config.ts`, `config.ts`, npm audit | 663 tracked dosya taraması ve yeni kaynak kontrolü; gerçek npm audit 3 yüksek + 1 orta paket uyarısı. Değerler basılmadı, otomatik yükseltme yapılmadı; ayrı bulgu belgesi var. |
| 82 | Öğrenci ve bayi veri izolasyonu regresyon testi | KISMEN MEVCUT | MEVCUT | `tests/e2e/v141-http.cjs` | Yeni izole ks_v141 PostgreSQL ve sahte hesaplarda beş zorunlu izolasyon senaryosu gerçek HTTP ile geçti; UI gizlemesine veya mock yetkilendirmeye dayanmaz. |

## 3. Test sonuçları ve kanıt sınırları

| Kontrol | Sonuç | Kanıt |
|---|---|---|
| Tüm çevrimdışı regresyonlar | **308/308 GEÇTİ**, atlanan/çalıştırılmayan birim test yok | `npm run test:report`, `apps/api/assets/test-center-report.json` |
| Yeni v141 birim grupları | **16 GEÇTİ**; 126 ifade ayrıca tek grupta tek tek doğrulandı | `tests/v141.test.ts`, `test-results/v141/unit.log` |
| Gerçek localhost HTTP/PostgreSQL | **19 grup GEÇTİ**; beş zorunlu izolasyon senaryosu dahil | `tests/e2e/v141-http.cjs`, `test-results/v141/http-acceptance.json` |
| Chromium production Web | **16 temsilî grup GEÇTİ**, 0 JavaScript sayfa hatası | `tests/e2e/v141-browser.cjs`, `test-results/v141/browser-acceptance.json` |
| API / Web production build | **GEÇTİ**; Node 22.23.5, Next 15.5.28 | `test-results/v141/api-build.log`, `web-build.log` |
| Prisma validate / boş DB zinciri | **GEÇTİ**; 26 mevcut migration yalnız yeni test DB’sine uygulandı | `ks-v141-test`, localhost `55451/ks_v141` |
| PDF metin/sayfa/bounds ve görsel QA | **GEÇTİ**; iki sayfalık 87 kazanım örneği ve anonim genel rapor | `test-results/regression-pdfs/v130/`, `test-results/v141/` |
| Public PDF varlıkları / HTTP | **GEÇTİ**; beyaz listedeki dosyalar mevcut/okunabilir, seçili HTML/CSS/PDF.js uçları 200 | `pdf-assets.json`, Chromium kabulü |
| Sınırlı sır taraması | **GEÇTİ**; 663 tracked dosya ve yeni kaynaklarda aday bulgu yok | `security-scan.json`, `security-scan-all-source.json` |
| Güncel npm audit | **ÇALIŞTIRILDI — UYARI VAR**: 3 yüksek / 1 orta paket kaydı | `npm-audit.json`; ayrıntı güvenlik belgesinde |
| Git whitespace / kaynak özeti | **GEÇTİ**; Test Merkezi son kaynak digest’iyle eşleşir | `git diff --check`, `test-results/v141-acceptance.json` |
| Önceki sürümlerin ayrı HTTP/browser betikleri | **ÇALIŞTIRILMADI**; eski sonuçlar bu sürüme taşınmadı | Test Merkezi bu betikleri `not_run` bırakır |
| Canlı 403, cPanel/Neon/TLS/proxy, gerçek düşük güçlü cihaz, dağıtık yük/geri yükleme | **BLOKE / ÇALIŞTIRILMADI** | Canlıya test veya işlem yapılmadı |

82. maddenin beş zorunlu kontrolü: Öğrenci A → B özel sonuç **GEÇTİ**; A → B karne PDF **GEÇTİ**; Bayi A → B özel sonuç/analiz **GEÇTİ**; okul → yabancı kurum analiz/PDF/review/study **GEÇTİ**; öğrenci/kimliksiz kullanıcı → toplu rapor **GEÇTİ**. Ek olarak kişisel kod izolasyonu, yayın kaldırma, mantıksal silme, eski kod oturumu, asistan bağlam sahteciliği ve bayi indirme/düzenleme izinleri sınandı. Bunlar gerçek Express yetkilendirmesi ve PostgreSQL kayıtları kullanır.

İlk denemeler ve düzeltmeler:

- Birim testinde desteklenmeyen ders takibi eski karne bağlamını sürdürüyordu; olmayan derse yanıt/eylem üretilmemesi düzeltildi. Bir TXT test satırındaki fazladan boşluk da fixture’da düzeltildi.
- İlk tam pakette **298/304**, altı hata vardı. İki sayfalık düzenin üç sayfaya çıkması, küçük grup gizlemesine ilişkin eski API beklentisi ve yenilenmemiş yardım envanteri tespit edildi. Bilgi silmeden ders içi cevap şeritleriyle iki sayfa korundu; yalnız gizlilik sözleşmesinin değişen eski test beklentisi güncellendi. Son paket 308/308’dir.
- İlk PDF footer’ı otomatik boş sayfa açıyordu; güvenli alt konuma alındı. Anonim rapor artık gerçek içerikli iki sayfa; 10 soruluk kabul örneği görsel incelendi.
- İlk gerçek DB fixture’larında şemada bulunmayan `createdById` alanları vardı; yalnız test fixture’ları düzeltildi. Testler tekrar çalıştırılabilir benzersiz adlar kullanır; önceki sentetik kayıtlar silinmedi.
- Tarayıcıda okulun eski `/api/schools` listesine erişemediği görüldü. Yeni analiz listesinin rol kapsamı kendi endpoint’inde doğrulandı. Test seçicileri ve kendi API/Web süreçlerini birlikte açıp kapatan koşucu da düzeltildi.
- Karşılama geliştirmesi 16. yeni birim grubu ve 19. gerçek HTTP grubu ile doğrulandı. Genel asistan POST’u salt okunur sorgudur; kalıcı mutasyon audit’i üretmez. İnceleme kaydı ve reddedilen kritik işlem audit’i korunur. HTTP koşucusu son güvenlik audit’ini görmeden Prisma bağlantısını kapatmaz.

## 4. Performans ve çalışma sınırları

Son sentetik tek süreç ölçümü: 50/500/5.000 öğrenci × 90 soru. Mevcut puan hesabı yaklaşık **2,0 / 6,8 / 44,3 ms**; genel analiz **12,4 / 13,4 / 80,5 ms**; beş sınavlık öğrenci hesaplama bölümü **2,2 / 0,9 / 1,2 ms**. Son süreç RSS gözlemi yaklaşık **116 MB**; anonim analiz JSON’u yaklaşık **78 KB**. Kesin değerler `test-results/v141/performance.json` içindedir. Tek koşum ve JIT etkileri vardır; ilk/son sürelerin doğrusal hızlanma iddiası yoktur.

Bu ölçüm DB’den JSON aktarımı, çoklu Passenger worker, ağ, eşzamanlı öğrenciler veya binlerce PDF üretimini içermez. Birkaç gerçek PDF üretildi; yüzlerce aynı karne oluşturulmadı. Gerçek toplu PDF/ZIP kapasitesi için önceki raporların açık sınırları sürer.

Karşılama en fazla beş kayıt için DB içinde öğrencinin kendi satır/özetini ayırır; tüm sınıf JSON’u uygulamaya taşınmaz, puan yeniden hesaplanmaz. Kimlik doğrulaması kişisel kod yolunda grant identityKey ile de korunur. Bu sorgunun binlerce eşzamanlı giriş kapasitesi ölçülmedi.

Yeni genel analiz: kurum kapsamı doğrulandıktan sonra DB’de kaynak öğrenci sayısı kontrol edilir; en fazla 5.000 kaynak kayıt/100 yükleme, worker başına iki etkin iş ve kullanıcı başına bir iş sınırı vardır. Dağıtık kuyruk değildir. Okul listesi 1.000, sınav adayları 100 kayıtla sınırlıdır. Hesap öğrenci analizi son 100 açık grant metadata’sından en fazla beş sınav seçer; kişisel kod yolunda mevcut grant/revizyon çözümleme korunur, çok uzun grant zincirleri için kalıcı özet indeksleri ayrı iştir. Sınavlar arası kesin zorluk eşdeğerliği veya üretim kapasitesi uydurulmadı.

## 5. Veritabanı ve geriye uyumluluk

Yeni Prisma şeması veya migration **yok**. Boş `ks-v141-test` PostgreSQL 16 konteynerinde mevcut 26 migration uygulandı. Production DB kullanılmadı. İnceleme kararları mevcut AuditLog’a eklenir; `EXAM_QUESTION_REVIEW` hem uygulama hem SQL saklama politikasında temizleme dışında tutulur. Karar mevcut puanı/anahtarı değiştirmez; kurum, sınav ve fingerprint ile ayrılır.

Mevcut öğrenci grant’leri, eski PDF şablonları, FMT/TXT dosyaları, Excel ilk dokuz kolon/çapraz/kazanım ve kritik onay yolları korunur. İki sayfalık şablonun görsel yerleşimi değişir; aşırı uzun metin için sayfa eklenir, içerik kırpılmaz. Genel soru analizi API’sinde küçük gruplar artık `suppressed: true`, boş ayrıntılar ve `studentCount: null` alır; mevcut UI bu durumu açıkça gösterir. Başka bir istemci varsa bu yeni gizlilik durumunu ele almalıdır.

## 6. Güvenlik, dağıtım ve açık işler

Ayrıntılı bulgu, PDF 403 operatör adımları ve gerçek öğrenci verisine geçiş kontrol listesi: [v141 güvenlik ve dağıtım incelemesi](v141-security-and-deployment.md).

Otomatik paket yükseltmeme talimatı nedeniyle npm uyarıları kapatılmadı. Bu uyarılar dört paket kaydıdır; üç yüksek kaydın aynı effect/Prisma zincirinden türediği açıklanmıştır. Yerel sır taramasının temizliği mutlak güvenlik veya KVKK uygunluğu iddiası değildir.

Dağıtım öncesi: mevcut yedek/anahtarlar güvenceye alınmalı, bağımlılık düzeltmeleri ayrı kontrollü değişiklikte ve staging’de doğrulanmalı, Web gerçek HTTPS API adresiyle yeniden derlenmeli, cPanel public varlık/proxy/izin kontrolleri yapılmalıdır. Bu oturumun Web build’i `http://localhost:4021` içindir; canlıya doğrudan kopyalanmaz. Yeni migration yok; eski sürümden kalan migration’lar varsa yalnız onaylı dağıtım prosedürü uygulanır.

`test-results/` dağıtım veya Git içeriği değildir. Özellikle `ui-seed.json` sentetik erişim tokenları/kodları içerir; paylaşılmaz. Sırlar `.env` veya Git geçmişine yazılmadı. Otomatik duyuru yayımlanmadı. Yedekleme Merkezi hazırlık sayfasıdır; gerçek yedek/geri yükleme kabulü verilmez.

Sürüm kararı **v1.4.1 BLOCKED**: mevcut güvenlik uyarıları, kapsamlı koşul/cihaz kabulündeki açıklar kapanmadan tüm 82 madde için eksiksiz READY denmez. Güvenli yerel uygulama ve yukarıdaki temsilî kabul tamamlandı; canlıya geçiş yapılmadı.

## 7. Teslim kaydı

Son kaynak özetiyle 308 birim/regresyon, 19 gerçek HTTP ve 16 Chromium grubu eşleşir; derlenmiş API Test Merkezi varlığı güncellendi. Görsel olarak anonim genel PDF, 87 kazanımlı ikinci karne sayfası, öğrenci mobil/masaüstü ve kompakt mobil cevap kayıtları incelendi. Tüm olası ekranların görsel kabul edildiği iddia edilmez.

İş sonunda koşucunun 4021 API / 3121 Web portları kapalıdır; yalnız bu oturumun `ks-v141-test` konteyneri durduruldu. Sentetik DB/dosyalar, test kanıtları ve kullanıcının önceki PDF klasörleri silinmedi. Önceki konteynerler ve canlı servisler değiştirilmedi.
