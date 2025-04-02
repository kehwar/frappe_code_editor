import { ofetch } from 'ofetch'

/**
 * Fetches documents from the Frappe API
 * @param {Object} config The configuration object
 * @param {Object} connectionParams The connection parameters
 * @returns {Promise<[Error, Array]>} The fetched documents or error
 */
export async function fetchDocuments(config, connectionParams) {
    try {
        const { doctype, filters = [], fields = ['name', 'title', 'script', 'modified'], limit = 10 } = config
        // Ensure baseURL ends with a slash and endpoint doesn't start with one
        const baseURL = connectionParams.baseURL.endsWith('/') ? connectionParams.baseURL : `${connectionParams.baseURL}/`
        const url = new URL(`api/resource/${doctype}`, baseURL)

        if (filters.length) {
            url.searchParams.set('filters', JSON.stringify(filters))
        }
        if (fields.length) {
            url.searchParams.set('fields', JSON.stringify(fields))
        }
        if (limit) {
            url.searchParams.set('limit', limit)
        }

        const response = await ofetch(url.toString(), {
            headers: connectionParams.headers
        })
        return [null, response.data]
    } catch (error) {
        return [error, null]
    }
}

/**
 * Fetches a single document from the Frappe API
 * @param {Object} config The configuration object
 * @param {string} name The document name
 * @param {Object} connectionParams The connection parameters
 * @returns {Promise<[Error, Object]>} The fetched document or error
 */
export async function fetchDocument(config, name, connectionParams) {
    try {
        const { doctype, fields = ['name', 'title', 'script', 'modified'] } = config
        // Ensure baseURL ends with a slash and endpoint doesn't start with one
        const baseURL = connectionParams.baseURL.endsWith('/') ? connectionParams.baseURL : `${connectionParams.baseURL}/`
        const url = new URL(`api/resource/${doctype}/${name}`, baseURL)

        if (fields.length) {
            url.searchParams.set('fields', JSON.stringify(fields))
        }

        const response = await ofetch(url.toString(), {
            headers: connectionParams.headers
        })
        return [null, response.data]
    } catch (error) {
        return [error, null]
    }
}

/**
 * Updates a document in the Frappe API
 * @param {Object} config The configuration object
 * @param {string} name The document name
 * @param {string} code The code to update
 * @param {Object} connectionParams The connection parameters
 * @returns {Promise<[Error, Object]>} The updated document or error
 */
export async function updateDocument(config, name, code, connectionParams) {
    try {
        const { doctype, code_field = 'script' } = config
        // Ensure baseURL ends with a slash and endpoint doesn't start with one
        const baseURL = connectionParams.baseURL.endsWith('/') ? connectionParams.baseURL : `${connectionParams.baseURL}/`
        const url = new URL(`api/resource/${doctype}/${name}`, baseURL)

        const response = await ofetch(url.toString(), {
            method: 'PUT',
            headers: connectionParams.headers,
            body: {
                [code_field]: code
            }
        })
        return [null, response.data]
    } catch (error) {
        return [error, null]
    }
} 