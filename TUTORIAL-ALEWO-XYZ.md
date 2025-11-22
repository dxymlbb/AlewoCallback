# Tutorial Lengkap: Setup NS Records untuk alewo.xyz di IDHostinger

## 📋 **Informasi Setup Anda**

```
Domain: alewo.xyz
Server IP: 129.226.148.181
Registrar: IDHostinger
Nameserver saat ini: ns1.dns-parking.com, ns2.dns-parking.com
```

**Tujuan:** Agar setiap kali subdomain callback diakses, DNS query tercatat di AlewoCallback logs.

---

## 🎯 **Apa yang Akan Dibuat**

Setelah setup selesai:

```
alewo.xyz                          → Tetap normal (website utama)
*.alewo.xyz                        → Tetap normal (subdomain lain)
callback.alewo.xyz                 → Delegated ke AlewoCallback DNS
*.callback.alewo.xyz               → Semua subdomain handled oleh AlewoCallback
  └─ abc123.callback.alewo.xyz    → DNS query TERCATAT + HTTP request TERCATAT
  └─ test.callback.alewo.xyz      → DNS query TERCATAT + HTTP request TERCATAT
```

---

## 📝 **Step 1: Login ke Panel IDHostinger**

1. Buka browser
2. Ke: https://www.idhostinger.com/clientarea.php
3. Login dengan akun Anda
4. Klik menu **"Domains"** di sidebar kiri
5. Cari domain **alewo.xyz**
6. Klik **"Manage Domain"** atau ikon gear/setting

---

## 🌐 **Step 2: Masuk ke DNS Management**

1. Di halaman domain alewo.xyz
2. Cari tab atau menu **"DNS Management"** atau **"DNS Zone"**
3. Klik untuk masuk ke DNS editor

**Catatan:** Tampilan bisa berbeda tergantung versi panel IDHostinger, tapi biasanya ada menu "DNS" atau "Nameservers".

---

## ➕ **Step 3: Tambah DNS Records**

Anda akan menambahkan **3 DNS records**. Berikut detail lengkapnya:

### **Record 1: Nameserver Hostname**

```
Type: A
Name: ns1.callback
TTL: 3600 (atau 1 Hour)
Value: 129.226.148.181
Priority: (kosongkan jika ada)
```

**Penjelasan:**
- Ini membuat hostname `ns1.callback.alewo.xyz` yang mengarah ke server Anda
- Hostname ini akan digunakan sebagai nameserver

**Screenshot nilai yang harus diisi:**
```
┌─────────────────────────────────────┐
│ Type:     [A Record         ▼]      │
│ Name:     [ns1.callback    ]        │
│ Value:    [129.226.148.181 ]        │
│ TTL:      [3600            ]        │
└─────────────────────────────────────┘
```

---

### **Record 2: Wildcard A Record**

```
Type: A
Name: *.callback
TTL: 3600 (atau 1 Hour)
Value: 129.226.148.181
Priority: (kosongkan jika ada)
```

**Penjelasan:**
- Ini membuat semua subdomain `*.callback.alewo.xyz` mengarah ke server Anda
- Dibutuhkan untuk HTTP/HTTPS access ke subdomain callback

**Screenshot nilai yang harus diisi:**
```
┌─────────────────────────────────────┐
│ Type:     [A Record         ▼]      │
│ Name:     [*.callback      ]        │
│ Value:    [129.226.148.181 ]        │
│ TTL:      [3600            ]        │
└─────────────────────────────────────┘
```

---

### **Record 3: NS Delegation (PALING PENTING!)**

```
Type: NS
Name: callback
TTL: 3600 (atau 1 Hour)
Value: ns1.callback.alewo.xyz.
Priority: (kosongkan jika ada)
```

⚠️ **SANGAT PENTING:**
- Ada **titik (.)** di akhir → `ns1.callback.alewo.xyz.`
- Tanpa titik mungkin tidak bekerja!

**Penjelasan:**
- Ini mendelegasikan DNS authority untuk `*.callback.alewo.xyz` ke server Anda
- Tanpa ini, DNS queries TIDAK akan sampai ke AlewoCallback DNS server

**Screenshot nilai yang harus diisi:**
```
┌─────────────────────────────────────┐
│ Type:     [NS Record        ▼]      │
│ Name:     [callback        ]        │
│ Value:    [ns1.callback.alewo.xyz.] │
│ TTL:      [3600            ]        │
└─────────────────────────────────────┘
```

⚠️ **Jika panel IDHostinger tidak mengizinkan titik di akhir:**
- Coba tanpa titik: `ns1.callback.alewo.xyz`
- Atau pilih dari dropdown jika ada

---

## 💾 **Step 4: Save/Simpan Records**

1. Pastikan ketiga records sudah ditambahkan
2. Klik tombol **"Save"** atau **"Add Record"** untuk setiap record
3. Klik **"Save Changes"** atau **"Apply"** di bagian bawah

**Verifikasi:** Seharusnya sekarang Anda melihat 3 records baru:

```
┌──────┬──────────────┬─────────────────────────┐
│ Type │ Name         │ Value                   │
├──────┼──────────────┼─────────────────────────┤
│ A    │ ns1.callback │ 129.226.148.181         │
│ A    │ *.callback   │ 129.226.148.181         │
│ NS   │ callback     │ ns1.callback.alewo.xyz. │
└──────┴──────────────┴─────────────────────────┘
```

---

## ⏳ **Step 5: Tunggu Propagasi DNS (10-30 Menit)**

DNS changes butuh waktu untuk propagate ke seluruh internet.

**Sementara tunggu:**
- ☕ Minum kopi
- 🍕 Makan siang
- 📱 Cek social media
- ⏰ Set timer 15 menit

**Jangan panik jika belum langsung bekerja!** DNS propagation bisa 5-30 menit.

---

## ✅ **Step 6: Verifikasi NS Records (Setelah 15 Menit)**

Sekarang kita verify apakah NS delegation sudah bekerja.

### **Test 1: Cek NS Record Exists**

Buka terminal/command prompt, jalankan:

```bash
dig NS callback.alewo.xyz @8.8.8.8
```

**Expected Output (SUKSES):**
```
; <<>> DiG 9.x.x <<>> NS callback.alewo.xyz @8.8.8.8
;; ANSWER SECTION:
callback.alewo.xyz.     3600    IN      NS      ns1.callback.alewo.xyz.
```

✅ **Jika muncul ini, NS record SUDAH BENAR!**

❌ **Jika tidak muncul:**
- Tunggu 10 menit lagi (DNS belum propagate)
- Cek lagi apakah NS record sudah disave di panel IDHostinger

---

### **Test 2: Cek Nameserver IP Resolves**

```bash
dig ns1.callback.alewo.xyz @8.8.8.8
```

**Expected Output (SUKSES):**
```
; <<>> DiG 9.x.x <<>> ns1.callback.alewo.xyz @8.8.8.8
;; ANSWER SECTION:
ns1.callback.alewo.xyz. 3600    IN      A       129.226.148.181
```

✅ **Jika muncul IP 129.226.148.181, SUDAH BENAR!**

---

### **Test 3: Cek Wildcard A Record**

```bash
dig test.callback.alewo.xyz @8.8.8.8
```

**Expected Output (SUKSES):**
```
; <<>> DiG 9.x.x <<>> test.callback.alewo.xyz @8.8.8.8
;; ANSWER SECTION:
test.callback.alewo.xyz. 3600   IN      A       129.226.148.181
```

✅ **Jika muncul IP 129.226.148.181, SUDAH BENAR!**

---

## 🔍 **Step 7: Verify AlewoCallback DNS Server Running**

SSH ke server Anda (129.226.148.181) dan jalankan:

### **Cek Status Service**

```bash
sudo alewo-callback status
```

**Expected Output:**
```
AlewoCallback Status:
┌──────────────────┬────────┬─────────┬───────────┐
│ Name             │ Status │ CPU     │ Memory    │
├──────────────────┼────────┼─────────┼───────────┤
│ alewo-callback   │ online │ 0.5%    │ 45.2 MB   │
└──────────────────┴────────┴─────────┴───────────┘

Port Configuration:
  HTTP Port: 3000
  DNS Port: 53
  SSL Enabled: true/false
```

✅ **Jika Status = online, DNS server RUNNING!**

❌ **Jika Status = stopped:**
```bash
sudo alewo-callback start
```

---

### **Cek Port 53 Listening**

```bash
sudo netstat -tulpn | grep :53
```

**Expected Output:**
```
udp   0   0  0.0.0.0:53    0.0.0.0:*     12345/node
```

✅ **Jika ada "node" di port 53, DNS server LISTENING!**

❌ **Jika tidak ada:**
- DNS server tidak running
- Atau ada service lain pakai port 53 (systemd-resolved)

---

### **Cek DNS Server Logs**

```bash
sudo alewo-callback logs
```

**Expected Output:**
```
✓ DNS Server listening on port 53 (UDP)
✓ Base domain: alewo.xyz
✓ Server IP: 129.226.148.181
```

✅ **Jika muncul ini, DNS server SIAP MENERIMA QUERIES!**

---

## 🎯 **Step 8: Test DNS Query Logging (INI YANG PENTING!)**

Sekarang test apakah DNS queries sampai ke AlewoCallback dan tercatat!

### **Test dari Terminal**

Di komputer/laptop Anda (bukan di server), jalankan:

```bash
dig testing123.callback.alewo.xyz @8.8.8.8
```

**Expected Output:**
```
; <<>> DiG 9.x.x <<>> testing123.callback.alewo.xyz @8.8.8.8
;; ANSWER SECTION:
testing123.callback.alewo.xyz. 300 IN A 129.226.148.181
```

✅ **Return IP 129.226.148.181 → BENAR!**

---

### **Cek Logs di Server**

Segera setelah dig command di atas, di server SSH jalankan:

```bash
sudo alewo-callback logs | tail -20
```

**Expected Output (SUKSES!):**
```
DNS Query: testing123.callback.alewo.xyz (A) from 8.8.8.8
✓ DNS query logged for subdomain: testing123
```

🎉 **JIKA MUNCUL INI, DNS LOGGING SUDAH BEKERJA!** 🎉

---

## 🌐 **Step 9: Test dari AlewoCallback Dashboard**

### **Login ke Dashboard**

1. Buka browser
2. Ke: `http://129.226.148.181` atau `https://alewo.xyz`
3. Login ke AlewoCallback dashboard

---

### **Generate Subdomain**

1. Di dashboard, klik **"Random"** atau **"Custom"**
2. Misalkan generate subdomain: `abc123`
3. Subdomain yang dibuat: `abc123.callback.alewo.xyz`

---

### **Test DNS Query**

Di terminal, jalankan:

```bash
dig abc123.callback.alewo.xyz @8.8.8.8
```

**Atau dari browser:**

```
http://abc123.callback.alewo.xyz/test
```

---

### **Cek di Dashboard**

1. Refresh halaman dashboard
2. Klik subdomain `abc123`
3. Lihat tab **"Interactions"**

**Expected:**
- ✅ **DNS Query** muncul di logs!
  - Type: DNS
  - Query: abc123.callback.alewo.xyz
  - Query Type: A
  - Source IP: 8.8.8.8 (atau IP Anda)
  - Response: 129.226.148.181

- ✅ **HTTP Request** muncul di logs (jika akses via browser)!
  - Type: HTTP
  - Method: GET
  - Path: /test
  - IP: Your IP
  - Protocol: http atau https

🎊 **SAMA SEPERTI BURP COLLABORATOR!** 🎊

---

## 🔄 **Step 10: Test Multiple Access (Seperti Burp)**

Untuk membuktikan works seperti Burp Collaborator, akses berkali-kali:

```bash
# Akses 1
curl http://test.callback.alewo.xyz

# Akses 2
curl http://test.callback.alewo.xyz/api

# Akses 3
curl http://test.callback.alewo.xyz/webhook
```

**Cek Dashboard:**
- ✅ Semua HTTP requests tercatat
- ✅ DNS query mungkin hanya 1 kali (karena TTL 300 detik)

**Ini NORMAL!** DNS di-cache, tapi HTTP request tetap tercatat.

---

## 📊 **Verification Checklist**

Pastikan semua ini ✅:

- [x] **A record `ns1.callback` exists** → `dig ns1.callback.alewo.xyz`
- [x] **A record `*.callback` exists** → `dig test.callback.alewo.xyz`
- [x] **NS record `callback` exists** → `dig NS callback.alewo.xyz`
- [x] **AlewoCallback DNS running** → `sudo alewo-callback status`
- [x] **Port 53 listening** → `sudo netstat -tulpn | grep :53`
- [x] **DNS query logged** → `sudo alewo-callback logs`
- [x] **Dashboard shows DNS log** → Check UI
- [x] **Dashboard shows HTTP log** → Check UI

---

## 🐛 **Troubleshooting**

### **Problem 1: "dig NS callback.alewo.xyz tidak return apa-apa"**

**Penyebab:** DNS belum propagate atau NS record salah

**Solusi:**
```bash
# Test langsung ke nameserver IDHostinger
dig NS callback.alewo.xyz @ns1.dns-parking.com

# Jika tetap tidak ada:
# - Re-check panel IDHostinger
# - Pastikan NS record sudah disave
# - Tunggu 30 menit lagi
```

---

### **Problem 2: "dig return IP tapi logs tidak muncul"**

**Penyebab:** DNS server tidak running atau tidak listening

**Solusi:**
```bash
# Restart service
sudo alewo-callback restart

# Cek logs untuk error
sudo alewo-callback logs

# Cek port 53
sudo netstat -tulpn | grep :53

# Jika ada systemd-resolved di port 53:
sudo systemctl stop systemd-resolved
sudo alewo-callback restart
```

---

### **Problem 3: "Permission denied bind port 53"**

**Penyebab:** Port 53 butuh root privileges

**Solusi:**
```bash
# Pastikan PM2 run as root
sudo alewo-callback restart

# Atau manual dengan PM2
export PM2_HOME=/var/www/.pm2
sudo -E pm2 restart alewo-callback
```

---

### **Problem 4: "Dashboard tidak show DNS logs"**

**Penyebab:** Frontend tidak fetch atau Socket.IO issue

**Solusi:**
```bash
# Hard refresh browser
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)

# Cek browser console (F12)
# Lihat ada error Socket.IO?

# Restart backend
sudo alewo-callback restart
```

---

## 🎯 **Expected Final Result**

Setelah semua setup:

### **When You Access Subdomain:**

```bash
curl http://test123.callback.alewo.xyz/webhook
```

### **In AlewoCallback Logs:**

```
DNS Query: test123.callback.alewo.xyz (A) from 8.8.8.8
✓ DNS query logged for subdomain: test123

HTTP Request: GET /webhook
✓ HTTP callback logged for subdomain: test123
```

### **In Dashboard UI:**

```
Subdomain: test123

Interactions:
┌──────┬─────────────────────────────────┬──────────┬─────────┐
│ Type │ Details                         │ Time     │ Source  │
├──────┼─────────────────────────────────┼──────────┼─────────┤
│ DNS  │ test123.callback.alewo.xyz (A)  │ 1s ago   │ 8.8.8.8 │
│ HTTP │ GET /webhook                    │ 1s ago   │ Your IP │
└──────┴─────────────────────────────────┴──────────┴─────────┘
```

🎉 **PERSIS SEPERTI BURP COLLABORATOR!** 🎉

---

## 📞 **Verification Commands Summary**

Copy-paste commands ini untuk quick verification:

```bash
# 1. Check NS record
dig NS callback.alewo.xyz @8.8.8.8

# 2. Check nameserver IP
dig ns1.callback.alewo.xyz @8.8.8.8

# 3. Test subdomain query
dig test.callback.alewo.xyz @8.8.8.8

# 4. Check service status
sudo alewo-callback status

# 5. Check port 53
sudo netstat -tulpn | grep :53

# 6. Check logs
sudo alewo-callback logs

# 7. Test DNS query and check logs
dig testing.callback.alewo.xyz @8.8.8.8 && sudo alewo-callback logs | tail -5

# 8. Test HTTP access
curl http://testing.callback.alewo.xyz/test
```

---

## 🎓 **Understanding: What We Built**

```
Before Setup:
alewo.xyz
  └─ DNS handled by: dns-parking.com
  └─ callback.alewo.xyz → No DNS delegation
      ❌ DNS queries NOT logged

After Setup:
alewo.xyz
  ├─ DNS handled by: dns-parking.com (unchanged)
  └─ callback.alewo.xyz
      ├─ NS Record: ns1.callback.alewo.xyz
      └─ DNS delegated to: 129.226.148.181:53
          └─ AlewoCallback DNS Server
              ✅ Receives all DNS queries
              ✅ Logs to database
              ✅ Returns IP: 129.226.148.181
                  └─ Nginx (80/443)
                      └─ AlewoCallback Web (3000)
                          ✅ Logs HTTP requests
```

---

## 🎬 **Quick Start Commands (After DNS Propagation)**

```bash
# Generate subdomain di dashboard
# Misal dapat: xyz789

# Test DNS:
dig xyz789.callback.alewo.xyz @8.8.8.8

# Test HTTP:
curl http://xyz789.callback.alewo.xyz/test

# Check logs:
sudo alewo-callback logs | tail -10

# Expected: Both DNS and HTTP logged!
```

---

## ✅ **Success Indicators**

You'll know it's working when:

1. ✅ `dig NS callback.alewo.xyz` returns `ns1.callback.alewo.xyz`
2. ✅ `dig test.callback.alewo.xyz` returns `129.226.148.181`
3. ✅ `sudo alewo-callback logs` shows DNS queries
4. ✅ Dashboard shows DNS logs in real-time
5. ✅ Dashboard shows HTTP logs in real-time
6. ✅ Both protocols (HTTP/HTTPS) work
7. ✅ Every subdomain access logs both DNS + HTTP

**Just like Burp Collaborator!** 🚀

---

## 📋 **DNS Records Summary untuk alewo.xyz**

Records yang harus ada di panel IDHostinger:

```
┌──────┬──────────────┬─────────────────────────┬──────┐
│ Type │ Name         │ Value                   │ TTL  │
├──────┼──────────────┼─────────────────────────┼──────┤
│ A    │ ns1.callback │ 129.226.148.181         │ 3600 │
│ A    │ *.callback   │ 129.226.148.181         │ 3600 │
│ NS   │ callback     │ ns1.callback.alewo.xyz. │ 3600 │
└──────┴──────────────┴─────────────────────────┴──────┘
```

**That's it!** 3 records saja untuk enable DNS logging! 🎯
