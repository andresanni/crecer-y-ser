import PocketBase from 'pocketbase';

const configuredPocketBaseUrl = import.meta.env.VITE_POCKETBASE_URL?.trim();

if (!configuredPocketBaseUrl) {
  throw new Error('Falta configurar VITE_POCKETBASE_URL para este entorno.');
}

const parsedPocketBaseUrl = new URL(configuredPocketBaseUrl);

if (!['http:', 'https:'].includes(parsedPocketBaseUrl.protocol)) {
  throw new Error('VITE_POCKETBASE_URL debe usar el protocolo http o https.');
}

if (
  parsedPocketBaseUrl.username
  || parsedPocketBaseUrl.password
  || parsedPocketBaseUrl.search
  || parsedPocketBaseUrl.hash
  || parsedPocketBaseUrl.pathname !== '/'
) {
  throw new Error('VITE_POCKETBASE_URL debe contener únicamente el origen de PocketBase.');
}

const pb = new PocketBase(parsedPocketBaseUrl.origin);

pb.autoCancellation(false);

export default pb;
