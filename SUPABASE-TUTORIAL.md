# Tutorial Supabase — Portfolio Raja Subhan Alpariz (v2)

Versi ini beda dari sebelumnya: sudah pakai **Supabase Auth beneran** (bukan password hardcoded), ada tabel baru (Pendidikan, Organisasi), dan galeri multi-foto/video untuk Kegiatan & Prestasi. Ikuti dari atas, jangan lompat.

> Kalau sebelumnya Anda sudah pernah bikin tabel versi lama (profile/kegiatan/prestasi/sosmed sederhana), **hapus dulu tabel-tabel lama itu** lalu ikuti skema baru di bawah — supaya tidak bentrok kolom.

---

## Langkah 1 — Project & Kredensial (lewati kalau sudah pernah)

1. **https://supabase.com** → login → project Anda sudah ada (dari setup sebelumnya).
2. **Settings → API** → catat **Project URL** dan **anon public key**.
3. Kredensial ini **sudah saya pasang** di `script.js` dan `admin.js` sesuai yang Anda kirim sebelumnya. Kalau Anda ganti project, update lagi baris ini di kedua file:
   ```js
   const SUPABASE_URL = "https://xxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJ...";
   ```

---

## Langkah 2 — Hapus Tabel Lama (kalau ada) & Buat Skema Baru

Buka **SQL Editor** → **New query** → paste semua ini → **Run**:

```sql
-- ============================================
-- BERSIHKAN TABEL LAMA (aman dijalankan meski belum ada)
-- ============================================
drop table if exists public.kegiatan_media cascade;
drop table if exists public.prestasi_media cascade;
drop table if exists public.kegiatan cascade;
drop table if exists public.prestasi cascade;
drop table if exists public.organisasi cascade;
drop table if exists public.pendidikan cascade;
drop table if exists public.profile cascade;
drop table if exists public.sosmed cascade;

-- ============================================
-- TABEL: profile
-- ============================================
create table public.profile (
  id bigint generated always as identity primary key,
  nama text,
  kampus text,
  jurusan text,
  tagline text,
  deskripsi text,
  foto_url text
);

-- ============================================
-- TABEL: pendidikan
-- ============================================
create table public.pendidikan (
  id bigint generated always as identity primary key,
  institusi text not null,
  jenjang text,
  tahun_mulai text,
  tahun_selesai text,
  deskripsi text,
  urutan int default 0
);

-- ============================================
-- TABEL: organisasi
-- ============================================
create table public.organisasi (
  id bigint generated always as identity primary key,
  nama_organisasi text not null,
  jabatan text,
  periode text,
  deskripsi text,
  logo_url text,
  urutan int default 0
);

-- ============================================
-- TABEL: kegiatan + galeri (kegiatan_media)
-- ============================================
create table public.kegiatan (
  id bigint generated always as identity primary key,
  judul text not null,
  kategori text,
  deskripsi text,
  urutan int default 0,
  created_at timestamptz default now()
);

create table public.kegiatan_media (
  id bigint generated always as identity primary key,
  kegiatan_id bigint references public.kegiatan(id) on delete cascade,
  media_url text not null,
  media_type text,
  urutan int default 0
);

-- ============================================
-- TABEL: prestasi + galeri (prestasi_media)
-- ============================================
create table public.prestasi (
  id bigint generated always as identity primary key,
  nama text not null,
  tahun text,
  deskripsi text,
  urutan int default 0
);

create table public.prestasi_media (
  id bigint generated always as identity primary key,
  prestasi_id bigint references public.prestasi(id) on delete cascade,
  media_url text not null,
  media_type text,
  urutan int default 0
);

-- ============================================
-- TABEL: sosmed
-- ============================================
create table public.sosmed (
  id bigint generated always as identity primary key,
  tiktok text,
  instagram text,
  email text,
  file_url text
);

-- ============================================
-- AKTIFKAN ROW LEVEL SECURITY
-- ============================================
alter table public.profile enable row level security;
alter table public.pendidikan enable row level security;
alter table public.organisasi enable row level security;
alter table public.kegiatan enable row level security;
alter table public.kegiatan_media enable row level security;
alter table public.prestasi enable row level security;
alter table public.prestasi_media enable row level security;
alter table public.sosmed enable row level security;

-- ============================================
-- POLICY: SEMUA ORANG BOLEH MEMBACA (untuk index.html)
-- ============================================
create policy "Public read profile" on public.profile for select using (true);
create policy "Public read pendidikan" on public.pendidikan for select using (true);
create policy "Public read organisasi" on public.organisasi for select using (true);
create policy "Public read kegiatan" on public.kegiatan for select using (true);
create policy "Public read kegiatan_media" on public.kegiatan_media for select using (true);
create policy "Public read prestasi" on public.prestasi for select using (true);
create policy "Public read prestasi_media" on public.prestasi_media for select using (true);
create policy "Public read sosmed" on public.sosmed for select using (true);

-- ============================================
-- POLICY: HANYA ADMIN YANG SUDAH LOGIN (authenticated) BOLEH UBAH DATA
-- Ini yang membuat admin panel jauh lebih aman dari sebelumnya.
-- ============================================
create policy "Auth write profile" on public.profile for all to authenticated using (true) with check (true);
create policy "Auth write pendidikan" on public.pendidikan for all to authenticated using (true) with check (true);
create policy "Auth write organisasi" on public.organisasi for all to authenticated using (true) with check (true);
create policy "Auth write kegiatan" on public.kegiatan for all to authenticated using (true) with check (true);
create policy "Auth write kegiatan_media" on public.kegiatan_media for all to authenticated using (true) with check (true);
create policy "Auth write prestasi" on public.prestasi for all to authenticated using (true) with check (true);
create policy "Auth write prestasi_media" on public.prestasi_media for all to authenticated using (true) with check (true);
create policy "Auth write sosmed" on public.sosmed for all to authenticated using (true) with check (true);
```

Kalau muncul **Success. No rows returned**, berarti berhasil.

---

## Langkah 3 — Buat Akun Admin (Supabase Auth)

Ini menggantikan username/password hardcoded lama.

1. Sidebar kiri → **Authentication** → tab **Users**.
2. Klik **Add user** → **Create new user**.
3. Isi:
   - **Email**: email teman Anda, misalnya `rajasubhan@email.com`
   - **Password**: buat password kuat
   - Aktifkan **Auto Confirm User** (supaya tidak perlu verifikasi email dulu).
4. Klik **Create user**.
5. Ini email & password yang dipakai login di `admin.html` — **bukan lagi** `admin` / `rsa-admin-2026`.

> Mau tambah admin kedua (misalnya Anda sendiri juga pegang akses)? Ulangi langkah di atas dengan email berbeda.

---

## Langkah 4 — Storage Bucket & Policy (kalau belum pernah dibuat)

1. **Storage** → **New bucket** → nama: `portfolio-media` → aktifkan **Public bucket** → **Create bucket**.
2. Buka **SQL Editor**, jalankan ini supaya upload/hapus file hanya bisa dilakukan admin yang sudah login:

```sql
-- Hapus policy lama kalau pernah dibuat dengan nama sama
drop policy if exists "Public upload media" on storage.objects;
drop policy if exists "Public read media" on storage.objects;
drop policy if exists "Public update media" on storage.objects;
drop policy if exists "Public delete media" on storage.objects;

-- Siapa saja boleh MELIHAT file (supaya foto/video tampil di index.html)
create policy "Public read media"
on storage.objects for select
to public
using (bucket_id = 'portfolio-media');

-- Hanya admin yang login boleh UPLOAD / UPDATE / HAPUS file
create policy "Auth upload media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'portfolio-media');

create policy "Auth update media"
on storage.objects for update
to authenticated
using (bucket_id = 'portfolio-media');

create policy "Auth delete media"
on storage.objects for delete
to authenticated
using (bucket_id = 'portfolio-media');
```

---

## Langkah 5 — Login ke Admin Panel

1. Buka `admin.html`.
2. Masukkan **email & password** yang dibuat di Langkah 3 (bukan lagi username/password statis).
3. Setelah masuk, semua fitur tersedia lewat tab:
   - **Profil** — nama, kampus, jurusan, tagline, deskripsi, foto
   - **Pendidikan** — tambah riwayat pendidikan, atur urutan pakai tombol panah
   - **Organisasi** — nama organisasi, jabatan, periode, logo, atur urutan
   - **Kegiatan** — judul, kategori, deskripsi, **galeri banyak foto/video**, atur urutan
   - **Prestasi** — sama seperti Kegiatan
   - **Sosmed & Kontak** — TikTok, Instagram, email, upload CV/dokumen

### Catatan tentang galeri & urutan
- Tombol **panah atas/bawah** di setiap daftar mengubah urutan tampil di halaman publik.
- Di form Kegiatan/Prestasi, klik **+ Tambah** untuk pilih beberapa foto/video sekaligus — semua akan tampil sebagai galeri, bisa diklik pengunjung untuk memperbesar (lightbox).
- Menghapus item (foto/kegiatan/prestasi) menghapus datanya dari database, tapi file yang sudah terlanjur ter-upload ke Storage tidak otomatis terhapus (ini simplifikasi supaya kode tetap ringan). Sesekali cek folder di **Storage → portfolio-media** dan bersihkan manual kalau perlu.

---

## Langkah 6 — Kenapa Ini Lebih Aman dari Versi Sebelumnya?

Versi lama: admin.html dilindungi username/password yang **ditulis langsung di kode JavaScript** — siapa pun yang buka DevTools browser bisa membacanya.

Versi ini: login memakai **Supabase Auth** — password tidak pernah ada di kode sama sekali, diverifikasi langsung oleh server Supabase, dan RLS memastikan hanya user yang benar-benar login (`authenticated`) yang bisa insert/update/delete data — bukan cuma "yang tahu password di JS".

Yang tetap perlu diingat: siapa pun yang tahu URL `admin.html` tetap bisa **melihat halaman login-nya**, tapi tidak bisa masuk tanpa email+password yang valid. Kalau mau menyembunyikan keberadaan halaman ini sepenuhnya dari orang iseng, Anda bisa:
- Ganti nama file dari `admin.html` ke sesuatu yang tidak mudah ditebak (mis. `panel-rsa-2026.html`) sebelum di-deploy.
- Tambahkan file `robots.txt` yang men-disallow folder admin dari mesin pencari (halaman ini sudah diberi tag `<meta name="robots" content="noindex, nofollow">` supaya tidak muncul di hasil pencarian Google).

---

## Langkah 7 — Deploy ke GitHub & Vercel

Sama seperti sebelumnya:
1. Upload kelima file ke repository GitHub.
2. Vercel → **Add New Project** → pilih repo → Framework: **Other** → **Deploy**.

---

## Troubleshooting

| Gejala | Kemungkinan Penyebab |
|---|---|
| Login gagal terus padahal email/password benar | Pastikan user dibuat dengan **Auto Confirm User** aktif, atau cek email konfirmasi |
| Data tampil di admin tapi tidak update di index.html | Hard refresh (Ctrl+Shift+R), cek RLS policy SELECT sudah dibuat |
| Admin bisa login tapi gagal simpan data | Cek policy `for all to authenticated` sudah dijalankan untuk tabel terkait |
| Upload gambar/video gagal | Cek bucket `portfolio-media` sudah public + policy Storage authenticated sudah dibuat |
| Galeri kegiatan/prestasi tidak muncul di publik | Cek relasi foreign key `kegiatan_media.kegiatan_id` / `prestasi_media.prestasi_id` sudah benar mengacu ke tabel induk |

Kirim pesan error dari console browser (klik kanan → Inspect → Console) kalau masih macet, saya bantu langsung.
