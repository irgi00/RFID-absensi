# Sistem Absensi Mahasiswa RFID

Aplikasi web admin untuk sistem absensi mahasiswa berbasis RFID dengan Next.js App Router dan Neon PostgreSQL.

## Menjalankan aplikasi

1. Salin `.env.example` menjadi `.env` atau `.env.local`.
2. Isi minimal `DATABASE_URL` dan `JWT_SECRET`.
3. Jalankan development server:

```bash
pnpm dev
```

4. Buka `http://localhost:3000`.

## Membuat akun admin awal

Script berikut akan membuat akun admin baru atau memperbarui akun yang sudah ada berdasarkan `username` atau `email`. Password selalu di-hash dengan `bcryptjs` sebelum disimpan.

```bash
pnpm create:admin
```

Script akan meminta:

- nama lengkap admin,
- username,
- email,
- password,
- konfirmasi password.

Jika Anda lebih nyaman memakai environment variable sementara, script juga membaca:

- `ADMIN_FULL_NAME`
- `ADMIN_USERNAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_PASSWORD_CONFIRM`

Contoh PowerShell:

```powershell
$env:ADMIN_FULL_NAME="Administrator"
$env:ADMIN_USERNAME="admin"
$env:ADMIN_EMAIL="admin@kampus.local"
$env:ADMIN_PASSWORD="Admin#2026!RFID"
$env:ADMIN_PASSWORD_CONFIRM="Admin#2026!RFID"
pnpm create:admin
```

Contoh akun admin yang saat ini tersimpan di database:

- nama: `Administrator`
- username: `admin`
- email: `admin@kampus.local`
- password: `Admin#2026!RFID`

## Login admin pertama kali

1. Pastikan akun admin awal sudah dibuat dengan `pnpm create:admin`.
2. Jalankan aplikasi dengan `pnpm dev`.
3. Buka `http://localhost:3000/login`.
4. Login memakai `username` atau `email` beserta password yang baru dibuat.

Contoh login admin:

- username: `admin`
- email: `admin@kampus.local`
- password: `Admin#2026!RFID`

## Menguji endpoint database

Endpoint pemeriksaan koneksi tersedia di:

```text
GET /api/health/database
```

Contoh uji dari browser:

```text
http://localhost:3000/api/health/database
```

Contoh uji dari PowerShell:

```powershell
Invoke-WebRequest -Uri http://localhost:3000/api/health/database | Select-Object -ExpandProperty Content
```

Respons sukses hanya menampilkan status aman tanpa membocorkan connection string.

## Status fitur saat ini

- koneksi database Neon melalui `@neondatabase/serverless`,
- login admin dengan JWT di cookie `HttpOnly`,
- proteksi dashboard admin,
- ringkasan dashboard dari query database nyata,
- placeholder modul lanjutan untuk tahap CRUD dan absensi RFID.

## Contoh endpoint RFID

Dua endpoint backend RFID yang tersedia saat ini:

```text
POST /api/rfid/register
POST /api/rfid/scan
```

### 1. Registrasi kartu RFID

Endpoint ini digunakan untuk menghubungkan kartu RFID baru ke mahasiswa tertentu.

Request body:

```json
{
  "studentId": "550e8400-e29b-41d4-a716-446655440000",
  "uid": "63A1D2B4"
}
```

Contoh request dari PowerShell:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://localhost:3000/api/rfid/register `
  -ContentType "application/json" `
  -Body '{"studentId":"550e8400-e29b-41d4-a716-446655440000","uid":"63A1D2B4"}'
```

Contoh respons sukses:

```json
{
  "success": true,
  "message": "RFID card registered successfully"
}
```

Contoh respons gagal jika UID sudah dipakai mahasiswa lain:

```json
{
  "success": false,
  "message": "RFID UID already assigned to another student"
}
```

### 2. Scan absensi RFID

Endpoint ini digunakan oleh perangkat RFID untuk mengirim hasil scan kartu.

Request body:

```json
{
  "uid": "63A1D2B4",
  "deviceId": "RFID-01"
}
```

Contoh request dari PowerShell:

```powershell
Invoke-RestMethod -Method Post `
  -Uri http://localhost:3000/api/rfid/scan `
  -ContentType "application/json" `
  -Body '{"uid":"63A1D2B4","deviceId":"RFID-01"}'
```

Contoh respons sukses:

```json
{
  "success": true,
  "student": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "nim": "2210112233",
    "name": "Budi Santoso"
  },
  "status": "HADIR"
}
```

Contoh respons gagal jika kartu belum terdaftar:

```json
{
  "success": false,
  "message": "RFID card not registered"
}
```

### Catatan perilaku endpoint

- `POST /api/rfid/register` akan menonaktifkan kartu aktif lama milik mahasiswa sebelum menyimpan kartu baru.
- `POST /api/rfid/scan` hanya menerima kartu aktif yang terhubung ke mahasiswa aktif.
- `POST /api/rfid/scan` akan menolak scan duplikat pada sesi absensi yang sama.
- `POST /api/rfid/scan` menyimpan log ke tabel `rfid_scan_logs` untuk setiap hasil proses scan.
