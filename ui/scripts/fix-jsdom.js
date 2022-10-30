import fs from 'fs/promises';
import * as acorn from 'acorn';
import { generate } from 'escodegen';

const UTILS_PATH = 'node_modules/jsdom/lib/jsdom/utils.js';

main();

async function main() {
  const utilsFile = await fs.readFile(UTILS_PATH);
  const utilsAst = acorn.parse(utilsFile.toString(), { ecmaVersion: 2022 });

  removeCanvasImport(utilsAst);
  await fs.writeFile(UTILS_PATH, generate(utilsAst));
}

function removeCanvasImport(ast) {
  const relevantNodes = [];
  for (const node of ast.body) {
    if (isRelevantNode(node)) {
      relevantNodes.push(node);
    }
  }
  ast.body = ast.body.filter((node) => !relevantNodes.includes(node));
}

function isRelevantNode(node) {
  return isCanvasInstalledDeclaration(node) || isTryResolveCanvasStatement(node) || isIfCanvasInstalledStatement(node);
}

function isCanvasInstalledDeclaration(node) {
  const { type, declarations } = node ?? {};
  return type === 'VariableDeclaration' && declarations?.[0].id.name === 'canvasInstalled';
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
