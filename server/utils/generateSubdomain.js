import { nanoid } from 'nanoid';

export const generateRandomSubdomain = () => {
  // Generate a random subdomain using nanoid (URL-safe)
  return nanoid(10).toLowerCase();
};

export const validateSubdomain = (subdomain) => {
  // Allow alphanumeric, hyphens, and dots (for multi-level subdomains)
  // Must start with letter, 3-63 characters total
  // Examples: "test", "test-123", "test.new", "a.b.c"

  if (!subdomain || subdomain.length < 3 || subdomain.length > 63) {
    return false;
  }

  // Must start with a letter
  if (!/^[a-z]/.test(subdomain)) {
    return false;
  }

  // Only allow letters, numbers, hyphens, and dots
  if (!/^[a-z0-9.-]+$/.test(subdomain)) {
    return false;
  }

  // No leading, trailing, or consecutive dots
  if (subdomain.startsWith('.') || subdomain.endsWith('.') || subdomain.includes('..')) {
    return false;
  }

  // No leading, trailing, or consecutive hyphens
  if (subdomain.startsWith('-') || subdomain.endsWith('-') || subdomain.includes('--')) {
    return false;
  }

  // Each label (part between dots) must be valid
  const labels = subdomain.split('.');
  for (const label of labels) {
    // Each label must be 1-63 characters
    if (label.length === 0 || label.length > 63) {
      return false;
    }
    // Each label must start and end with alphanumeric
    if (!/^[a-z0-9]/.test(label) || !/[a-z0-9]$/.test(label)) {
      return false;
    }
  }

  return true;
};
