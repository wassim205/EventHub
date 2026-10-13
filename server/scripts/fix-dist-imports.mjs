// Le client Prisma généré utilise des imports en `.ts` (convention imposée pour
// que tsx et Jest résolvent les fichiers sans configuration supplémentaire).
// Après compilation, ces chemins n'existent plus : tsc a renommé les fichiers en
// `.js`. On réécrit donc les spécificateurs dans dist/ pour que le code compilé
// soit exécutable par node.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const DIST = fileURLToPath(new URL("../dist", import.meta.url));

const SPECIFIER = /((?:from|import)\s*\(?\s*)(['"])(\.{1,2}\/[^'"]*?)\.ts\2/g;

async function* walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* walk(path);
    } else if (entry.name.endsWith(".js")) {
      yield path;
    }
  }
}

let patched = 0;

for await (const file of walk(DIST)) {
  const source = await readFile(file, "utf8");
  const rewritten = source.replace(SPECIFIER, "$1$2$3.js$2");
  if (rewritten !== source) {
    await writeFile(file, rewritten);
    patched++;
  }
}

console.log(`${patched} fichier(s) corrigé(s) dans dist/`);