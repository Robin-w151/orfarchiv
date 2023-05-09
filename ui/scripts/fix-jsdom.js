import fs from 'fs/promises';
import * as acorn from 'acorn';
import { generate } from 'escodegen';

const UTILS_PATH = 'node_modules/jsdom/lib/jsdom/utils.js';
const XML_HTTP_REQUEST_IMPL = 'node_modules/jsdom/lib/jsdom/living/xhr/XMLHttpRequest-impl.js';

main().catch(console.log);

async function main() {
  await fixCanvasImport();
  await fixSyncWorkerFileDeclaration();
}

async function fixCanvasImport() {
  const utilsFile = await fs.readFile(UTILS_PATH);
  const utilsAst = acorn.parse(utilsFile.toString(), { ecmaVersion: 2022 });

  removeCanvasImport(utilsAst);
  await fs.writeFile(UTILS_PATH, generate(utilsAst));

  function removeCanvasImport(ast) {
    removeRelevantNodes(ast, isRelevantNode);
  }

  function isRelevantNode(node) {
    return (
      isCanvasInstalledDeclaration(node) || isTryResolveCanvasStatement(node) || isIfCanvasInstalledStatement(node)
    );
  }

  function isCanvasInstalledDeclaration(node) {
    return isVariableDeclaration(node, 'canvasInstalled');
  }

  function isTryResolveCanvasStatement(node) {
    const { type, block } = node ?? {};
    const { object, property } = block?.body?.[0]?.expression?.callee ?? {};
    return type === 'TryStatement' && object?.name === 'require' && property?.name === 'resolve';
  }

  function isIfCanvasInstalledStatement(node) {
    const { type, test } = node ?? {};
    return type === 'IfStatement' && test.name === 'canvasInstalled';
  }
}

async function fixSyncWorkerFileDeclaration() {
  const xmlHttpRequestImplFile = await fs.readFile(XML_HTTP_REQUEST_IMPL);
  const xmlHttpRequestImplAst = acorn.parse(xmlHttpRequestImplFile.toString(), { ecmaVersion: 2022 });

  removeSyncWorkerFileDeclaration(xmlHttpRequestImplAst);
  await fs.writeFile(XML_HTTP_REQUEST_IMPL, generate(xmlHttpRequestImplAst));

  function removeSyncWorkerFileDeclaration(ast) {
    removeRelevantNodes(ast, isRelevantNode);
  }

  function isRelevantNode(node) {
    return isVariableDeclaration(node, 'syncWorkerFile');
  }
}

function isVariableDeclaration(node, name) {
  const { type, declarations } = node ?? {};
  return type === 'VariableDeclaration' && declarations?.[0].id.name === name;
}

function removeRelevantNodes(ast, isRelevantNode) {
  const relevantNodes = [];
  for (const node of ast.body) {
    if (isRelevantNode(node)) {
      relevantNodes.push(node);
    }
  }
  ast.body = ast.body.filter((node) => !relevantNodes.includes(node));
}
