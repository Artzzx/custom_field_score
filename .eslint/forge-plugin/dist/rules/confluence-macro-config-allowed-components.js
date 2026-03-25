import { ESLintUtils } from '@typescript-eslint/utils';
const createRule = ESLintUtils.RuleCreator(() => 'https://developer.atlassian.com/platform/forge/ui-kit');
// Only these components are allowed in Confluence macro config UI
const ALLOWED_CONFIG_COMPONENTS = new Set([
    'Checkbox',
    'CheckboxGroup',
    'DatePicker',
    'Label',
    'RadioGroup',
    'Select',
    'Textfield',
    'TextArea',
    'UserPicker',
    'Fragment', // React fragments are allowed for layout
]);
function getComponentName(node) {
    if (node.type === 'JSXFragment') {
        return 'Fragment';
    }
    if (node.type === 'JSXElement' && node.openingElement.name.type === 'JSXIdentifier') {
        const name = node.openingElement.name.name;
        // Skip HTML intrinsic elements (lowercase names like 'option', 'div', etc.)
        if (name[0] === name[0].toLowerCase() && name !== name.toUpperCase()) {
            return null;
        }
        return name;
    }
    return null;
}
function isAllowedInConfig(componentName) {
    return ALLOWED_CONFIG_COMPONENTS.has(componentName);
}
function traverseJSXChildren(node, callback) {
    const children = node.type === 'JSXFragment' ? node.children : node.children;
    if (!children)
        return;
    children.forEach((child) => {
        if (child.type === 'JSXElement' || child.type === 'JSXFragment') {
            callback(child);
            traverseJSXChildren(child, callback);
        }
    });
}
export const confluenceMacroConfigAllowedComponents = createRule({
    name: 'confluence-macro-config-allowed-components',
    meta: {
        type: 'problem',
        docs: {
            description: 'Enforce that Confluence macro configuration UI only uses allowed UI Kit components',
        },
        fixable: 'code',
        messages: {
            notAllowedInConfig: '{{componentName}} is not allowed in Confluence macro config UI. Only these components are allowed: Checkbox, CheckboxGroup, DatePicker, Label, RadioGroup, Select, Textfield, TextArea, UserPicker',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node) {
                // Look for ForgeReconciler.addConfig(...) calls
                if (node.callee.type === 'MemberExpression' &&
                    node.callee.object.type === 'Identifier' &&
                    node.callee.object.name === 'ForgeReconciler' &&
                    node.callee.property.type === 'Identifier' &&
                    node.callee.property.name === 'addConfig' &&
                    node.arguments.length > 0) {
                    const configArg = node.arguments[0];
                    // Check if the argument is a JSX element
                    if (configArg.type === 'JSXElement' || configArg.type === 'JSXFragment') {
                        validateConfigUI(configArg, context);
                    }
                }
            },
        };
    },
});
function validateConfigUI(configNode, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
context) {
    // First, check the root element itself (unless it's a Fragment)
    if (configNode.type === 'JSXElement') {
        const rootComponentName = getComponentName(configNode);
        if (rootComponentName && !isAllowedInConfig(rootComponentName)) {
            context.report({
                node: configNode,
                messageId: 'notAllowedInConfig',
                data: { componentName: rootComponentName },
            });
            return; // If root is invalid, don't check children
        }
    }
    // Then check all children recursively
    traverseJSXChildren(configNode, (child) => {
        const componentName = getComponentName(child);
        if (!componentName)
            return;
        // Check if component is allowed
        if (!isAllowedInConfig(componentName)) {
            context.report({
                node: child,
                messageId: 'notAllowedInConfig',
                data: { componentName },
            });
        }
    });
}
