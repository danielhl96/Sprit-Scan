const envRootDomain = import.meta.env['NG_APP_ROOT_DOMAIN'] as string | undefined;
const isLocalHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const NG_APP_ROOT_DOMAIN =
  envRootDomain ||
  (isLocalHost ? 'http://localhost:3010/api/' : 'https://backend.danielhennies.com/api/');
export { NG_APP_ROOT_DOMAIN };
