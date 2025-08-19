# Deprem Analizi 

Karmaşık sismik verileri anlamlandıran web sitesi. Depremlerin **öncü ve artçı şoklarını zaman ve mekân ilişkisi içinde görselleştirerek**, uzmanların ve araştırmacıların deprem dinamiklerini daha net inceleyebilmesini sağlar. 

## ✨ Özellikler

- **Deprem Noktaları**: Büyüklüğe göre renk ve boyut kodlaması
- **Dosya Yükleme**: Bağımsız KML dosyası yükleme 
- **Animasyon Kontrolü**: Başlat/Durdur, İleri/Geri, Sıfırla, Hız kontrolü (0.5x, 1x, 3x, 9x)
- **Popup Bilgileri**: Her deprem noktasının detaylı bilgileri
- **Dinamik Timeline**: Deprem zamanlarına göre otomatik ayarlanan çizelge



## 🎯 Kullanım

### **1. Varsayılan KML Yükleme**
- Sayfa açıldığında `balikesir_sindirgi_10.08.25` otomatik yüklenir
- Animasyon 1 saniye sonra otomatik başlar

### **2. Kendi KML Dosyanızı Yükleme**
- KML dosyasını [linkten](http://www.koeri.boun.edu.tr/sismo/2/son-depremler/otomatik-cozumler/ "link' ten") tarih ve konum bilgileri girerek elde edebilirsiniz.
- 📁 Dosya yükleme ikonuna tıklayın
- KML dosyasını seçin
- "KML Yükle" butonuna basın

### **3. Animasyon Kontrolü**
- ▶️ **Devam Et**: Animasyonu başlatır
- ⏸️ **Duraklat**: Animasyonu durdurur
- 🔄 **Reset**: Tüm verileri temizler

### **4. Navigasyon**
- ⏮️ **Önceki Konum**: Bir önceki deprem noktasına git
- ⏭️ **Sonraki Konum**: Bir sonraki deprem noktasına git

### **5. Hız Kontrolü**
- **0.5x**: Yavaş animasyon 
- **1x**: Normal hız 
- **3x**: Hızlı animasyon 
- **9x**: Çok hızlı 

## 🎨 Deprem Büyüklüğü Görselleştirme

| Magnitude | Renk | Boyut | Açıklama |
|-----------|------|-------|----------|
| ≥6.0 | 🔴 Kırmızı | 15px | Çok Güçlü |
| ≥5.0 | 🟠 Turuncu | 12px | Güçlü |
| ≥4.0 | 🟡 Sarı | 10px | Orta |
| ≥3.0 | 🟢 Yeşil | 8px | Hafif |
| ≥2.0 | 🔵 Mavi | 6px | Çok Hafif |

## 🛠️ Teknik Detaylar

### **Frontend Teknolojileri**
- **HTML5**: Semantic markup ve modern yapı
- **CSS3**: Grid, Flexbox, CSS Variables, Animations
- **JavaScript ES6+**: Async/await, Modules, Modern syntax

### **Harita ve Görselleştirme**
- **Leaflet.js**: Interaktif harita kütüphanesi
- **OpenStreetMap**: Ücretsiz harita verileri
- **Canvas Rendering**: Performanslı marker çizimi

### **Veri İşleme**
- **KML Parser**: XML parsing ve veri çıkarma
- **Date Handling**: Türkçe tarih formatı
- **Coordinate Validation**: Koordinat sınırları kontrolü

### **Animasyon Sistemi**
- **Timeline Management**: Dinamik zaman çizelgesi
- **Marker Animation**: Smooth giriş/çıkış efektleri
- **Speed Control**: Çoklu hız seçenekleri



## 🐛 Hata Ayıklama

### **Console Logları**
- **🚨 HATA**: Kritik hatalar
- **⚠️ UYARI**: Uyarı mesajları
- **ℹ️ BİLGİ**: Bilgi mesajları

### **LocalStorage Hata Geçmişi**
- Son 50 hata otomatik kaydedilir
- `earthquake_errors` anahtarı altında saklanır


## 📄 Lisans

Bu proje [MIT License](LICENSE) altında lisanslanmıştır.


## 🙏 Teşekkürler

- **Leaflet.js** - Harita kütüphanesi
- **OpenStreetMap** - Harita verileri

---

⭐ **Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!** 