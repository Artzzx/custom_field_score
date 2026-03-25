import fs from 'fs';
import path from 'path';
import { ESLintUtils } from '@typescript-eslint/utils';
import { parse as parseYaml } from 'yaml';
const createRule = ESLintUtils.RuleCreator(() => 'https://developer.atlassian.com/platform/forge/ui-kit');
const MANIFEST_FILENAME = 'manifest.yml';
const FRONTEND_DIR = 'src/frontend';
/**
 * Cache parsed manifests by their absolute path to avoid re-reading per file.
 * Key: absolute path to manifest.yml, Value: set of resolved entry-point paths.
 */
const manifestCache = new Map();
/**
 * Cache manifest lookup failures so we don't repeatedly walk up directories.
 * Key: directory path, Value: resolved manifest path or null if not found.
 */
const manifestLookupCache = new Map();
/**
 * Walk up from `startDir` to find manifest.yml.
 */
function findManifestPath(startDir) {
    if (manifestLookupCache.has(startDir)) {
        return manifestLookupCache.get(startDir);
    }
    let dir = startDir;
    const root = path.parse(dir).root;
    while (dir !== root) {
        const candidate = path.join(dir, MANIFEST_FILENAME);
        if (fs.existsSync(candidate)) {
            manifestLookupCache.set(startDir, candidate);
            return candidate;
        }
        dir = path.dirname(dir);
    }
    manifestLookupCache.set(startDir, null);
    return null;
}
/**
 * Parse manifest.yml and return the set of resolved entry-point file paths
 * that are in the frontend directory.
 */
function getEntryPoints(manifestPath) {
    if (manifestCache.has(manifestPath)) {
        return manifestCache.get(manifestPath);
    }
    const entryPoints = new Set();
    try {
        const content = fs.readFileSync(manifestPath, 'utf-8');
        const manifest = parseYaml(content);
        const resources = manifest?.resources;
        if (Array.isArray(resources)) {
            const manifestDir = path.dirname(manifestPath);
            for (const resource of resources) {
                if (typeof resource?.path === 'string') {
                    // Normalise so we can do a reliable comparison with the linted filename
                    const normalised = path.normalize(resource.path);
                    // Only track resources in the frontend directory
                    if (normalised.startsWith(FRONTEND_DIR + path.sep) || normalised.startsWith(FRONTEND_DIR + '/')) {
                        const resolved = path.resolve(manifestDir, normalised);
                        entryPoints.add(resolved);
                    }
                }
            }
        }
    }
    catch {
        // If we can't read/parse the manifest, degrade gracefully
    }
    manifestCache.set(manifestPath, entryPoints);
    return entryPoints;
}
export const requireForgeReconciler = createRule({
    name: 'require-forge-reconciler',
    meta: {
        type: 'problem',
        docs: {
            description: 'Require ForgeReconciler.render() in Forge UI entry-point files referenced by manifest.yml resources',
        },
        schema: [],
        messages: {
            missingRender: 'This file is a Forge UI entry point (referenced in manifest.yml resources) but does not call ForgeReconciler.render(). ' +
                'Without this call, the Forge runtime has nothing to mount and the UI will be blank. ' +
                'Add `ForgeReconciler.render(<YourApp />);` at the end of the file.',
        },
    },
    defaultOptions: [],
    create(context) {
        let hasForgeReconcilerRender = false;
        return {
            // Detect ForgeReconciler.render(...) call expressions
            CallExpression(node) {
                if (node.callee.type === 'MemberExpression' &&
                    node.callee.object.type === 'Identifier' &&
                    node.callee.object.name === 'ForgeReconciler' &&
                    node.callee.property.type === 'Identifier' &&
                    node.callee.property.name === 'render') {
                    hasForgeReconcilerRender = true;
                }
            },
            // Check on exit whether this entry-point file has a render call
            'Program:exit'(node) {
                if (hasForgeReconcilerRender) {
                    return;
                }
                const filename = context.filename ?? context.getFilename();
                if (!filename || filename === '<input>' || filename === '<text>') {
                    return;
                }
                const absolutePath = path.isAbsolute(filename)
                    ? filename
                    : path.resolve(filename);
                const manifestPath = findManifestPath(path.dirname(absolutePath));
                if (!manifestPath) {
                    return;
                }
                const entryPoints = getEntryPoints(manifestPath);
                if (entryPoints.has(absolutePath)) {
                    context.report({
                        node,
                        messageId: 'missingRender',
                    });
                }
            },
        };
    },
});
