import PocketBase from 'pocketbase';

const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL || 'https://alumnos-api.duckdns.org';

const pb = new PocketBase(pocketbaseUrl);

pb.autoCancellation(false);

export default pb;