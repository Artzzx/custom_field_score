import { ESLintUtils } from '@typescript-eslint/utils';
const createRule = ESLintUtils.RuleCreator(() => 'https://developer.atlassian.com/platform/forge/apis-reference/fetch-api-product/#using-asuser');
/**
 * Detects `.asUser()` call chains in Forge resolver/backend code and ensures the developer
 * knows to declare `allowImpersonation: true` on the corresponding scope in manifest.yml.
 *
 * Without `allowImpersonation: true` on the scope, the Forge runtime will throw a silent
 * 401 error when making API calls on behalf of the user.
 */
export const requireAllowImpersonation = createRule({
    name: 'require-allow-impersonation',
    meta: {
        type: 'problem',
        docs: {
            description: 'Require allowImpersonation: true in manifest.yml scopes when using .asUser() API calls',
        },
        messages: {
            missingAllowImpersonation: "'.asUser()' is used here but the corresponding scope in manifest.yml must declare 'allowImpersonation: true'. " +
                'Without this, the Forge runtime will throw a 401 error at runtime. ' +
                'Update your manifest.yml scopes to use object form:\n' +
                '  permissions:\n' +
                '    scopes:\n' +
                '      - name: read:jira-work\n' +
                '        allowImpersonation: true',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node) {
                // Match .asUser() — a member expression call where the method name is 'asUser'
                if (node.callee.type === 'MemberExpression' &&
                    node.callee.property.type === 'Identifier' &&
                    node.callee.property.name === 'asUser' &&
                    node.arguments.length === 0) {
                    context.report({
                        node,
                        messageId: 'missingAllowImpersonation',
                    });
                }
            },
        };
    },
});
