import { nanoid } from 'nanoid';

export const generateRandomSubdomain = () => {
  // Generate a random subdomain using nanoid (URL-safe)
  return nanoid(10).toLowerCase();
};

export const validateSubdomain = (subdomain) => {
  // Only allow alphanumeric and hyphens, must start with letter
  const regex = /^[a-z][a-z0-9-]{2,62}$/;
  return regex.test(subdomain);
};
