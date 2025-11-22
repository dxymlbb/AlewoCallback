# Tutorial: Setup Full Domain Delegation untuk alewo.xyz di IDHostinger

## 🎯 **Tujuan**

Membuat **seluruh** `alewo.xyz` menggunakan AlewoCallback DNS Server, sehingga:
- Subdomain yang di-generate: `abc123.alewo.xyz` (2 level, simple!)
- DNS queries langsung ke AlewoCallback DNS server
- DNS logs muncul setiap kali subdomain diakses

---

## 📊 **Setup Anda Saat Ini**

✅ **DNS Records (Sudah Benar!):**
```
A    @    → 129.226.148.181  (domain utama)
A    *    → 129.226.148.181  (wildcard subdomain)
```

❌ **Nameservers (Masih Salah!):**
```
ns1.dns-parking.com
ns2.dns-parking.com
```

**Masalah:**
- Semua DNS queries masih ke `dns-parking.com`
- AlewoCallback DNS server **TIDAK PERNAH** menerima queries
- DNS logs **TIDAK MUNCUL**

---

## ✅ **Solusi: Ganti Nameserver ke AlewoCallback DNS**

Karena IDHostinger **TIDAK PUNYA** type NS di DNS records, Anda harus:
1. **Buat Child Nameserver** (glue record)
2. **Ganti Nameserver** dari `dns-parking.com` ke nameserver Anda sendiri

---

## 📋 **Step 1: Buat Child Nameserver (Glue Record)**

### **1.1 Klik Menu "Child nameservers"**

Di panel DNS IDHostinger, Anda lihat menu:
```
DNS / Nameservers
  ├─ DNS records
  ├─ Child nameservers  ← KLIK INI!
  ├─ Redirects
  ├─ DNSSEC
  └─ DNS history
```

Klik **"Child nameservers"**

---

### **1.2 Tambah Child Nameserver**

Di halaman Child Nameservers, klik **"Add Nameserver"** atau **"Create Nameserver"**

**Isi form:**
```
Nameserver hostname: ns1.alewo.xyz
IP Address: 129.226.148.181
```

**Klik "Add" atau "Save"**

---

### **1.3 (Optional) Tambah Nameserver Kedua untuk Backup**

Untuk redundancy, tambah nameserver kedua (optional):

```
Nameserver hostname: ns2.alewo.xyz
IP Address: 129.226.148.181
```

**Catatan:** IP sama karena hanya 1 server. Ini hanya untuk redundancy requirement beberapa registrar.

---

### **1.4 Verifikasi Child Nameservers**

Setelah ditambahkan, seharusnya muncul di list:

```
Child Nameservers:
┌─────────────────┬──────────────────┐
│ Nameserver      │ IP Address       │
├─────────────────┼──────────────────┤
│ ns1.alewo.xyz   │ 129.226.148.181  │
│ ns2.alewo.xyz   │ 129.226.148.181  │
└─────────────────┴──────────────────┘
```

✅ **Child nameservers sudah dibuat!** (Ini adalah glue records)

---

## 📋 **Step 2: Ganti Nameserver Domain**

### **2.1 Kembali ke Menu "Nameservers"**

Klik menu **"Nameservers"** (di atas "DNS records")

---

### **2.2 Pilih "Use Custom Nameservers"**

Di halaman Nameservers, Anda akan lihat:

```
○ Use Hostinger nameservers
● Use custom nameservers
```

Pilih **"Use custom nameservers"**

---

### **2.3 Masukkan Nameserver Anda**

Di field nameservers, ganti:

**Dari:**
```
Nameserver 1: ns1.dns-parking.com
Nameserver 2: ns2.dns-parking.com
```

**Menjadi:**
```
Nameserver 1: ns1.alewo.xyz
Nameserver 2: ns2.alewo.xyz
```

**Klik "Save" atau "Change Nameservers"**

---

### **2.4 Konfirmasi Perubahan**

IDHostinger akan tanya konfirmasi:
```
⚠️ Warning: Changing nameservers will affect how your domain is managed.
   Are you sure you want to continue?
```

Klik **"Yes"** atau **"Confirm"**

---

## ⏳ **Step 3: Tunggu Propagasi (1-24 Jam)**

Perubahan nameserver butuh waktu propagate:
- Minimum: 1-2 jam
- Maximum: 24-48 jam
- Average: 4-6 jam

**Sambil tunggu:**
- ☕ Minum kopi
- 🎮 Main game
- 📺 Nonton film
- ⏰ Set reminder 2 jam lagi

---

## ✅ **Step 4: Verifikasi Nameserver Sudah Berubah**

Setelah 2 jam, test apakah nameserver sudah update:

### **Test 1: Cek Nameserver**

```bash
dig NS alewo.xyz @8.8.8.8
```

**Expected Output (SUKSES):**
```
;; ANSWER SECTION:
alewo.xyz.      3600    IN      NS      ns1.alewo.xyz.
alewo.xyz.      3600    IN      NS      ns2.alewo.xyz.
```

✅ **Jika muncul ini, nameserver SUDAH BERUBAH!**

❌ **Jika masih `dns-parking.com`:**
- Tunggu beberapa jam lagi (propagasi lambat)
- Atau cek langsung: `whois alewo.xyz | grep "Name Server"`

---

### **Test 2: Cek Nameserver IP**

```bash
dig ns1.alewo.xyz @8.8.8.8
```

**Expected Output:**
```
;; ANSWER SECTION:
ns1.alewo.xyz.  3600    IN      A       129.226.148.181
```

✅ **Jika muncul IP, glue record SUDAH BEKERJA!**

---

## 🔍 **Step 5: Verify AlewoCallback DNS Server Running**

SSH ke server `129.226.148.181`:

### **5.1 Cek Status Service**

```bash
sudo alewo-callback status
```

**Expected:**
```
AlewoCallback Status:
┌──────────────────┬────────┐
│ Name             │ Status │
├──────────────────┼────────┤
│ alewo-callback   │ online │
└──────────────────┴────────┘

Port Configuration:
  DNS Port: 53
```

✅ **Status = online → DNS server RUNNING!**

---

### **5.2 Cek Port 53 Listening**

```bash
sudo netstat -tulpn | grep :53
```

**Expected:**
```
udp   0   0  0.0.0.0:53    0.0.0.0:*     12345/node
```

✅ **Ada "node" di port 53 → DNS server LISTENING!**

---

### **5.3 Cek Logs**

```bash
sudo alewo-callback logs
```

**Expected:**
```
✓ DNS Server listening on port 53 (UDP)
✓ Base domain: alewo.xyz
✓ Server IP: 129.226.148.181
```

✅ **DNS server SIAP!**

---

## 🎯 **Step 6: Test DNS Query Logging**

Sekarang test apakah DNS queries sampai ke AlewoCallback!

### **6.1 Test DNS Query**

Di komputer/laptop Anda:

```bash
dig test123.alewo.xyz @8.8.8.8
```

**Expected Output:**
```
;; ANSWER SECTION:
test123.alewo.xyz.  300    IN      A       129.226.148.181
```

✅ **Return IP 129.226.148.181 → DNS query ke AlewoCallback!**

---

### **6.2 Cek Logs di Server**

Segera setelah command di atas, di server SSH:

```bash
sudo alewo-callback logs | tail -10
```

**Expected (SUKSES!):**
```
DNS Query: test123.alewo.xyz (A) from 8.8.8.8
✓ DNS query logged for subdomain: test123
```

🎉 **JIKA MUNCUL INI, DNS LOGGING SUDAH BEKERJA!** 🎉

---

## 🌐 **Step 7: Test dari AlewoCallback Dashboard**

### **7.1 Login ke Dashboard**

```
http://129.226.148.181
atau
http://alewo.xyz
```

---

### **7.2 Generate Subdomain**

1. Klik **"Random"** atau **"Custom"**
2. Misalkan dapat: `abc123`
3. Subdomain: `abc123.alewo.xyz`

---

### **7.3 Test DNS Query**

```bash
dig abc123.alewo.xyz @8.8.8.8
```

---

### **7.4 Cek di Dashboard**

1. Refresh halaman
2. Klik subdomain `abc123`
3. Lihat tab **"Interactions"**

**Expected:**
- ✅ **DNS Query** muncul!
  - Type: DNS
  - Query: abc123.alewo.xyz
  - Source IP: 8.8.8.8

- ✅ **HTTP Request** muncul (jika akses via browser/curl)!

---

## 🎊 **Step 8: Test Multiple Access (Seperti Burp Collaborator)**

```bash
# Test 1
curl http://test.alewo.xyz

# Test 2
curl http://test.alewo.xyz/api

# Test 3
curl http://test.alewo.xyz/webhook
```

**Cek Dashboard:**
- ✅ DNS query tercatat (mungkin hanya 1x karena TTL)
- ✅ Semua HTTP requests tercatat

**PERSIS SEPERTI BURP COLLABORATOR!** 🚀

---

## 📊 **Diagram: Bagaimana Ini Bekerja**

### **Sebelum (DNS queries tidak tercatat):**

```
User query: abc123.alewo.xyz
    ↓
Public DNS (8.8.8.8): "Nameserver untuk alewo.xyz?"
    ↓
Nameserver: ns1.dns-parking.com
    ↓
dns-parking.com: "Saya cek A record... ada *.alewo.xyz → return IP"
    ↓
Return: 129.226.148.181
    ↓
❌ AlewoCallback DNS server TIDAK ditanyai
❌ DNS query TIDAK tercatat
✅ HTTP request tercatat (browser connect ke IP)
```

---

### **Sesudah (DNS queries tercatat!):**

```
User query: abc123.alewo.xyz
    ↓
Public DNS (8.8.8.8): "Nameserver untuk alewo.xyz?"
    ↓
Nameserver: ns1.alewo.xyz (129.226.148.181)
    ↓
Query LANGSUNG ke AlewoCallback DNS Server (port 53)
    ↓
AlewoCallback DNS Server:
  ✅ LOG query ke database
  ✅ Return IP: 129.226.148.181
    ↓
User dapat IP dan connect via HTTP
    ↓
AlewoCallback Web Server:
  ✅ LOG HTTP request
    ↓
Dashboard shows:
  ✅ DNS query log
  ✅ HTTP request log
```

**SAMA SEPERTI BURP COLLABORATOR!** 🎯

---

## 🐛 **Troubleshooting**

### **Problem 1: "Child nameserver tidak bisa dibuat"**

**Penyebab:** Beberapa registrar butuh verifikasi email atau waiting period

**Solusi:**
- Cek email untuk konfirmasi
- Tunggu 24 jam
- Atau contact support IDHostinger

---

### **Problem 2: "Nameserver tidak bisa diganti"**

**Error:** "Nameserver must be registered as child nameserver first"

**Solusi:**
- Pastikan Child Nameserver sudah dibuat (Step 1)
- Tunggu 1-2 jam setelah buat child nameserver
- Baru ganti nameserver (Step 2)

---

### **Problem 3: "dig NS masih return dns-parking.com"**

**Penyebab:** DNS propagation belum selesai

**Solusi:**
```bash
# Flush DNS cache lokal
sudo systemd-resolve --flush-caches  # Linux
ipconfig /flushdns                    # Windows

# Test lagi beberapa jam kemudian
dig NS alewo.xyz @8.8.8.8

# Atau cek online
https://dnschecker.org (search: alewo.xyz, type: NS)
```

---

### **Problem 4: "DNS query tidak tercatat di logs"**

**Penyebab:** DNS server tidak running atau port 53 tidak listening

**Solusi:**
```bash
# Restart service
sudo alewo-callback restart

# Cek port 53
sudo netstat -tulpn | grep :53

# Cek logs untuk error
sudo alewo-callback logs

# Jika ada systemd-resolved conflict
sudo systemctl stop systemd-resolved
sudo alewo-callback restart
```

---

## ✅ **Checklist Lengkap**

- [ ] Child nameserver `ns1.alewo.xyz` dibuat
- [ ] Child nameserver `ns2.alewo.xyz` dibuat (optional)
- [ ] Nameserver diganti dari `dns-parking.com` ke `ns1.alewo.xyz`
- [ ] Tunggu 2-6 jam untuk propagasi
- [ ] Verify: `dig NS alewo.xyz` return `ns1.alewo.xyz`
- [ ] Verify: `dig ns1.alewo.xyz` return `129.226.148.181`
- [ ] AlewoCallback DNS running: `sudo alewo-callback status`
- [ ] Port 53 listening: `sudo netstat -tulpn | grep :53`
- [ ] Test DNS query: `dig test.alewo.xyz @8.8.8.8`
- [ ] Cek logs: `sudo alewo-callback logs` shows DNS query
- [ ] Dashboard shows DNS logs
- [ ] Dashboard shows HTTP logs

---

## 🎯 **Expected Final Result**

Setelah setup selesai:

### **Subdomain yang Di-generate:**
```
abc123.alewo.xyz  (2 level - simple!)
test.alewo.xyz
xyz789.alewo.xyz
```

### **Saat Akses Subdomain:**
```bash
curl http://abc123.alewo.xyz/webhook
```

### **Di Dashboard Muncul:**
```
Subdomain: abc123

Interactions:
┌──────┬────────────────────────┬──────────┐
│ Type │ Details                │ Time     │
├──────┼────────────────────────┼──────────┤
│ DNS  │ abc123.alewo.xyz (A)   │ 1s ago   │
│ HTTP │ GET /webhook           │ 1s ago   │
└──────┴────────────────────────┴──────────┘
```

🎉 **PERSIS SEPERTI BURP COLLABORATOR!** 🎉

---

## 📝 **Summary**

**Setup sebelumnya (DNS records) SUDAH BENAR:**
```
✅ A    @    → 129.226.148.181
✅ A    *    → 129.226.148.181
```

**Yang perlu dilakukan sekarang:**
1. ✅ Buat Child Nameserver (`ns1.alewo.xyz`, `ns2.alewo.xyz`)
2. ✅ Ganti Nameserver (dari `dns-parking.com` ke `ns1.alewo.xyz`)
3. ⏳ Tunggu propagasi (2-6 jam)
4. ✅ Test dan verify DNS logging works!

**Setelah itu:**
- DNS queries → AlewoCallback DNS Server
- DNS logs muncul di dashboard
- Subdomain simple: `abc123.alewo.xyz`
- Works seperti Burp Collaborator!

---

## 🚀 **Quick Commands untuk Verify**

Setelah nameserver propagate, jalankan commands ini:

```bash
# 1. Cek nameserver sudah berubah
dig NS alewo.xyz @8.8.8.8

# 2. Cek nameserver IP
dig ns1.alewo.xyz @8.8.8.8

# 3. Test subdomain query
dig test123.alewo.xyz @8.8.8.8

# 4. Cek logs di server
ssh root@129.226.148.181
sudo alewo-callback logs | tail -20

# Expected: DNS query logged!
```

**Good luck!** 🎯
