# Panduan Instalasi AlewoCallback

Panduan lengkap untuk instalasi AlewoCallback dengan skrip interaktif otomatis.

## 📋 Persyaratan Sistem

### Minimum
- **OS**: Ubuntu 20.04+ atau Debian 11+
- **CPU**: 1 Core
- **RAM**: 1GB
- **Disk**: 10GB ruang kosong
- **Akses**: Root atau sudo

### Rekomendasi
- **OS**: Ubuntu 22.04 LTS
- **CPU**: 2+ Cores
- **RAM**: 2GB+
- **Disk**: 20GB+ ruang kosong
- **Domain**: Domain dengan akses DNS (opsional)

## 🚀 Instalasi Otomatis (Recommended)

### 1. Download & Extract

```bash
# Clone repository
git clone https://github.com/your-repo/AlewoCallback.git
cd AlewoCallback

# Atau download ZIP dan extract
wget https://github.com/your-repo/AlewoCallback/archive/main.zip
unzip main.zip
cd AlewoCallback-main
```

### 2. Jalankan Installer

```bash
# Jalankan installer sebagai root
sudo bash install.sh
```

### 3. Ikuti Petunjuk Interaktif

Installer akan menanyakan beberapa hal:

#### a. Domain Configuration
```
Enter your domain (leave empty for localhost/IP):
```

**Pilihan:**
- **Jika punya domain**: Masukkan domain Anda (contoh: `callback.domain.com`)
- **Jika tidak punya**: Tekan ENTER (akan menggunakan IP publik)

#### b. SSL Setup (jika menggunakan domain)
```
Do you want to setup SSL certificate (HTTPS)? [y/N]:
```

**Pilihan:**
- **y**: Setup SSL dengan Let's Encrypt (DNS harus sudah dikonfigurasi)
- **N**: Tidak menggunakan SSL (HTTP only)

#### c. Application Port
```
Enter application port [3000]:
```

Tekan ENTER untuk menggunakan port default (3000), atau masukkan port lain.

#### d. MongoDB URI
```
MongoDB URI [mongodb://localhost:27017/alewo-callback]:
```

Tekan ENTER untuk menggunakan default, atau masukkan URI custom.

#### e. Admin Account
```
Admin username [admin]:
Admin email [admin@domain.com]:
Admin password (min 6 characters):
Confirm password:
```

Buat akun administrator untuk login pertama kali.

#### f. Script Expiration
```
Script expiration time (minutes) [5]:
```

Waktu script akan otomatis terhapus (default 5 menit).

### 4. Tunggu Instalasi Selesai

Installer akan otomatis:
- ✅ Install Node.js 18.x
- ✅ Install MongoDB 6.0
- ✅ Install Nginx
- ✅ Install PM2
- ✅ Setup SSL (jika dipilih)
- ✅ Build aplikasi
- ✅ Buat akun admin
- ✅ Konfigurasi firewall
- ✅ Start aplikasi

### 5. Akses Aplikasi

Setelah instalasi selesai, Anda akan melihat:

```
╔═══════════════════════════════════════════════════════════╗
║           INSTALLATION COMPLETED SUCCESSFULLY!            ║
╚═══════════════════════════════════════════════════════════╝

Access your AlewoCallback service at:
https://callback.domain.com

Administrator Credentials:
Username: admin
Email: admin@domain.com
Password: (password yang Anda masukkan)
```

## 🔧 Konfigurasi DNS (Jika Menggunakan Domain)

### Untuk Domain Sendiri

Tambahkan record berikut di DNS provider Anda (Cloudflare, Namecheap, dll):

```
Type: A
Name: callback
Value: [IP_SERVER_ANDA]
TTL: Auto

Type: A
Name: *.callback
Value: [IP_SERVER_ANDA]
TTL: Auto
```

**⚠️ Penting untuk Cloudflare:**
- Matikan Proxy (DNS Only) untuk wildcard subdomain
- Set SSL/TLS mode ke "Full" atau "Full (Strict)"

### Verifikasi DNS

```bash
# Cek DNS utama
nslookup callback.domain.com

# Cek wildcard
nslookup test.callback.domain.com
```

Tunggu 5-10 menit untuk DNS propagation.

## 🔐 Setup SSL Manual (Opsional)

Jika Anda skip SSL saat instalasi, bisa setup nanti:

### Let's Encrypt (Recommended)

```bash
# Pastikan DNS sudah dikonfigurasi
sudo certbot --nginx -d callback.domain.com -d "*.callback.domain.com" --preferred-challenges dns

# Ikuti instruksi untuk add TXT record
# Reload Nginx
sudo systemctl reload nginx
```

### Self-Signed (Development)

```bash
# Generate certificate
sudo mkdir -p /etc/ssl/alewo-callback
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/alewo-callback/privkey.pem \
  -out /etc/ssl/alewo-callback/fullchain.pem \
  -subj "/C=ID/ST=State/L=City/O=Organization/CN=*.callback.domain.com"

# Update .env
sudo nano /var/www/alewo-callback/.env

# Set:
# SSL_ENABLED=true
# SSL_KEY_PATH=/etc/ssl/alewo-callback/privkey.pem
# SSL_CERT_PATH=/etc/ssl/alewo-callback/fullchain.pem

# Restart
sudo alewo-restart
```

## 📱 Management Commands

Setelah instalasi, gunakan command berikut:

```bash
# Start aplikasi
sudo alewo-start

# Stop aplikasi
sudo alewo-stop

# Restart aplikasi
sudo alewo-restart

# Cek status
sudo alewo-status

# Lihat logs
sudo alewo-logs
```

## 🔍 Troubleshooting

### 1. Aplikasi tidak bisa diakses

```bash
# Cek status aplikasi
sudo alewo-status

# Cek logs
sudo alewo-logs

# Cek Nginx
sudo systemctl status nginx
sudo nginx -t

# Cek firewall
sudo ufw status
```

### 2. MongoDB connection error

```bash
# Cek MongoDB
sudo systemctl status mongod

# Restart MongoDB
sudo systemctl restart mongod

# Cek koneksi
mongo --eval "db.adminCommand('ping')"
```

### 3. SSL certificate error

```bash
# Cek certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew --force-renewal

# Reload Nginx
sudo systemctl reload nginx
```

### 4. Port sudah digunakan

```bash
# Cek port 3000
sudo lsof -i :3000

# Kill process jika diperlukan
sudo kill -9 <PID>

# Atau ganti port di .env
sudo nano /var/www/alewo-callback/.env
# Ubah PORT=3000 ke port lain
sudo alewo-restart
```

### 5. DNS tidak resolve

```bash
# Flush DNS cache
sudo systemd-resolve --flush-caches

# Cek DNS
dig callback.domain.com
nslookup callback.domain.com

# Tunggu DNS propagation (bisa 5-60 menit)
```

## 🗑️ Uninstall

Untuk menghapus AlewoCallback:

```bash
cd AlewoCallback
sudo bash uninstall.sh
```

Uninstaller akan:
1. Backup data (opsional)
2. Stop aplikasi
3. Hapus file & konfigurasi
4. Hapus database (opsional)
5. Hapus dependencies (opsional)

## 📝 File Penting

Setelah instalasi, file penting berada di:

```
/var/www/alewo-callback/          # Aplikasi
/var/www/alewo-callback/.env      # Konfigurasi
/etc/nginx/sites-available/       # Nginx config
/etc/letsencrypt/live/            # SSL certificates
/usr/local/bin/alewo-*            # Management commands
```

## 🔒 Keamanan

### Rekomendasi Keamanan

1. **Ganti JWT Secret**
```bash
sudo nano /var/www/alewo-callback/.env
# Generate new secret:
openssl rand -base64 32
```

2. **Setup Firewall**
```bash
# Jika belum disetup saat instalasi
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

3. **Backup Rutin**
```bash
# Backup MongoDB
sudo mongodump --db alewo-callback --out /backup/$(date +%Y%m%d)

# Backup files
sudo tar -czf /backup/alewo-$(date +%Y%m%d).tar.gz /var/www/alewo-callback
```

4. **Update Sistem**
```bash
sudo apt update && sudo apt upgrade -y
```

5. **Monitor Logs**
```bash
# Application logs
sudo alewo-logs

# Nginx logs
sudo tail -f /var/log/nginx/error.log

# MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log
```

## 🎯 Testing

### 1. Test Login

Buka browser dan akses:
```
https://callback.domain.com
```

Login dengan kredensial admin yang dibuat saat instalasi.

### 2. Test Subdomain

1. Buat subdomain baru (Random atau Custom)
2. Copy URL subdomain
3. Test dengan curl:

```bash
curl https://test.callback.domain.com/test
```

Callback akan muncul di dashboard secara real-time!

### 3. Test Script Generator

1. Pilih subdomain
2. Pilih template (contoh: shell → bash)
3. Generate script
4. Copy URL script
5. Akses URL:

```bash
curl https://test.callback.domain.com/script/abc12345.bash
```

## 📞 Support

### Logs Location

```bash
# PM2 logs
~/.pm2/logs/

# Nginx logs
/var/log/nginx/

# MongoDB logs
/var/log/mongodb/
```

### Database Access

```bash
# MongoDB shell
mongosh

# Use database
use alewo-callback

# Show collections
show collections

# Query users
db.users.find()
```

### Reinstall

Jika ada masalah, reinstall dengan:

```bash
# Uninstall dulu
sudo bash uninstall.sh

# Install ulang
sudo bash install.sh
```

## 🌟 Tips & Tricks

### Menambah User Baru

Karena register dinonaktifkan, buat user baru via MongoDB:

```bash
cd /var/www/alewo-callback

# Buat script sementara
cat > add-user.js <<'EOF'
import mongoose from 'mongoose';
import User from './server/models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const addUser = async () => {
    await mongoose.connect(process.env.MONGODB_URI);

    const user = await User.create({
        username: 'newuser',
        email: 'newuser@domain.com',
        password: 'password123'
    });

    console.log('User created:', user.username);
    process.exit(0);
};

addUser();
EOF

# Jalankan
node add-user.js

# Hapus script
rm add-user.js
```

### Ganti Port

```bash
# Edit .env
sudo nano /var/www/alewo-callback/.env

# Ubah PORT
PORT=8080

# Update Nginx config
sudo nano /etc/nginx/sites-available/alewo-callback

# Ubah proxy_pass ke port baru
# Restart
sudo systemctl reload nginx
sudo alewo-restart
```

### Custom Domain per User

Untuk setup multi-tenant dengan domain berbeda per user, edit Nginx config dan tambahkan server block baru.

## ✅ Checklist Post-Installation

- [ ] Aplikasi bisa diakses via browser
- [ ] Login dengan akun admin berhasil
- [ ] Bisa create subdomain
- [ ] Callback terdeteksi saat hit subdomain
- [ ] Script generator berfungsi
- [ ] SSL certificate valid (jika setup SSL)
- [ ] Firewall dikonfigurasi
- [ ] Management commands berfungsi
- [ ] Backup sistem disetup
- [ ] DNS records dikonfigurasi (jika pakai domain)

---

**Selamat! AlewoCallback siap digunakan! 🚀**

Untuk pertanyaan atau issue, silakan buka GitHub Issues.
