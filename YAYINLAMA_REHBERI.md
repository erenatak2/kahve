# 🚀 SigortaOS Yayınlama ve Güncelleme Rehberi

Bu rehber, projenizde yaptığınız değişikliklerin hem veritabanına hem de canlı siteye (**kahvecoffe.com**) nasıl güvenli bir şekilde aktarılacağını adım adım açıklar.

## 🧱 1. Veritabanı Değişiklikleri (Prisma)

Eğer `prisma/schema.prisma` dosyasında bir değişiklik (yeni tablo ekleme, alan değiştirme vb.) yaptıysanız şu adımları izlemelisiniz:

1.  **Şemayı Güncelleme:** Dosyayı kaydedin.
2.  **Client Üretme:** `npx prisma generate` komutunu çalıştırın.
    > [!IMPORTANT]
    > **Windows Notu:** Eğer `npm run dev` komutu çalışıyorsa, dosyalar kilitli olduğu için bu komut hata verebilir. Önce sunucuyu durdurun, komutu çalıştırın ve sonra sunucuyu tekrar açın.
3.  **Yerel Test:** Değişikliklerin yerel ortamda çalıştığından emin olun.

---

## 💻 2. Kod Değişiklikleri ve Geliştirme

Tüm yeni özellikler (sayfalar, API'lar, görsel düzenlemeler) tamamlandıktan sonra:
- Gereksiz `console.log` çıktılarını temizleyin.
- Sayfaların responsive (mobil uyumlu) olup olmadığını kontrol olun.

---

## 📤 3. Canlıya Yayınlama Süreci (Git)

Değişiklikleri sunucuya göndermek için terminalde sırasıyla şu komutları kullanıyoruz:

### Adım A: Değişiklikleri Hazırlama
Tüm yeni ve değiştirilmiş dosyaları paketlemek için:
```powershell
git add .
```

### Adım B: Paketleme (Commit)
Yaptığınız işi kısa bir mesajla etiketleyin:
```powershell
git commit -m "Örn: Kontaklar modülü eklendi ve UI iyileştirildi"
```

### Adım C: Yayına Gönderim (Push)
Kodları ana sunucuya (GitHub) gönderin:
```powershell
git push origin main
```

---

## ⚙️ 4. Otomatik Dağıtım (CI/CD) Nasıl Çalışır?

`git push` komutunu çalıştırdığınız anda şu işlemler otomatik olarak başlar:

1.  **GitHub tetiklenir:** Kodlar sunucuya ulaşır.
2.  **Vercel / Build Sunucusu devreye girer:**
    - `package.json` dosyasındaki `build` betiği çalışır: `"prisma db push && next build"`
    - **prisma db push:** Canlı veritabanınızı otomatik olarak günceller (Verileriniz kaybolmadan yeni tablolar eklenir).
    - **next build:** Uygulamanızın canlı versiyonunu derler.
3.  **Yayın Tamamlanır:** 1-3 dakika içinde değişiklikler siteye yansır.

---

## 🛠 5. Sık Karşılaşılan Sorunlar ve Çözümler

> [!WARNING]
> **EPERM: operation not permitted:** 
> Bu hata Prisma'nın dosyaları güncelleyemediğini gösterir. Genellikle `npm run dev` açık olduğu için oluşur. Çözüm: Terminali kapatın/durdurun ve komutu tekrar deneyin.

> [!TIP]
> **Siteye Gelmedi mi?**:
> Eğer GitHub'a push yapmanıza rağmen değişiklikler görünmüyorsa, internet tarayıcınızın önbelleğini (Cache) temizleyip sayfayı yenileyin.

---

*Bu rehber projenizin sürdürülebilirliği için hazırlanmıştır.*
