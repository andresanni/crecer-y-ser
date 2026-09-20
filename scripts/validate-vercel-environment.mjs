const configuredPocketBaseUrl = process.env.VITE_POCKETBASE_URL?.trim();

if (!configuredPocketBaseUrl) {
  throw new Error('VITE_POCKETBASE_URL no está configurada en el entorno de Vercel.');
}

const pocketBaseUrl = new URL(configuredPocketBaseUrl);
const localHostnames = new Set(['localhost', '127.0.0.1', '::1']);

if (pocketBaseUrl.protocol !== 'https:') {
  throw new Error('VITE_POCKETBASE_URL debe usar HTTPS en Vercel.');
}

if (localHostnames.has(pocketBaseUrl.hostname)) {
  throw new Error('VITE_POCKETBASE_URL no puede apuntar a loopback en Vercel.');
}

if (
  pocketBaseUrl.username
  || pocketBaseUrl.password
  || pocketBaseUrl.search
  || pocketBaseUrl.hash
  || pocketBaseUrl.pathname !== '/'
) {
  throw new Error('VITE_POCKETBASE_URL debe contener únicamente el origen público de PocketBase.');
}

console.log(`Entorno Vercel validado para PocketBase en ${pocketBaseUrl.origin}.`);
