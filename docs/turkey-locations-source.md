# Türkiye konum listesi

Kaynak: [TürkiyeAPI il/ilçe uç noktası](https://api.turkiyeapi.dev/v1/provinces?fields=id,name,districts), [kaynak dokümantasyonu](https://docs.turkiyeapi.dev/tr/v1/guide/districts).
Alınma tarihi: 17 Kasım 2026. 81 il, 973 ilçe; il ve ilçe benzersiz kimlikleri korunur. Yalnız ad ve kimlikler paketlenir; çalışma sırasında dış servise istek yapılmaz.
Ham yanıt SHA-256: `1f0599cb0f2c3051c6b16a8f502fa89c87dfce7f4a76b5d16e3e13cf1584c595`.

TürkiyeAPI resmî devlet servisi değildir. İkinci doğrulama: [İçişleri Türkiye Mülki İdare Bölümleri Envanteri](https://www.e-icisleri.gov.tr/Anasayfa/MulkiIdariBolumleri.aspx). 17 Kasım 2026 tarihinde indirilen resmî sayfanın 81 il adı listeyle eşleşti (Türkçe harf/case normalizasyonu sonrası). Resmî sayfa 922 ilçe bildirir; paketlenmiş listede buna ek 51 Merkez kaydı vardır (973 toplam). İlçe adlarının tamamı resmî envanterden tek tek çekilip karşılaştırılmadı; bu sayım tek başına her ilçe adının bağımsız kanıtı değildir. Liste güncellemesi sayım, benzersiz kimlik ve ebeveyn ilişkisi testlerinden geçirilmelidir. Doğrulama özeti `test-results/v134/location-source-verification.json` yerel kanıtıdır.

Mevcut DB metin kolonları geriye dönük uyumluluk için korunur. Yeni yazımlar sabit listenin kanonik adlarıdır. Salt okunur konum denetimi `scripts/audit-school-locations.ts` ile yapılır. Bu araç kayıtları değiştirmez/birleştirmez; belirsiz ve çakışan kayıtları JSON olarak raporlar. SQL migration gerekmez.
