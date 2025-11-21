# 🚀 Quick Start - AlewoCallback

## Instalasi Super Cepat

```bash
# 1. Clone repository
git clone https://github.com/your-repo/AlewoCallback.git
cd AlewoCallback

# 2. Jalankan installer (sebagai root/sudo)
sudo bash install.sh
```

## Apa yang Akan Ditanyakan Installer?

### 1️⃣ Domain
```
Enter your domain (leave empty for localhost/IP):
```
- **Punya domain?** Ketik: `callback.yourdomain.com`
- **Tidak punya?** Tekan ENTER (pakai IP)

### 2️⃣ SSL (jika pakai domain)
```
Do you want to setup SSL certificate (HTTPS)? [y/N]:
```
- **y** = Setup HTTPS (DNS harus sudah siap)
- **N** = Pakai HTTP saja

### 3️⃣ Port (default: 3000)
```
Enter application port [3000]:
```
Tekan ENTER atau ketik port lain

### 4️⃣ MongoDB (default: localhost)
```
MongoDB URI [mongodb://localhost:27017/alewo-callback]:
```
Tekan ENTER untuk default

### 5️⃣ Akun Admin
```
Admin username [admin]: myuser
Admin email [admin@domain.com]: admin@myemail.com
Admin password (min 6 characters): ******
Confirm password: ******
```

### 6️⃣ Waktu Expire Script (default: 5 menit)
```
Script expiration time (minutes) [5]:
```
Tekan ENTER untuk default

## Selesai! ✅

Setelah selesai, Anda akan melihat:

```
╔═══════════════════════════════════════════════════════════╗
║           INSTALLATION COMPLETED SUCCESSFULLY!            ║
╚═══════════════════════════════════════════════════════════╝

Access your AlewoCallback service at:
https://callback.yourdomain.com

Administrator Credentials:
Username: myuser
Email: admin@myemail.com
Password: ******
```

## Setup DNS (Jika Pakai Domain)

Tambahkan 2 record di DNS provider:

```
A     callback           [IP_SERVER]
A     *.callback         [IP_SERVER]
```

Tunggu 5-10 menit untuk DNS propagation.

## Command Berguna

```bash
sudo alewo-start      # Start aplikasi
sudo alewo-stop       # Stop aplikasi
sudo alewo-restart    # Restart aplikasi
sudo alewo-status     # Cek status
sudo alewo-logs       # Lihat logs
```

## Testing

### Login
Buka browser: `https://callback.yourdomain.com`

Login pakai username & password yang dibuat tadi.

### Test Callback
```bash
# Buat subdomain di dashboard, lalu:
curl https://test.callback.yourdomain.com/anything
```

Callback muncul langsung di dashboard! 🎉

## Troubleshooting

### Tidak bisa akses website
```bash
sudo alewo-status
sudo alewo-logs
```

### MongoDB error
```bash
sudo systemctl restart mongod
```

### Nginx error
```bash
sudo nginx -t
sudo systemctl restart nginx
```

### DNS tidak resolve
```bash
# Cek DNS
nslookup callback.yourdomain.com

# Tunggu propagation atau cek di:
# https://www.whatsmydns.net
```

## Uninstall

```bash
cd AlewoCallback
sudo bash uninstall.sh
```

## Perlu Bantuan?

Baca dokumentasi lengkap di [INSTALL.md](INSTALL.md)

---

**That's it! Selamat menggunakan AlewoCallback! 🚀**
