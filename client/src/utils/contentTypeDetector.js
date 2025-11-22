/**
 * Auto-detect syntax highlighting language based on Content-Type and content
 * Similar to Burp Suite's intelligent content type detection
 */

export const detectLanguage = (contentType, content) => {
  if (!content) return 'text';

  // Normalize content type
  const ct = (contentType || '').toLowerCase();

  // JSON detection
  if (ct.includes('application/json') || ct.includes('application/ld+json')) {
    return 'json';
  }

  // XML detection
  if (ct.includes('application/xml') ||
      ct.includes('text/xml') ||
      ct.includes('application/soap+xml') ||
      ct.includes('application/xhtml+xml')) {
    return 'xml';
  }

  // HTML detection
  if (ct.includes('text/html')) {
    return 'html';
  }

  // JavaScript detection
  if (ct.includes('application/javascript') ||
      ct.includes('application/x-javascript') ||
      ct.includes('text/javascript')) {
    return 'javascript';
  }

  // CSS detection
  if (ct.includes('text/css')) {
    return 'css';
  }

  // Form data
  if (ct.includes('application/x-www-form-urlencoded')) {
    return 'text'; // URL-encoded params
  }

  // Multipart
  if (ct.includes('multipart/form-data')) {
    return 'text'; // Raw multipart boundary
  }

  // Plain text
  if (ct.includes('text/plain')) {
    return 'text';
  }

  // Binary types
  if (ct.includes('application/octet-stream') ||
      ct.includes('image/') ||
      ct.includes('video/') ||
      ct.includes('audio/')) {
    return 'text'; // Show as hex or base64
  }

  // Auto-detect from content if no content-type
  if (!contentType || contentType === '') {
    const trimmed = content.trim();

    // Try JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        JSON.parse(trimmed);
        return 'json';
      } catch (e) {
        // Not valid JSON
      }
    }

    // Try XML
    if (trimmed.startsWith('<?xml') ||
        (trimmed.startsWith('<') && trimmed.endsWith('>'))) {
      return 'xml';
    }

    // Try HTML
    if (trimmed.match(/<(!DOCTYPE|html|head|body|div|span|p|a|script|style)/i)) {
      return 'html';
    }
  }

  // Default to plain text
  return 'text';
};

/**
 * Get Content-Type from headers (case-insensitive)
 */
export const getContentType = (headers) => {
  if (!headers || typeof headers !== 'object') return '';

  // Check common variations
  return headers['content-type'] ||
         headers['Content-Type'] ||
         headers['CONTENT-TYPE'] ||
         '';
};

/**
 * Format body content for display
 * Handles JSON, XML, form-data, etc.
 */
export const formatBodyContent = (bodyRaw, contentType) => {
  if (!bodyRaw) return '';

  const ct = (contentType || '').toLowerCase();

  // Try to pretty-print JSON
  if (ct.includes('application/json') || ct.includes('application/ld+json')) {
    try {
      const parsed = JSON.parse(bodyRaw);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      // Return as-is if not valid JSON
      return bodyRaw;
    }
  }

  // For XML, HTML, or other text formats, return as-is
  return bodyRaw;
};

/**
 * Generate raw HTTP request format (like Burp Repeater)
 */
export const generateRawHttpRequest = (item) => {
  if (!item) return '';

  const lines = [];

  // Request line
  lines.push(`${item.method || 'GET'} ${item.path || '/'} HTTP/1.1`);

  // Headers
  if (item.headers && typeof item.headers === 'object') {
    Object.entries(item.headers).forEach(([key, value]) => {
      lines.push(`${key}: ${value}`);
    });
  }

  // Empty line before body
  lines.push('');

  // Body
  if (item.bodyRaw) {
    lines.push(item.bodyRaw);
  }

  return lines.join('\n');
};

/**
 * Generate raw HTTP response format (like Burp Repeater)
 */
export const generateRawHttpResponse = (response) => {
  if (!response) return '';

  const lines = [];

  // Status line
  lines.push(`HTTP/1.1 ${response.statusCode || 200} ${response.statusMessage || 'OK'}`);

  // Headers
  if (response.headers && typeof response.headers === 'object') {
    Object.entries(response.headers).forEach(([key, value]) => {
      lines.push(`${key}: ${value}`);
    });
  }

  // Empty line before body
  lines.push('');

  // Body
  if (response.bodyRaw) {
    lines.push(response.bodyRaw);
  }

  return lines.join('\n');
};
