import fs from 'fs'
import path from 'path'
import mri from 'mri'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

/**
 * Normalizes a string to snake_case format
 * @param {string} str The string to normalize
 * @returns {string} The normalized string
 */
export function normalizeName(str) {
    return str
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
}

/**
 * Loads or creates cache data for a folder
 * @param {string} folderPath The path to the folder
 * @returns {Object} The cache data
 */
export function loadCache(folderPath) {
    const cachePath = path.join(folderPath, '.frappe_code_cache.json')
    try {
        if (fs.existsSync(cachePath)) {
            return JSON.parse(fs.readFileSync(cachePath, 'utf8'))
        }
    } catch (error) {
        console.warn('Error loading cache:', error.message)
    }
    return { files: {} }
}

/**
 * Saves cache data to a folder
 * @param {string} folderPath The path to the folder
 * @param {Object} cache The cache data to save
 */
export function saveCache(folderPath, cache) {
    const cachePath = path.join(folderPath, '.frappe_code_cache.json')
    try {
        fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2))
    } catch (error) {
        console.warn('Error saving cache:', error.message)
    }
}

/**
 * Loads configuration from a file
 * @param {string} configPath The path to the config file
 * @returns {Object} The loaded configuration
 */
export async function loadConfig(configPath) {
    try {
        if (configPath.endsWith('.js')) {
            // Convert to file URL
            const absolutePath = path.resolve(configPath)
            const fileUrl = new URL(`file://${absolutePath}`).href
            const module = await import(fileUrl)
            return module.default || module
        } else if (configPath.endsWith('.json')) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'))
        }
    } catch (error) {
        console.warn('Error loading config:', error.message)
    }
    return {}
}

/**
 * Gets connection parameters for API requests
 * @param {Object} config The configuration object
 * @returns {Object} The connection parameters
 */
export function getConnectionParams() {
    const url = process.env.FRAPPE_SITE_URL
    const api_key = process.env.FRAPPE_API_KEY
    const api_secret = process.env.FRAPPE_API_SECRET

    if (!url || !api_key || !api_secret) {
        throw new Error('Missing required environment variables: FRAPPE_SITE_URL, FRAPPE_API_KEY, or FRAPPE_API_SECRET')
    }

    // Ensure URL ends with a slash
    const baseURL = url.endsWith('/') ? url : `${url}/`

    return {
        baseURL,
        headers: {
            'Authorization': `token ${api_key}:${api_secret}`
        }
    }
}

/**
 * Gets command line interface parameters
 * @returns {Object} The CLI parameters
 */
export function getCliParams() {
    return mri(process.argv.slice(2), {
        boolean: ['watch', 'force-push', 'force-pull', 'verbose'],
        alias: {
            w: 'watch',
            v: 'verbose'
        },
        default: {
            pattern: '**/.frappe_code.js',
            watch: false,
            'force-push': false,
            'force-pull': false,
            verbose: false
        }
    })
} 