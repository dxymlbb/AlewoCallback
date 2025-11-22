# NS Records Setup Guide - MANDATORY for DNS Queries

## 🔴 CRITICAL: Why Your DNS Queries Are Not Logged

You reported: "di burp collab muncul request DNS beserta HTTP... tidak peduli berapa kalipun saya akses url tersebut, DNS log pasti ada. Namun di tools ini, satupun tidak ada."

**ROOT CAUSE:** NS (Nameserver) records are NOT configured correctly!

---

## Understanding: A Records vs NS Records

### A Records (What You Probably Have)
```
Type: A
Name: callback.yourdomain.com
Value: YOUR_SERVER_IP

Type: A
Name: *.callback.yourdomain.com
Value: YOUR_SERVER_IP
```

**What this does:**
- ✅ Allows HTTP/HTTPS access to subdomains
- ✅ Browser can connect to test123.callback.yourdomain.com
- ❌ DNS queries DO NOT reach your AlewoCallback DNS server
- ❌ DNS logs will NEVER appear

**Why?**
- A records only provide IP addresses
- Public DNS servers (8.8.8.8, 1.1.1.1) return these IPs directly
- Your DNS server is NEVER queried!

---

### NS Records (What You NEED for DNS Logging)

```
Type: NS
Name: callback.yourdomain.com
Value: ns1.callback.yourdomain.com

Type: A
Name: ns1.callback.yourdomain.com
Value: YOUR_SERVER_IP
```

**What this does:**
- ✅ Delegates DNS authority to your server
- ✅ ALL DNS queries for *.callback.yourdomain.com go to YOUR DNS server
- ✅ DNS queries ARE logged in AlewoCallback
- ✅ Works like Burp Collaborator!

---

## How Burp Collaborator Works (vs AlewoCallback)

### Burp Collaborator (WORKING)

```
User accesses: http://abc123.burpcollaborator.net
↓
Browser: "What's the IP for abc123.burpcollaborator.net?"
↓
Public DNS (8.8.8.8): "Let me check who's authoritative..."
↓
NS Records: burpcollaborator.net → ns1.burpcollaborator.net (Burp's DNS)
↓
Query sent to Burp's DNS server at ns1.burpcollaborator.net
↓
✅ DNS query LOGGED in Burp Collaborator
✅ HTTP request also logged
```

**Why it works:** Burp has NS records configured!

---

### AlewoCallback WITHOUT NS Records (NOT WORKING)

```
User accesses: http://test123.callback.yourdomain.com
↓
Browser: "What's the IP for test123.callback.yourdomain.com?"
↓
Public DNS (8.8.8.8): "I have an A record for *.callback.yourdomain.com"
↓
Returns IP directly from A record (cached from registrar)
↓
❌ AlewoCallback DNS server NEVER queried!
❌ DNS query NOT logged
✅ HTTP request logged (browser connects to IP)
```

**Why it doesn't work:** No NS delegation to your DNS server!

---

## MANDATORY Setup: NS Records Configuration

### Step 1: Verify Your Server IP

```bash
# On your AlewoCallback server
curl ifconfig.me
```

Example output: `203.0.113.50`

---

### Step 2: Add NS Records at Your Domain Registrar

You MUST add these records for DNS logging to work:

#### Option A: Subdomain Delegation (Recommended)

```
# Step 1: Create nameserver hostname
Type: A
Name: ns1.callback.yourdomain.com
Value: 203.0.113.50
TTL: 3600

# Step 2: Delegate callback subdomain to your nameserver
Type: NS
Name: callback.yourdomain.com
Value: ns1.callback.yourdomain.com
TTL: 3600

# Step 3: Wildcard A record (for HTTP access)
Type: A
Name: *.callback.yourdomain.com
Value: 203.0.113.50
TTL: 3600
```

**Result:**
- ALL DNS queries for `*.callback.yourdomain.com` → YOUR DNS server
- ✅ DNS queries logged
- ✅ HTTP requests logged
- ✅ Works exactly like Burp Collaborator!

---

#### Option B: Full Domain Delegation (Advanced)

If you want to use the entire domain:

```
# At your domain registrar, set nameservers for the ENTIRE domain
Nameserver 1: ns1.yourdomain.com
Nameserver 2: ns2.yourdomain.com (optional backup)

# Then at your DNS provider (or server):
Type: A
Name: ns1.yourdomain.com
Value: 203.0.113.50

Type: A
Name: ns2.yourdomain.com
Value: 203.0.113.50
```

**Warning:** This delegates the ENTIRE domain to AlewoCallback DNS server!

---

## Provider-Specific Instructions

### Cloudflare

1. Go to: https://dash.cloudflare.com
2. Select your domain
3. Click "DNS" → "Records"
4. Add records:
   ```
   Type: A
   Name: ns1.callback
   Content: YOUR_SERVER_IP
   Proxy: OFF (click cloud icon to disable)

   Type: NS
   Name: callback
   Content: ns1.callback.yourdomain.com
   ```

**IMPORTANT:** Disable Cloudflare proxy (orange cloud) for NS and nameserver A records!

---

### Namecheap

1. Go to: https://www.namecheap.com/myaccount/
2. Domain List → Manage → Advanced DNS
3. Add records:
   ```
   Type: A Record
   Host: ns1.callback
   Value: YOUR_SERVER_IP

   Type: NS Record
   Host: callback
   Value: ns1.callback.yourdomain.com
   ```

---

### GoDaddy

1. Go to: https://dcc.godaddy.com/manage/
2. Select domain → DNS → Manage Zones
3. Add records:
   ```
   Type: A
   Name: ns1.callback
   Value: YOUR_SERVER_IP

   Type: NS
   Name: callback
   Value: ns1.callback.yourdomain.com
   ```

---

### Google Domains

1. Go to: https://domains.google.com
2. Select domain → DNS
3. Custom resource records:
   ```
   Name: ns1.callback
   Type: A
   TTL: 1H
   Data: YOUR_SERVER_IP

   Name: callback
   Type: NS
   TTL: 1H
   Data: ns1.callback.yourdomain.com
   ```

---

## Verification: Is NS Delegation Working?

### Step 1: Check if NS record exists

```bash
dig NS callback.yourdomain.com

# Expected output:
# ;; ANSWER SECTION:
# callback.yourdomain.com. 3600 IN NS ns1.callback.yourdomain.com.
```

✅ If you see this, NS delegation is configured!

---

### Step 2: Check if queries reach YOUR server

```bash
# Query YOUR server directly (should work)
dig @YOUR_SERVER_IP test123.callback.yourdomain.com

# Expected: Returns YOUR_SERVER_IP

# Query public DNS (should also reach your server now)
dig @8.8.8.8 test123.callback.yourdomain.com

# Expected: Returns YOUR_SERVER_IP
```

---

### Step 3: Check AlewoCallback DNS logs

```bash
# On your server
sudo alewo-callback logs

# You should see:
# DNS Query: test123.callback.yourdomain.com (A) from 8.8.8.8
# ✓ DNS query logged for subdomain: test123
```

✅ If you see this, DNS queries are reaching your server!

---

### Step 4: Check Frontend Logs

1. Open AlewoCallback dashboard
2. Click on subdomain "test123"
3. Run: `dig @8.8.8.8 test123.callback.yourdomain.com`
4. Refresh dashboard

✅ You should see DNS query appear in logs!

---

## Testing: End-to-End Verification

### Test 1: DNS Query via dig

```bash
# This should LOG in AlewoCallback
dig @8.8.8.8 testing.callback.yourdomain.com

# Check logs immediately
```

**Expected:**
- ✅ DNS query appears in logs
- Type: DNS
- Query: testing.callback.yourdomain.com
- Query Type: A
- Source IP: 8.8.8.8 (or your IP)

---

### Test 2: HTTP Request via Browser

```bash
# Open browser
http://testing.callback.yourdomain.com/webhook
```

**Expected:**
- ✅ DNS query appears (if first time or cache cleared)
- ✅ HTTP request appears
- Method: GET
- Path: /webhook

---

### Test 3: Multiple Accesses (Like Burp Collaborator)

```bash
# Access 1
curl http://test.callback.yourdomain.com

# Access 2
curl http://test.callback.yourdomain.com

# Access 3
curl http://test.callback.yourdomain.com
```

**Expected with correct NS setup:**
- ✅ DNS query logged (may be only first time due to TTL)
- ✅ HTTP requests logged (all 3 times)

**Currently (without NS setup):**
- ❌ NO DNS queries logged
- ✅ HTTP requests logged

---

## Common Issues

### Issue: "NS record added but DNS queries still not logged"

**Cause:** DNS propagation delay

**Solution:**
```bash
# Wait 5-30 minutes for propagation
# Check propagation
dig NS callback.yourdomain.com @8.8.8.8
dig NS callback.yourdomain.com @1.1.1.1

# Both should return your NS record
```

---

### Issue: "DNS server not responding"

**Cause:** DNS server not running or port 53 blocked

**Solution:**
```bash
# Check DNS server status
sudo alewo-callback status

# Check if port 53 is listening
sudo netstat -tulpn | grep :53

# Check firewall
sudo ufw status
sudo ufw allow 53/udp
sudo ufw allow 53/tcp
```

---

### Issue: "Circular dependency error"

**Cause:** ns1.callback.yourdomain.com requires glue record

**Solution:**
If your nameserver hostname is under the same domain:
- Your registrar should automatically create "glue records"
- Check registrar's nameserver settings
- Some registrars require manual glue record creation

**Alternative:** Use external nameserver hostname:
```
Type: A
Name: ns1.yourotherdomain.com
Value: YOUR_SERVER_IP

Type: NS
Name: callback.yourdomain.com
Value: ns1.yourotherdomain.com
```

---

## Why This Matters: Burp Collaborator Comparison

### Burp Collaborator Setup (Pre-configured by PortSwigger)

```
Domain: burpcollaborator.net
NS Records: Already configured by PortSwigger
Result: DNS queries automatically logged
```

### AlewoCallback Setup (YOU must configure)

```
Domain: callback.yourdomain.com
NS Records: YOU must add at your registrar
Result: DNS queries logged ONLY after NS configuration
```

**This is why Burp shows DNS logs immediately but AlewoCallback doesn't!**

---

## Quick Checklist

Before DNS logging will work:

- [ ] Added A record for `ns1.callback.yourdomain.com`
- [ ] Added NS record for `callback.yourdomain.com`
- [ ] Waited for DNS propagation (5-30 minutes)
- [ ] Verified with `dig NS callback.yourdomain.com`
- [ ] Tested with `dig @8.8.8.8 test.callback.yourdomain.com`
- [ ] Checked AlewoCallback logs with `sudo alewo-callback logs`
- [ ] Verified DNS server is running on port 53

✅ Once ALL are checked, DNS logging will work like Burp Collaborator!

---

## Summary

**The Fundamental Difference:**

| Aspect | Burp Collaborator | AlewoCallback (Current) |
|--------|------------------|------------------------|
| NS Records | ✅ Pre-configured | ❌ Must configure manually |
| DNS Queries Logged | ✅ Always | ❌ Never (until NS setup) |
| HTTP Requests Logged | ✅ Always | ✅ Always |
| Setup Required | None (already done) | NS records required! |

**To make AlewoCallback work like Burp Collaborator:**

1. **Add NS records** (MANDATORY, not optional!)
2. Wait for propagation
3. Verify with dig command
4. Test with browser access

Then you'll see: DNS log + HTTP log, exactly like Burp Collaborator! 🎯
