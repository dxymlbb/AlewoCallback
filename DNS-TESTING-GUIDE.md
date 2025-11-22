# DNS Testing Guide for AlewoCallback

## Why DNS Queries Don't Appear When Accessing via Browser

When you access a subdomain directly in your browser (e.g., `http://test123.callback.com`), **DNS queries are usually NOT logged** because:

### 1. **Browser DNS Cache**
- Browsers cache DNS resolutions for performance
- If you visited the subdomain before, the browser uses the cached IP
- **No new DNS query is sent** to your DNS server

### 2. **Operating System DNS Cache**
- Your OS (Linux/Windows/Mac) also caches DNS lookups
- Even if browser cache is cleared, OS cache remains
- DNS queries go to cached IP, not to your server

### 3. **ISP/Router DNS Cache**
- Your ISP or router may cache DNS responses
- Intermediate DNS servers return cached results
- Your AlewoCallback DNS server is never queried

### 4. **HTTPS Preloading**
- If you enabled SSL, browsers may have HSTS enabled
- Browser directly uses HTTPS without checking DNS
- Cached IP is used automatically

---

## How to Properly Test DNS Queries

To see DNS queries appear in AlewoCallback logs, you MUST use DNS query tools that bypass caching:

### Method 1: Using `dig` (Recommended)

```bash
# Basic A record query
dig @YOUR_SERVER_IP test123.callback.com

# Specify query type
dig @YOUR_SERVER_IP test123.callback.com A

# Query for TXT record
dig @YOUR_SERVER_IP test123.callback.com TXT

# Full verbose output
dig @YOUR_SERVER_IP test123.callback.com +trace
```

**Example:**
```bash
# If your server IP is 203.0.113.50
dig @203.0.113.50 abc123.yourdomain.com
```

**Expected Output:**
```
;; ANSWER SECTION:
abc123.yourdomain.com. 300 IN A 203.0.113.50
```

✅ **This will create a DNS log entry in AlewoCallback!**

---

### Method 2: Using `nslookup`

```bash
# Query specific DNS server
nslookup test123.callback.com YOUR_SERVER_IP

# Interactive mode
nslookup
> server YOUR_SERVER_IP
> test123.callback.com
> exit
```

**Example:**
```bash
nslookup abc123.yourdomain.com 203.0.113.50
```

---

### Method 3: Using `host`

```bash
# Query DNS server
host test123.callback.com YOUR_SERVER_IP

# Verbose output
host -v test123.callback.com YOUR_SERVER_IP
```

---

### Method 4: Using Python/cURL for HTTP (NOT DNS!)

**IMPORTANT:** HTTP requests via browser or curl do NOT generate DNS queries if:
- The IP is already cached
- You're using HTTPS with HSTS
- Your /etc/hosts file has an entry

```bash
# This generates HTTP callback, NOT DNS query
curl http://test123.callback.com/test

# To force DNS lookup, clear cache first:
sudo systemd-resolve --flush-caches  # Linux
sudo killall -HUP mDNSResponder      # macOS
ipconfig /flushdns                    # Windows
```

---

## Understanding HTTP vs DNS Logs

### HTTP Callbacks (What You See in Browser)
When you access `http://test123.callback.com/webhook`:
- ✅ **HTTP Request** logged (GET/POST to /webhook)
- ✅ **HTTP Response** logged (200 OK with body)
- ❌ **DNS Query** NOT logged (unless cache cleared + using your DNS server)

### DNS Queries (What You See with dig/nslookup)
When you run `dig @YOUR_IP test123.callback.com`:
- ✅ **DNS Query** logged (A record for test123.callback.com)
- ❌ **HTTP Request** NOT logged (no HTTP connection made)

**Both are independent!** They appear in separate sections of your logs.

---

## Testing DNS Queries in Production

### Step 1: Find Your Server IP
```bash
# On your server
curl ifconfig.me
```

### Step 2: Update DNS Records (at your domain registrar)

Point your domain's NS records to your server:

```
Type: NS
Name: callback.yourdomain.com
Value: ns1.yourserver.com (pointing to YOUR_SERVER_IP)

Type: A
Name: ns1.yourserver.com
Value: YOUR_SERVER_IP
```

**OR** for testing, configure individual A record:
```
Type: A
Name: *.callback.yourdomain.com
Value: YOUR_SERVER_IP
```

### Step 3: Wait for DNS Propagation (up to 48 hours)

Check propagation:
```bash
# Check global DNS propagation
dig @8.8.8.8 test123.callback.yourdomain.com
dig @1.1.1.1 test123.callback.yourdomain.com
```

### Step 4: Test with Direct DNS Query
```bash
# Query YOUR server directly (bypass cache)
dig @YOUR_SERVER_IP test123.callback.yourdomain.com
```

✅ This WILL show up in AlewoCallback DNS logs!

---

## Clear Browser/System Cache

If HTTP requests don't work or always redirect to HTTPS:

### Clear Browser HSTS Cache

**Chrome/Edge:**
1. Go to: `chrome://net-internals/#hsts`
2. Enter domain: `callback.yourdomain.com`
3. Click "Delete" under "Delete domain security policies"

**Firefox:**
1. Go to: `about:preferences#privacy`
2. Click "Clear Data" → "Clear"
3. Restart browser

### Clear System DNS Cache

**Linux:**
```bash
sudo systemd-resolve --flush-caches
sudo resolvectl flush-caches
```

**macOS:**
```bash
sudo killall -HUP mDNSResponder
sudo dscacheutil -flushcache
```

**Windows:**
```bash
ipconfig /flushdns
```

---

## Quick Test Checklist

✅ **For HTTP Callbacks:**
```bash
# This WILL log HTTP request/response
curl http://test123.callback.com/test
curl https://test123.callback.com/test
```

✅ **For DNS Queries:**
```bash
# This WILL log DNS query
dig @YOUR_SERVER_IP test123.callback.com

# This will NOT log DNS (uses Google DNS)
dig test123.callback.com
```

✅ **For Both:**
```bash
# 1. First, query DNS directly
dig @YOUR_SERVER_IP test123.callback.com

# 2. Then make HTTP request
curl http://test123.callback.com/test

# You should see BOTH in logs:
# - DNS query for test123.callback.com
# - HTTP GET request to /test
```

---

## Common Issues

### Issue 1: "DNS queries not appearing"
**Cause:** Browser/OS DNS cache
**Solution:** Use `dig @YOUR_IP subdomain.domain.com` directly

### Issue 2: "HTTP always redirects to HTTPS"
**Cause:** HSTS enabled from previous visit
**Solution:** Clear HSTS cache (see above)

### Issue 3: "Connection refused"
**Cause:** DNS server not running (port 53 needs root)
**Solution:** Check PM2 logs: `sudo alewo-callback logs`

### Issue 4: "No route to host"
**Cause:** Firewall blocking port 53
**Solution:**
```bash
sudo ufw allow 53/udp
sudo ufw allow 53/tcp
```

---

## Verify DNS Server is Running

```bash
# Check if DNS server is listening on port 53
sudo netstat -tulpn | grep :53

# Expected output:
# udp  0  0  0.0.0.0:53  0.0.0.0:*  12345/node

# Check PM2 status
sudo alewo-callback status

# View DNS server logs
sudo alewo-callback logs
```

If you see "EACCES" or "permission denied", DNS server needs sudo/root to bind port 53.

---

## Summary

| Action | DNS Query Logged? | HTTP Request Logged? |
|--------|------------------|---------------------|
| Browser visit `http://test.domain.com` | ❌ (cached) | ✅ Yes |
| `dig @SERVER_IP test.domain.com` | ✅ Yes | ❌ No |
| `curl http://test.domain.com/api` | ❌ (cached) | ✅ Yes |
| Browser visit (cache cleared) | ✅ Maybe | ✅ Yes |

**Key Takeaway:** To test DNS queries, use `dig`/`nslookup` with your server IP directly!
