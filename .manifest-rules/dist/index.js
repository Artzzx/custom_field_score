/**
 * @my/forge-manifest-rules
 *
 * YAML validation rules for Forge manifest files.
 * Ensures proper configuration for UI Kit modules.
 */
export { validateUiKitModuleStructure, RULE_NAME as UI_KIT_MODULE_STRUCTURE_RULE, } from './rules/ui-kit-module-structure.js';
export { validateStorageScopeStructure, RULE_NAME as STORAGE_SCOPE_STRUCTURE_RULE, } from './rules/storage-scope-structure.js';
export { UI_KIT_MODULES, isUiKitModule } from './schema/native-render-modules.js';
import { validateUiKitModuleStructure } from './rules/ui-kit-module-structure.js';
import { validateStorageScopeStructure } from './rules/storage-scope-structure.js';
/**
 * Validate a Forge manifest YAML string against all rules.
 *
 * @param yamlContent - The raw YAML content of the manifest file
 * @param filePath - Optional path to the manifest file (for error reporting)
 * @returns ValidationResult with errors array
 */
export function validateManifest(yamlContent, filePath) {
    const errors = [];
    // Run all validation rules
    // Note: ui-kit-module-structure is comprehensive and includes the checks from ui-kit-native-renderer
    errors.push(...validateUiKitModuleStructure(yamlContent));
    errors.push(...validateStorageScopeStructure(yamlContent));
    return {
        valid: errors.length === 0,
        errors,
        filePath,
    };
}
/**
 * Format validation errors as human-readable text for agent consumption.
 *
 * @param result - The validation result to format
 * @returns Formatted error string
 */
export function formatValidationErrors(result) {
    if (result.valid) {
        return result.filePath
            ? `✅ Manifest validation passed: ${result.filePath}`
            : '✅ Manifest validation passed';
    }
    const header = result.filePath
        ? `❌ Manifest validation failed: ${result.filePath}`
        : '❌ Manifest validation failed';
    const errorLines = result.errors.map((error, index) => {
        return [
            ``,
            `Error ${index + 1}/${result.errors.length}:`,
            `  Rule: ${error.rule}`,
            `  Location: Line ${error.line}, Column ${error.column}`,
            `  Module: ${error.moduleType} (key: ${error.moduleKey})`,
            `  Problem: ${error.message}`,
            `  Fix: ${error.suggestion}`,
        ].join('\n');
    });
    return [header, ...errorLines, '', `Total errors: ${result.errors.length}`].join('\n');
}
