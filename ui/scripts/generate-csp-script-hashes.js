import { readFile, writeFile } from 'fs/promises';
import { JSDOM } from 'jsdom';
import crypto from 'crypto';

main().catch(console.error);

async function main() {
  const scriptHashes = await calculateScriptHashes();
  await writeFile('csp-script-hashes.js', `export default ${JSON.stringify(scriptHashes)};\n`);
}

async function calculateScriptHashes() {
  const decoder = new TextDecoder('utf-8');
  const appHtml = decoder.decode(await readFile('src/app.html'));

  const appDocument = new JSDOM(appHtml).window.document;
  const appearanceScript = appDocument.getElementsByTagName('script')[0];
  const appearanceScriptHash = await calculateScriptHash(appearanceScript.textContent);

  return [appearanceScriptHash];
}

async function calculateScriptHash(scriptText) {
  const textEncoder = new TextEncoder('utf-8').encode(scriptText);
  const hashBuffer = await crypto.subtle.digest('SHA-256', textEncoder);
  const hashString = Buffer.from(hashBuffer).toString('base64');

  return `sha256-${hashString}`;
}
