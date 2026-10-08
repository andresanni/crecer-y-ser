import dns from 'node:dns/promises';

const targetArg = process.argv[2]?.toLowerCase();
const isLocal = targetArg === 'local';
const defaultUrl = isLocal ? 'http://127.0.0.1:8090' : 'https://alumnos-api.duckdns.org';
const targetUrl = process.env.TARGET_URL || defaultUrl;

const run = async () => {
  console.log('==================================================');
  console.log(' PocketBase - Diagnóstico de Estado de Servidor');
  console.log(` Destino: ${targetUrl} (${isLocal ? 'Local' : 'Producción VPS'})`);
  console.log('==================================================');

  const parsed = new URL(targetUrl);
  if (parsed.protocol === 'https:') {
    try {
      const addresses = await dns.resolve4(parsed.hostname);
      console.log(`DNS:        ${parsed.hostname} -> ${addresses.join(', ')}`);
    } catch (error) {
      console.warn(`DNS:        Fallo al resolver ${parsed.hostname}: ${error.message}`);
    }
  }

  const startTime = Date.now();
  try {
    const healthResponse = await fetch(`${targetUrl}/api/health`, {
      signal: AbortSignal.timeout(10000),
    });
    const latency = Date.now() - startTime;
    const body = await healthResponse.json();

    if (healthResponse.ok) {
      console.log(`Servicio:   OPERATIVO (HTTP ${healthResponse.status} - ${body.message || 'OK'})`);
      console.log(`Latencia:   ${latency} ms`);
      console.log(`Backup OK:  ${Boolean(body.data?.canBackup)}`);
    } else {
      console.log(`Servicio:   RESPUESTA NO EXITOSA (HTTP ${healthResponse.status})`);
      process.exitCode = 1;
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error(`Servicio:   NO DISPONIBLE / ERROR (${latency} ms)`);
    console.error(`Detalle:    ${error.message}`);
    process.exitCode = 1;
    return;
  }

  if (parsed.protocol === 'https:') {
    const pdfStart = Date.now();
    try {
      const pdfResponse = await fetch(`${targetUrl}/api/cys/pdf/generar`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://crecer-y-ser-ten.vercel.app',
        },
        signal: AbortSignal.timeout(10000),
      });
      const pdfLatency = Date.now() - pdfStart;
      console.log(`Worker PDF: DISPONIBLE (HTTP ${pdfResponse.status} - ${pdfLatency} ms)`);
    } catch {
      const pdfLatency = Date.now() - pdfStart;
      console.log(`Worker PDF: NO RESPONDE (${pdfLatency} ms)`);
    }
  }

  console.log('--------------------------------------------------');
  console.log(`Estado general: ${process.exitCode ? 'DEGRADADO O INACCESIBLE' : 'OPERATIVO'}`);
  console.log('==================================================');
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
