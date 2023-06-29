import { readFile, writeFile } from 'fs/promises';
import { JSDOM } from 'jsdom';
import crypto from 'crypto';

main().catch(console.error);

async function main() {
  const scriptHashes = await calculateScriptHashes();
  const scriptHashesString = scriptHashes.map((s) => `'${s}'`).join(', ');
  await writeFile('csp-script-hashes.js', `export default [${scriptHashesString}];\n`);
}

async function calculateScriptHashes() {
  const decoder = new TextDecoder('utf-8');
  const appHtml = decoder.decode(await readFile('src/app.html'));

  const appDocument = new JSDOM(appHtml).window.document;
  const scriptHashes = [];
  for (const script of appDocument.getElementsByTagName('script')) {
    scriptHashes.push(await calculateScriptHash(script.textContent));
  }

  return scriptHashes;
}

async function calculateScriptHash(scriptText) {
  const textEncoder = new TextEncoder('utf-8').encode(scriptText);
  const hashBuffer = await crypto.subtle.digest('SHA-256', textEncoder);
  const hashString = Buffer.from(hashBuffer).toString('base64');

  return `sha256-${hashString}`;
}
