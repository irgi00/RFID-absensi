# Plan Pengembangan — Sistem Absensi Mahasiswa RFID Berbasis Web

## 1. Ringkasan Proyek

Membangun sistem absensi mahasiswa berbasis kartu RFID yang terhubung ke web.

Mahasiswa menempelkan kartu RFID ke reader RC522. NodeMCU ESP8266 membaca UID kartu dan mengirimkannya melalui internet ke API Next.js. Server memvalidasi mahasiswa, perangkat/ruang, jadwal kuliah aktif, serta batas waktu absensi. Hasilnya disimpan di Neon PostgreSQL dan ditampilkan pada dashboard admin.

Sistem dirancang agar dapat dikembangkan dan di-deploy tanpa harus memindahkan backend atau database ke teknologi lain.

---

## 2. Keputusan Teknologi Final

| Bagian | Teknologi |
|---|---|
| Dashboard web | Next.js App Router + TypeScript |
| Styling UI | Tailwind CSS + shadcn/ui (opsional, bila diperlukan) |
| Backend API | Next.js Route Handlers di `app/api/.../route.ts` |
| Database | Neon PostgreSQL |
| Akses database | `@neondatabase/serverless` dengan SQL parameterized |
| ORM | Tidak menggunakan Prisma |
| Autentikasi admin | JWT pada cookie `HttpOnly` + password hash `bcryptjs` |
| Perangkat IoT | NodeMCU ESP8266 + RC522 + LCD I2C + buzzer |
| Hosting aplikasi | Vercel |
| Version control | GitHub |

### Prinsip penting

- NodeMCU tidak menjalankan dashboard atau database.
- NodeMCU hanya membaca UID kartu, mengirim scan ke API, lalu menampilkan respons pada LCD.
- Semua waktu absensi memakai waktu server/database, bukan jam dari NodeMCU.
- UID kartu hanya sebagai pengenal; nama, NIM, kelas, dan data mahasiswa disimpan di database.

---

## 3. Arsitektur Sistem

```text
Kartu RFID Mahasiswa
        ↓
NodeMCU ESP8266 + RC522 + LCD + Buzzer
        ↓ HTTPS POST
API Next.js di Vercel
        ↓ SQL
Neon PostgreSQL
        ↓
Dashboard Admin Next.js
```

### Saat pengembangan lokal

```text
NodeMCU → URL ngrok → Next.js lokal → Neon PostgreSQL
```

Ngrok hanya dipakai jika NodeMCU perlu mengakses server Next.js yang masih berjalan di laptop. Setelah aplikasi di-deploy, NodeMCU langsung memakai URL Vercel sehingga laptop dan ngrok tidak perlu terus menyala.

---

## 4. Ruang Lingkup Versi 1

### Tersedia pada versi 1

- Login dan logout admin.
- Dashboard ringkasan absensi hari ini.
- Kelola data mahasiswa.
- Kelola kelas, mata kuliah, dosen, ruangan, dan perangkat RFID.
- Kelola jadwal kuliah beserta batas hadir dan terlambat.
- Registrasi UID kartu langsung dari halaman web.
- Scan absensi otomatis berdasarkan jadwal aktif, waktu scan, kelas mahasiswa, dan ruang perangkat.
- Riwayat absensi dengan filter.
- Status hadir, terlambat, scan ganda, absensi ditutup, atau kartu tidak terdaftar.
- Rekap absensi dan export CSV/Excel sederhana.

### Belum termasuk pada versi 1

- Akun mandiri untuk mahasiswa.
- Scan keluar saat kelas selesai.
- Notifikasi WhatsApp/email.
- Integrasi mesin RFID pada banyak ruangan secara bersamaan.
- Pengajuan izin atau sakit.
- Foto absensi dan biometrik.

---

## 5. Konsep Kartu, Perangkat, dan Ruangan

### Kartu mahasiswa

Setiap mahasiswa memiliki satu kartu RFID aktif.

```text
UID kartu → mahasiswa
```

Satu kartu dapat dipakai untuk seluruh mata kuliah yang diikuti mahasiswa. Mahasiswa tidak membutuhkan kartu terpisah untuk ruangan atau mata kuliah lain.

### Perangkat RFID

Yang terikat ke ruangan adalah perangkat RFID.

```text
RFID-01 → Ruang A
RFID-02 → Ruang B
RFID-03 → Lab Komputer
```

Jika mahasiswa scan, server mengetahui kartu yang dipakai, perangkat yang digunakan, ruang perangkat, serta waktu scan. Informasi tersebut dicocokkan dengan jadwal kuliah.

> Catatan: satu NodeMCU + RC522 hanya dapat melayani satu titik absensi dalam waktu bersamaan. Jika beberapa ruang harus melakukan absensi secara bersamaan, setiap ruang membutuhkan perangkat RFID sendiri.

---

## 6. Konsep Absensi Per Sesi Kuliah

Absensi dibuat per sesi mata kuliah, bukan hanya satu kali per hari.

Contoh jadwal mahasiswa:

```text
10.00–12.00 → Pemrograman Web
13.00–15.00 → Basis Data
```

Maka mahasiswa melakukan scan satu kali pada setiap sesi:

```text
10.05 → Hadir Pemrograman Web
13.10 → Hadir Basis Data
```

Mahasiswa tidak perlu scan ketika kelas selesai pada versi 1.

---

## 7. Aturan Waktu Absensi

Setiap jadwal menyimpan:

- Jam mulai kuliah.
- Jam selesai kuliah.
- Batas hadir tepat waktu.
- Batas keterlambatan.
- Status jadwal aktif/nonaktif.

Contoh pengaturan:

```text
Jam kuliah              : 10.00–12.00
Batas hadir tepat waktu : sampai 10.15
Batas terlambat         : sampai 10.30
Absensi ditutup         : setelah 10.30
```

| Waktu scan | Hasil |
|---|---|
| 09.45–10.15 | `PRESENT` / Hadir |
| 10.16–10.30 | `LATE` / Terlambat |
| Setelah 10.30 | Scan ditolak |
| Setelah kelas selesai | Scan ditolak |

Mahasiswa yang tidak mempunyai scan valid sampai sesi ditutup akan berstatus `ABSENT` / Tidak Hadir.

Mahasiswa yang scan pukul 12.10 untuk kelas yang selesai pukul 12.00 tidak dianggap terlambat. Sistem menolak scan tersebut sebagai sesi selesai, dan status akhirnya tetap tidak hadir apabila tidak pernah melakukan scan valid sebelumnya.

---

## 8. Validasi Scan RFID

Setiap scan yang masuk ke API harus melalui pemeriksaan berikut:

1. `device_code` dan `api_key` perangkat valid.
2. UID kartu terdaftar.
3. Kartu RFID masih aktif.
4. Mahasiswa pemilik kartu masih aktif.
5. Perangkat memiliki ruangan yang terdaftar.
6. Terdapat jadwal aktif pada ruang tersebut untuk hari dan waktu scan.
7. Mahasiswa terdaftar pada kelas yang sesuai dengan jadwal.
8. Waktu scan masih berada dalam rentang absensi.
9. Mahasiswa belum mempunyai absensi pada sesi tersebut.

### Respons yang mungkin diterima NodeMCU

```text
PRESENT
LATE
ALREADY_ATTENDED
CARD_NOT_REGISTERED
CARD_INACTIVE
NO_ACTIVE_SCHEDULE
NOT_YOUR_CLASS
ATTENDANCE_CLOSED
DEVICE_NOT_REGISTERED
SERVER_ERROR
```

Semua percobaan scan, termasuk yang ditolak, disimpan dalam log agar admin dapat memeriksa masalah perangkat atau kartu.

---

## 9. Role dan Hak Akses

### Admin

Admin dapat:

- Login dan logout.
- Melihat ringkasan scan dan absensi hari ini.
- Menambah, mengubah, menonaktifkan, atau menghapus data mahasiswa.
- Mengelola kelas, mata kuliah, dosen, ruangan, dan perangkat RFID.
- Mengatur jadwal kuliah dan batas keterlambatan.
- Mendaftarkan UID kartu ke mahasiswa.
- Menonaktifkan kartu yang hilang dan mendaftarkan kartu pengganti.
- Melihat riwayat absensi, mahasiswa terlambat, dan mahasiswa tidak hadir.
- Mengunduh rekap absensi.

### Mahasiswa

Belum memiliki akun pada versi 1. Halaman mahasiswa untuk melihat riwayat dan persentase kehadiran dapat dibuat pada pengembangan selanjutnya.

---

## 10. Registrasi UID Kartu dari Web

UID kartu tidak diketik manual.

### Alur registrasi kartu

1. Admin login.
2. Admin membuka detail mahasiswa.
3. Admin memilih **Daftarkan Kartu RFID**.
4. Halaman web menampilkan status **Menunggu kartu dipindai**.
5. Admin menempelkan kartu ke reader RC522.
6. NodeMCU mengirim UID kartu ke API.
7. UID scan terakhir muncul di halaman web.
8. Admin menekan **Hubungkan Kartu**.
9. Server memvalidasi UID belum dipakai pengguna lain.
10. UID disimpan sebagai kartu aktif mahasiswa tersebut.

Contoh tampilan:

```text
Daftarkan Kartu RFID

Nama  : Ade Irgi Firdaus
NIM   : 12345678
Kelas : 15.5A.01

Status Scan : Kartu berhasil terbaca
UID Kartu   : A1B2C3D4

[Batalkan] [Hubungkan Kartu]
```

---

## 11. Struktur Database Awal

Database menggunakan PostgreSQL di Neon. Seluruh skema disimpan di file:

```text
database/schema.sql
```

### Tabel inti

| Tabel | Tujuan |
|---|---|
| `admins` | Akun admin dashboard |
| `classes` | Data kelas mahasiswa |
| `students` | Data mahasiswa |
| `rfid_cards` | UID kartu yang terhubung ke mahasiswa |
| `courses` | Mata kuliah |
| `lecturers` | Data dosen |
| `rooms` | Data ruang kuliah |
| `devices` | Perangkat RFID dan API key |
| `class_schedules` | Jadwal perkuliahan dan batas absensi |
| `attendance_sessions` | Sesi kuliah aktual per tanggal |
| `attendance_records` | Hasil absensi valid mahasiswa |
| `rfid_scan_logs` | Seluruh log scan RFID, termasuk scan ditolak |

### Ketentuan relasi utama

- Satu `class` memiliki banyak `students`.
- Satu `student` dapat memiliki banyak riwayat kartu, tetapi hanya satu kartu berstatus `ACTIVE`.
- Satu UID hanya dapat dimiliki satu kartu aktif.
- Satu `room` dapat memiliki banyak `devices`.
- Satu `class_schedule` menghubungkan kelas, mata kuliah, dosen, dan ruang.
- Satu jadwal dapat menghasilkan satu `attendance_session` pada setiap tanggal berlangsung.
- Satu sesi memiliki banyak `attendance_records`.
- Satu mahasiswa hanya boleh memiliki satu `attendance_record` pada satu sesi.

### Enum yang direncanakan

```sql
-- status kartu
ACTIVE, INACTIVE, LOST

-- status sesi
UPCOMING, ACTIVE, CLOSED

-- status absensi
PRESENT, LATE, ABSENT

-- status log scan
SUCCESS, REJECTED, UNREGISTERED, DUPLICATE, ERROR
```

---

## 12. Struktur Folder Next.js

```text
rfid-attendance-web/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx
│   │   ├── students/
│   │   ├── classes/
│   │   ├── courses/
│   │   ├── lecturers/
│   │   ├── rooms/
│   │   ├── devices/
│   │   ├── schedules/
│   │   ├── attendance/
│   │   └── reports/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── me/route.ts
│   │   ├── students/
│   │   ├── classes/
│   │   ├── courses/
│   │   ├── lecturers/
│   │   ├── rooms/
│   │   ├── devices/
│   │   ├── schedules/
│   │   ├── attendance/
│   │   └── rfid/
│   │       ├── scan/route.ts
│   │       ├── latest-scan/route.ts
│   │       └── register-card/route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── components/
│   ├── dashboard/
│   ├── forms/
│   ├── tables/
│   └── ui/
├── lib/
│   ├── db.ts
│   ├── auth.ts
│   ├── password.ts
│   ├── validation.ts
│   ├── attendance.ts
│   └── utils.ts
├── database/
│   ├── schema.sql
│   └── seed.sql
├── types/
│   └── index.ts
├── middleware.ts
├── .env.example
└── README.md
```

---

## 13. API Awal

### Autentikasi admin

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

### Master data dashboard

```text
GET, POST                 /api/students
GET, PATCH, DELETE        /api/students/[id]
GET, POST                 /api/classes
GET, POST                 /api/courses
GET, POST                 /api/lecturers
GET, POST                 /api/rooms
GET, POST                 /api/devices
GET, POST                 /api/schedules
```

### RFID dan absensi

```text
POST /api/rfid/scan
GET  /api/rfid/latest-scan?device_code=RFID-01
POST /api/rfid/register-card
GET  /api/attendance
GET  /api/attendance/summary
GET  /api/reports/attendance.csv
```

### Payload scan dari NodeMCU

```json
{
  "uid": "A1B2C3D4",
  "device_code": "RFID-01",
  "api_key": "DEVICE_SECRET_KEY"
}
```

### Respons API untuk NodeMCU

```json
{
  "success": true,
  "status": "PRESENT",
  "message": "Hadir berhasil",
  "display_name": "Ade Irgi"
}
```

Respons dibuat pendek agar mudah ditampilkan di LCD dan tidak membebani NodeMCU.

---

## 14. Autentikasi dan Keamanan

- Password admin disimpan sebagai hash menggunakan `bcryptjs`, bukan teks asli.
- Login menghasilkan token sesi JWT pada cookie `HttpOnly`.
- Semua halaman dashboard dan endpoint admin dilindungi middleware/validasi sesi.
- Endpoint scan RFID tidak memakai cookie admin; endpoint memvalidasi `device_code` dan `api_key` perangkat.
- `DATABASE_URL`, `JWT_SECRET`, dan API key tidak boleh dimasukkan ke GitHub.
- Rahasia disimpan di `.env.local` saat lokal dan di Environment Variables Vercel saat deployment.
- Query database harus selalu parameterized menggunakan tagged template dari Neon driver.
- Semua UID, waktu scan, dan hasil penolakan dicatat pada tabel log.

### Environment variables yang direncanakan

```env
DATABASE_URL=
JWT_SECRET=
NEXT_PUBLIC_APP_URL=
```

API key perangkat disimpan di database dalam bentuk hash atau nilai rahasia yang tidak pernah dikirim ke dashboard pengguna biasa.

---

## 15. Alur Scan Absensi

```text
Mahasiswa menempelkan kartu
        ↓
NodeMCU membaca UID
        ↓
NodeMCU mengirim UID + device_code + api_key ke POST /api/rfid/scan
        ↓
API memvalidasi perangkat, kartu, mahasiswa, jadwal, ruang, dan waktu
        ↓
API menyimpan scan log
        ↓
Jika valid, API menyimpan attendance record
        ↓
API mengirim status kembali ke NodeMCU
        ↓
LCD menampilkan respons dan buzzer berbunyi
```

### Contoh respons pada LCD

| Kondisi | Baris LCD 1 | Baris LCD 2 |
|---|---|---|
| Hadir | `Hadir Berhasil` | `Ade Irgi` |
| Terlambat | `Anda Terlambat` | `Tercatat` |
| Sudah scan | `Sudah Absen` | `Sesi Ini` |
| Kartu belum terdaftar | `Kartu Tidak Ada` | `Hubungi Admin` |
| Tidak ada jadwal | `Tidak Ada Jadwal` | `Saat Ini` |
| Absensi ditutup | `Absensi Ditutup` | `Sesi Berakhir` |
| Server gagal | `Server Bermasalah` | `Cek WiFi` |

---

## 16. Tahapan Implementasi

### Tahap 0 — Persiapan akun dan repository

- Membuat repository GitHub baru.
- Membuat project Neon PostgreSQL.
- Menyimpan connection string Neon dengan aman.
- Membuat project Next.js TypeScript.
- Menghubungkan repository ke Vercel.

### Tahap 1 — Inisialisasi aplikasi

- Membuat project dengan App Router, TypeScript, ESLint, dan Tailwind.
- Memasang dependency dasar:

```bash
npm install @neondatabase/serverless bcryptjs jose zod
```

- Membuat `.env.local` berdasarkan `.env.example`.
- Membuat `lib/db.ts` untuk koneksi Neon.
- Membuat `database/schema.sql` dan menjalankannya di Neon SQL Editor.
- Membuat `database/seed.sql` untuk akun admin dan data contoh.

### Tahap 2 — Autentikasi admin

- Membuat halaman login.
- Membuat endpoint login/logout/me.
- Membuat JWT cookie `HttpOnly`.
- Membuat proteksi dashboard menggunakan middleware.
- Menguji login, logout, dan akses halaman terlindungi.

### Tahap 3 — Dashboard dan master data

- Membuat layout sidebar dashboard.
- Membuat kartu ringkasan: mahasiswa aktif, kartu aktif, hadir hari ini, terlambat hari ini.
- Membuat CRUD mahasiswa.
- Membuat CRUD kelas, mata kuliah, dosen, ruangan, dan perangkat.
- Membuat validasi form memakai Zod.

### Tahap 4 — Jadwal kuliah dan aturan absensi

- Membuat CRUD jadwal kuliah.
- Menyimpan hari, jam mulai, jam selesai, batas tepat waktu, dan batas terlambat.
- Membuat fungsi server `lib/attendance.ts` untuk menemukan jadwal aktif.
- Membuat pembentukan sesi absensi per jadwal dan tanggal.
- Membuat mekanisme status `PRESENT`, `LATE`, dan `ABSENT`.

### Tahap 5 — Registrasi kartu RFID dari web

- Membuat endpoint awal penerima scan dari NodeMCU.
- Menyimpan scan ke `rfid_scan_logs`.
- Membuat halaman detail mahasiswa dan tombol **Daftarkan Kartu RFID**.
- Membuat polling scan terakhir pada perangkat terpilih.
- Membuat endpoint untuk menghubungkan UID ke mahasiswa.
- Menolak UID yang sudah digunakan oleh mahasiswa lain.

### Tahap 6 — Absensi otomatis dari NodeMCU

- Membuat endpoint final `POST /api/rfid/scan`.
- Memvalidasi API key perangkat.
- Mencari kartu, mahasiswa, ruangan, jadwal aktif, dan batas waktu.
- Menolak scan ganda.
- Menyimpan hasil absensi valid.
- Mengembalikan JSON ringkas untuk LCD.
- Memperbarui program NodeMCU agar mengirim request HTTPS.

### Tahap 7 — Riwayat dan laporan

- Membuat tabel riwayat absensi.
- Menambah filter tanggal, mahasiswa, kelas, mata kuliah, dan status.
- Membuat daftar mahasiswa tidak hadir berdasarkan sesi yang telah ditutup.
- Membuat export CSV terlebih dahulu.
- Menambahkan export Excel jika diperlukan setelah CSV stabil.

### Tahap 8 — Pengujian dan deployment

- Uji kartu terdaftar, kartu belum terdaftar, kartu nonaktif, dan UID ganda.
- Uji scan tepat waktu, terlambat, setelah batas absensi, dan scan ganda.
- Uji jadwal berbeda dalam satu hari.
- Uji perangkat di ruang yang berbeda.
- Uji WiFi/NodeMCU gagal menghubungi server.
- Menambahkan environment variables di Vercel.
- Deploy ke Vercel.
- Mengubah URL API pada program NodeMCU dari ngrok/local menjadi URL deployment Vercel.

---

## 17. Urutan Pengerjaan Terdekat

Urutan yang akan dikerjakan setelah plan ini:

1. Rancang ERD dan relasi database.
2. Buat `database/schema.sql` PostgreSQL untuk Neon.
3. Buat project Next.js dan struktur folder dasar.
4. Hubungkan Next.js ke Neon tanpa Prisma.
5. Buat autentikasi admin.
6. Buat dashboard dan CRUD mahasiswa.
7. Buat jadwal kuliah.
8. Buat registrasi UID kartu melalui web.
9. Buat API scan RFID dan program NodeMCU online.
10. Buat riwayat, rekap, export, pengujian, dan deploy.

---

## 18. Kriteria Keberhasilan Versi 1

Sistem dianggap berhasil apabila:

- Admin dapat login ke dashboard.
- Admin dapat menambahkan mahasiswa, kelas, mata kuliah, ruangan, perangkat, dan jadwal.
- UID kartu dapat didaftarkan dari hasil scan perangkat RFID tanpa mengetik manual.
- NodeMCU dapat mengirim scan ke API Vercel.
- Sistem dapat membedakan hadir, terlambat, scan ganda, tidak ada jadwal, dan absensi ditutup.
- Mahasiswa dapat melakukan absensi untuk beberapa mata kuliah berbeda pada hari yang sama.
- Hasil absensi tersimpan di Neon PostgreSQL.
- Admin dapat melihat riwayat dan mengunduh rekap absensi.
