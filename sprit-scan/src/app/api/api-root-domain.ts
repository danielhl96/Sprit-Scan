// import.meta.env is only defined under the Vite/dev tooling. In the
// production (esbuild/Angular application) build it can be undefined, so we
// must guard the access or the app crashes on startup with
// "can't access property ... import.meta.env is undefined".
const importMetaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
const envRootDomain = importMetaEnv?.['NG_APP_ROOT_DOMAIN'];
const isLocalHost =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const NG_APP_ROOT_DOMAIN =
  envRootDomain ||
  (isLocalHost ? 'http://localhost:3010/api/' : 'https://backend.danielhennies.com/api/');
export { NG_APP_ROOT_DOMAIN };
