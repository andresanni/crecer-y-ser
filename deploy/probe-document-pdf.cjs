const fs = require('node:fs/promises');
const path = require('node:path');

async function renderDocumentProbe(page, outputPath) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => [...document.querySelectorAll('main section[id^="pagina-"] img')].every(img => img.complete && img.naturalWidth > 0));
  await page.waitForFunction(() => [...document.querySelectorAll('[data-dynamic-field] span')].length > 0);
  const source = await page.evaluate(() => {
    const first = document.getElementById('pagina-1');
    const main = first?.parentElement;
    if (!main) throw new Error('No se encontró la plantilla.');
    if (main.querySelector('[data-text-overflow="true"]')) throw new Error('Hay consignas que no caben.');
    const sheets = [...document.styleSheets].filter(sheet => !sheet.href || new URL(sheet.href).origin === location.origin).map(sheet => [...sheet.cssRules].map(rule => rule.cssText).join('\n'));
    const css = sheets.filter(sheet => sheet.includes('--documento-azul')).join('\n');
    if (!css) throw new Error('No se encontraron los estilos documentales.');
    return { html: main.outerHTML, css, origin: location.origin, pages: main.children.length };
  });
  const printPage = await page.context().newPage();
  try {
    await printPage.route(`${source.origin}/__pdf-probe`, route => route.fulfill({ contentType: 'text/html', body: '<html></html>' }));
    await printPage.goto(`${source.origin}/__pdf-probe`);
    await printPage.emulateMedia({ media: 'print' });
    await printPage.setContent(`<html lang="es"><head><meta charset="utf-8"><base href="${source.origin}/"><style>body{margin:0}${source.css}</style></head><body>${source.html}</body></html>`);
    await printPage.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(img => img.decode()));
      if (!document.fonts.check('700 16px "Merriweather Boletin"') || !document.fonts.check('700 16px "Lato Boletin"')) throw new Error('No se cargaron las fuentes oficiales.');
    });
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    const start = performance.now();
    const pdf = await printPage.pdf({ preferCSSPageSize: true, printBackground: true, displayHeaderFooter: false });
    await fs.writeFile(outputPath, pdf);
    return { expectedPages: source.pages, bytes: pdf.length, renderMs: Math.round(performance.now() - start) };
  } finally {
    await printPage.close();
  }
}

module.exports = { renderDocumentProbe };

if (require.main === module) {
  (async () => {
    const [url, output] = process.argv.slice(2);
    if (!url || !output || !process.env.PLAYWRIGHT_MODULE) throw new Error('Indicar URL local, archivo de salida y PLAYWRIGHT_MODULE.');
    if (!['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('La prueba admite sólo una URL local.');
    const { chromium } = require(process.env.PLAYWRIGHT_MODULE);
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(url);
      await page.locator('#pagina-1').waitFor();
      console.log(JSON.stringify(await renderDocumentProbe(page, path.resolve(output))));
    } finally {
      await browser.close();
    }
  })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
