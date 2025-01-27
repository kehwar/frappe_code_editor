import antfu from '@antfu/eslint-config'

const stylistic = { indent: 4, quotes: 'single' }

export default antfu(
    {
        stylistic,
        languageOptions: {
            globals: {
                frappe: true,
                cur_frm: true,
                cur_dialog: true,
                _: true,
                __: true,
                p: true,
            },
        },
        ignorePatterns: ['**/*.toml'],
    },
    ..._eslintConfig(),
    ..._importsConfig(),
    ..._stylisticConfig(stylistic),
    ..._unicornConfig(),
)

function _eslintConfig() {
    return [
        {
            files: ['**/*.?([cm])[jt]s?(x)', '**/*.vue'],
            rules: {
                'camelcase': 'off',
                'no-multi-assign': 'error',
            },
        },
    ]
}
function _importsConfig() {
    return [
        {
            files: ['**/*.?([cm])[jt]s?(x)', '**/*.vue'],
            rules: {
                'import/newline-after-import': ['error', { considerComments: false } ],
                'import/consistent-type-specifier-style': ['error', 'prefer-top-level'],
            },
        },
    ]
}
function _stylisticConfig(stylistic) {
    const { quotes, indent } = stylistic
    return [
        {
            files: ['**/*.?([cm])[jt]s?(x)', '**/*.vue'],
            rules: {
                'style/array-bracket-newline': ['error', { multiline: true } ],
                'style/array-bracket-spacing': [
                    'error',
                    'never',
                    { arraysInArrays: true, objectsInArrays: true, singleValue: false },
                ],
                'style/array-element-newline': ['error', 'consistent'],
                'style/arrow-parens': ['error', 'always'],
                'style/func-call-spacing': 'error',
                'style/indent': [
                    'error',
                    indent,
                    {
                        ArrayExpression: 1,
                        CallExpression: { arguments: 1 },
                        FunctionDeclaration: { body: 1, parameters: 1 },
                        FunctionExpression: { body: 1, parameters: 1 },
                        ImportDeclaration: 1,
                        MemberExpression: 1,
                        ObjectExpression: 1,
                        SwitchCase: 1,
                        VariableDeclarator: 1,
                        flatTernaryExpressions: false,
                        ignoreComments: false,
                        ignoredNodes: [
                            'TemplateLiteral *',
                            'JSXElement',
                            'JSXElement > *',
                            'JSXAttribute',
                            'JSXIdentifier',
                            'JSXNamespacedName',
                            'JSXMemberExpression',
                            'JSXSpreadAttribute',
                            'JSXExpressionContainer',
                            'JSXOpeningElement',
                            'JSXClosingElement',
                            'JSXFragment',
                            'JSXOpeningFragment',
                            'JSXClosingFragment',
                            'JSXText',
                            'JSXEmptyExpression',
                            'JSXSpreadChild',
                            'TSTypeParameterInstantiation',
                            'FunctionExpression > .params[decorators.length > 0]',
                            'FunctionExpression > .params > :matches(Decorator, :not(:first-child))',
                            'ClassBody.body > PropertyDefinition[decorators.length > 0] > .key',
                        ],
                        offsetTernaryExpressions: false,
                        outerIIFEBody: 1,
                    },
                ],
                'style/lines-around-comment': [
                    'error',
                    {
                        afterBlockComment: false,
                        beforeBlockComment: true,

                        afterLineComment: false,
                        beforeLineComment: true,

                        allowArrayStart: true,
                        allowBlockStart: true,
                        allowClassStart: true,
                        allowEnumStart: true,
                        allowInterfaceStart: true,
                        allowModuleStart: true,
                        allowObjectStart: true,
                        allowTypeStart: true,
                        applyDefaultIgnorePatterns: true,
                        ignorePattern: '^\\s*[@^].*$',
                    },
                ],
                'style/quotes': ['error', quotes, { allowTemplateLiterals: true, avoidEscape: true } ],
                'style/quote-props': ['error', 'consistent'],
                'style/no-tabs': 'off',
            },
        },
    ]
}
function _unicornConfig() {
    return [
        {
            files: ['**/*.?([cm])[jt]s?(x)', '**/*.vue'],
            rules: {
                'unicorn/better-regex': ['error', { sortCharacterClasses: false } ],
                'unicorn/catch-error-name': 'error',
                'unicorn/consistent-destructuring': 'error',
                'unicorn/consistent-function-scoping': 'error',
                'unicorn/explicit-length-check': 'error',
                'unicorn/new-for-builtins': 'error',
                'unicorn/no-array-callback-reference': 'error',
                'unicorn/no-array-push-push': 'error',
                'unicorn/no-array-reduce': 'error',
                'unicorn/no-await-expression-member': 'error',
                'unicorn/no-empty-file': 'off',
                'unicorn/no-lonely-if': 'error',
                'unicorn/no-useless-fallback-in-spread': 'error',
                'unicorn/no-useless-undefined': 'error',
                'unicorn/numeric-separators-style': 'error',
                'unicorn/prefer-date-now': 'error',
                'unicorn/prefer-module': 'error',
                'unicorn/prefer-optional-catch-binding': 'error',
                'unicorn/prefer-set-has': 'error',
                'unicorn/prefer-string-slice': 'error',
                'unicorn/prefer-ternary': 'error',
                'unicorn/switch-case-braces': ['error', 'always'],
            },
        },
        {
            files: ['**/*.md/*.?([cm])[jt]s?(x)', '**/*.md/*.vue'],
            rules: {
                'unicorn/filename-case': 'off',
            },
        },
    ]
}
