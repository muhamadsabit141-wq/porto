# Panduan SEO — Supaya Muncul di Google

## Yang jujur perlu Anda tahu dulu

Tidak ada developer, agency, atau tool manapun yang bisa **menjamin posisi #1** di Google — itu ditentukan algoritma Google berdasarkan popularitas situs, jumlah backlink, seberapa lama situs sudah online, dan seberapa ketat persaingan kata kunci. Yang bisa saya lakukan lewat kode adalah memastikan situsnya **memenuhi semua syarat teknis** supaya Google gampang memahami dan mengindeksnya dengan baik.

Kabar baiknya: kalau orang mencari nama **"Raja Subhan Alpariz"** secara spesifik, kemungkinan besar tidak banyak (atau tidak ada) situs lain yang bersaing untuk nama itu — jadi untuk pencarian nama sendiri, peluang berada di posisi atas realistis tinggi begitu situs terindeks.

## Apa yang sudah saya tambahkan

1. **Meta tags lengkap** di `index.html` — judul, deskripsi, dan tag `robots` yang eksplisit mengizinkan pengindeksan.
2. **Open Graph & Twitter Card** — supaya saat link dibagikan ke WhatsApp/Instagram/LinkedIn, muncul preview judul & deskripsi yang rapi, bukan cuma link polos.
3. **Data terstruktur (JSON-LD Person schema)** — kode khusus yang memberi tahu Google secara eksplisit "ini halaman profil orang bernama X, kuliah di Y, kontaknya Z". Ini **otomatis ikut ter-update** setiap teman Anda mengedit nama/kampus/sosmed lewat admin panel.
4. **`robots.txt`** — mengizinkan Google meng-crawl seluruh situs, kecuali halaman admin.
5. **`sitemap.xml`** — peta situs sederhana yang bisa didaftarkan ke Google Search Console.
6. **`<link rel="canonical">`** — mencegah masalah duplikat jika situs diakses lewat beberapa URL berbeda.

## Yang WAJIB Anda lakukan setelah deploy (di luar kode)

Kode saja tidak cukup — Google harus tahu situsnya *ada* dulu. Ikuti langkah ini:

1. **Ganti semua placeholder URL.** Saya pakai `https://rajasubhanalpariz.vercel.app/` sebagai contoh di `index.html`, `robots.txt`, dan `sitemap.xml`. Setelah situs online, ganti ke URL asli Vercel (atau domain custom kalau ada) di ketiga file itu — cari-ganti semua kemunculan URL tersebut.

2. **Daftarkan ke Google Search Console** (gratis):
   - Buka **https://search.google.com/search-console**
   - Tambahkan property dengan URL situs Anda
   - Verifikasi kepemilikan (biasanya lewat tag HTML atau file verifikasi — Search Console akan memandu)
   - Submit `sitemap.xml` di menu **Sitemaps**
   - Pakai fitur **URL Inspection** → **Request Indexing** supaya Google langsung diberi tahu untuk mengunjungi situsnya, tidak perlu menunggu ditemukan sendiri

3. **Sebar link situsnya** — cantumkan link di bio Instagram/TikTok, tanda tangan email, atau grup organisasi kampus. Setiap tempat yang mengarah ke situs ini membantu Google "menemukan" dan mempercayainya lebih cepat.

4. **Waktu**. Situs baru biasanya butuh beberapa hari sampai beberapa minggu untuk terindeks pertama kali, meskipun sudah didaftarkan manual.

## Batasan teknis yang jujur perlu diketahui

Situs ini memuat sebagian kontennya (nama, deskripsi, kegiatan, dll) lewat JavaScript yang mengambil data dari Supabase **setelah** halaman dimuat — bukan langsung ada di HTML awal. Google modern (Googlebot) umumnya bisa menjalankan JavaScript dan menunggu data selesai dimuat, jadi ini biasanya tidak masalah besar untuk situs kecil seperti ini. Tapi kalau suatu saat Anda ingin SEO yang lebih maksimal lagi (misalnya untuk bersaing di kata kunci yang lebih ramai, bukan cuma nama sendiri), solusi yang lebih kuat adalah render di sisi server (SSR) — itu perubahan arsitektur yang lebih besar, bisa kita bahas lagi kalau memang dibutuhkan nanti.
