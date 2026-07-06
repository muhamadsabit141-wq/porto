# Update Skema Supabase — Deskripsi Panjang + Galeri Pendidikan & Organisasi

Ini **tambahan** dari skema yang sudah Anda buat sebelumnya (bukan pengganti). Jalankan SQL ini di **SQL Editor** Supabase supaya kolom & tabel baru tersedia untuk fitur "klik untuk lihat detail" yang baru ditambahkan.

```sql
-- ============================================
-- TAMBAH KOLOM "deskripsi_panjang" DI 4 TABEL
-- ============================================
alter table public.pendidikan add column if not exists deskripsi_panjang text;
alter table public.organisasi add column if not exists deskripsi_panjang text;
alter table public.kegiatan add column if not exists deskripsi_panjang text;
alter table public.prestasi add column if not exists deskripsi_panjang text;

-- ============================================
-- TABEL GALERI BARU: pendidikan_media
-- ============================================
create table public.pendidikan_media (
  id bigint generated always as identity primary key,
  pendidikan_id bigint references public.pendidikan(id) on delete cascade,
  media_url text not null,
  media_type text,
  urutan int default 0
);

alter table public.pendidikan_media enable row level security;

create policy "Public read pendidikan_media" on public.pendidikan_media for select using (true);
create policy "Auth write pendidikan_media" on public.pendidikan_media for all to authenticated using (true) with check (true);

-- ============================================
-- TABEL GALERI BARU: organisasi_media
-- ============================================
create table public.organisasi_media (
  id bigint generated always as identity primary key,
  organisasi_id bigint references public.organisasi(id) on delete cascade,
  media_url text not null,
  media_type text,
  urutan int default 0
);

alter table public.organisasi_media enable row level security;

create policy "Public read organisasi_media" on public.organisasi_media for select using (true);
create policy "Auth write organisasi_media" on public.organisasi_media for all to authenticated using (true) with check (true);
```

Jalankan sekali lewat **SQL Editor → New query → Run**. Kalau muncul **Success. No rows returned**, berarti berhasil dan fitur baru (tampilan kartu Pendidikan, klik untuk deskripsi panjang + galeri di Pendidikan/Organisasi/Kegiatan/Prestasi) siap dipakai.

## Apa yang berubah di tampilan?

- **Pendidikan** — sekarang tampil sebagai kartu (mirip Organisasi), bukan garis waktu lagi.
- **Pendidikan & Organisasi** — klik kartu untuk membuka jendela detail berisi deskripsi lengkap + galeri foto/video.
- **Kegiatan** — kartu dibuat lebih ringkas/kecil, klik kartu untuk membuka detail deskripsi lengkap.
- **Prestasi** — tampilan garis waktu tetap sama, sekarang ditambah bisa diklik untuk membuka detail deskripsi lengkap (klik langsung ke foto/video kecil tetap membuka pratinjau zoom seperti biasa).

Di admin panel, setiap section (Pendidikan, Organisasi, Kegiatan, Prestasi) sekarang punya 2 kolom deskripsi:
- **Deskripsi Singkat** — tampil di kartu/daftar (usahakan 1-2 kalimat saja).
- **Deskripsi Lengkap** — tampil saat pengunjung klik kartu tersebut (boleh panjang, beberapa paragraf).

Pendidikan dan Organisasi sekarang juga punya slot **Galeri Gambar/Video** terpisah (Organisasi tetap punya field Logo sendiri untuk ikon kecil di kartu).
