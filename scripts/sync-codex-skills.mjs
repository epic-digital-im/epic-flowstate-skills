#!/usr/bin/env node

import { constants, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(scriptPath), '..');
const sourceRoot = resolve(repoRoot, 'skills');
const defaultTargetRoot = resolve(homedir(), '.codex', 'skills');

const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const dryRun = args.has('--dry-run') || args.has('-n');
const prune = args.has('--prune');
const help = args.has('--help') || args.has('-h');
const targetArg = rawArgs.find((arg) => arg.startsWith('--target='));
const targetRoot = resolve(targetArg ? targetArg.slice('--target='.length) : defaultTargetRoot);

if (help) {
  console.log(`Usage: node scripts/sync-codex-skills.mjs [options]

Sync FlowState skills from this repository into the local Codex skills directory.

Options:
  --dry-run, -n       Show planned changes without copying files
  --prune            Remove installed flowstate-* skills that no longer exist in source
  --target=<path>    Override Codex skills target path
  --help, -h         Show this help

Source: ${sourceRoot}
Default target: ${defaultTargetRoot}
`);
  process.exit(0);
}

function listSkillNames(root) {
  if (!existsSync(root)) {
    return [];
  }

  return readdirSync(root)
    .filter((name) => name.startsWith('flowstate-'))
    .filter((name) => {
      const fullPath = join(root, name);
      return statSync(fullPath).isDirectory() && existsSync(join(fullPath, 'SKILL.md'));
    })
    .sort();
}

function validateSkill(root, name) {
  const skillPath = join(root, name, 'SKILL.md');
  const text = readFileSync(skillPath, 'utf8');
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);

  if (!match) {
    throw new Error(`${skillPath}: missing YAML frontmatter`);
  }

  if (!new RegExp(`^name: ${name}$`, 'm').test(match[1])) {
    throw new Error(`${skillPath}: frontmatter name must match directory name`);
  }

  if (!/^description: .+/m.test(match[1])) {
    throw new Error(`${skillPath}: missing description`);
  }
}

function copySkill(name) {
  const sourcePath = join(sourceRoot, name);
  const targetPath = join(targetRoot, name);

  if (dryRun) {
    const action = existsSync(targetPath) ? 'update' : 'install';
    console.log(`[dry-run] ${action} ${name}`);
    return;
  }

  rmSync(targetPath, { recursive: true, force: true });
  cpSync(sourcePath, targetPath, {
    recursive: true,
    filter: (source) => basename(source) !== '.DS_Store',
  });
  console.log(`synced ${name}`);
}

function pruneOrphan(name) {
  const targetPath = join(targetRoot, name);

  if (dryRun) {
    console.log(`[dry-run] prune ${name}`);
    return;
  }

  rmSync(targetPath, { recursive: true, force: true });
  console.log(`pruned ${name}`);
}

async function main() {
  if (!existsSync(sourceRoot)) {
    throw new Error(`Source skills directory does not exist: ${sourceRoot}`);
  }

  await access(sourceRoot, constants.R_OK);

  if (!dryRun) {
    mkdirSync(targetRoot, { recursive: true });
    await access(targetRoot, constants.W_OK);
  }

  const sourceSkills = listSkillNames(sourceRoot);
  const targetSkills = listSkillNames(targetRoot);
  const sourceSet = new Set(sourceSkills);

  for (const name of sourceSkills) {
    validateSkill(sourceRoot, name);
    copySkill(name);
  }

  const orphans = targetSkills.filter((name) => !sourceSet.has(name));

  if (orphans.length > 0) {
    if (prune) {
      for (const name of orphans) {
        pruneOrphan(name);
      }
    } else {
      console.log(`orphaned installed FlowState skills not pruned: ${orphans.join(', ')}`);
    }
  }

  if (!dryRun) {
    for (const name of sourceSkills) {
      validateSkill(targetRoot, name);
    }
  }

  console.log(`${dryRun ? 'checked' : 'synced'} ${sourceSkills.length} FlowState skills from ${sourceRoot} to ${targetRoot}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
