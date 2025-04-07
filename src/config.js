import _ from 'lodash'

/**
 * Default configurations for different file extensions and doctypes
 */
export const defaults = {
    // Extension-based handlers
    extensions: {
        py: {
            transformLocal: (code) => {
                // Uncomment any line that ends with # editor-only
                return code
                    .split('\n')
                    .map(line => line.endsWith('# editor-only') ? line.replace(/^#\s*/, '') : line)
                    .join('\n')
            },
            transformServer: (code) => {
                // Comment out any line that ends with # editor-only
                return code
                    .split('\n')
                    .map(line => line.endsWith('# editor-only') ? `# ${line}` : line)
                    .join('\n')
            }
        },
        js: {
            transformLocal: (code) => {
                // Uncomment any line that ends with // editor-only
                return code
                    .split('\n')
                    .map(line => line.endsWith('// editor-only') ? line.replace(/^\/\/\s*/, '') : line)
                    .join('\n')
            },
            transformServer: (code) => {
                // Comment out any line that ends with // editor-only
                return code
                    .split('\n')
                    .map(line => line.endsWith('// editor-only') ? `// ${line}` : line)
                    .join('\n')
            }
        }
    },
    // Doctype-specific defaults
    doctypes: {
        'Server Script': {
            code_field: 'script',
            title_field: 'title',
            extension: 'py',
            limit: 10
        },
        'Client Script': {
            code_field: 'script',
            title_field: 'title',
            extension: 'js',
            limit: 10
        }
    }
}

/**
 * Gets the merged configuration for a user config
 * @param {Object} userConfig The user configuration object
 * @returns {Object} The merged configuration object
 */
export function getMergedConfig(userConfig) {
    const doctype = userConfig.doctype

    // Get doctype-specific defaults
    const doctypeDefaults = defaults.doctypes[doctype] || {}

    // Determine the extension to use (user config > doctype default)
    const extension = userConfig.extension || doctypeDefaults.extension

    // Get extension-based handlers based on the determined extension
    const extensionHandlers = extension ? defaults.extensions[extension] || {} : {}

    // Create a base config with extension handlers
    const baseConfig = {
        transformLocal: extensionHandlers.transformLocal || (code => code),
        transformServer: extensionHandlers.transformServer || (code => code)
    }

    // Create a config with doctype defaults
    const doctypeConfig = {
        code_field: doctypeDefaults.code_field,
        title_field: doctypeDefaults.title_field,
        extension: doctypeDefaults.extension,
        limit: doctypeDefaults.limit || 10,
        prefix: doctypeDefaults.prefix || ''
    }

    // Merge configurations in order of precedence using Lodash
    return _.defaultsDeep(
        {}, // Target object (empty)
        userConfig, // User config (highest priority)
        doctypeConfig, // Doctype defaults
        baseConfig // Extension handlers
    )
} 