import fs from 'fs'
import path from 'path'
import { getMergedConfig } from './config.js'
import { fetchDocument, updateDocument, fetchDocuments } from './api.js'
import { loadCache, saveCache, normalizeName } from './utils.js'

/**
 * Pushes local changes to the server while detecting conflicts
 * @param {Object} userConfig The user configuration
 * @param {string} filename The name of the file
 * @param {Object} cachedFile The cached file data
 * @param {string} localCode The local code content
 * @param {Object} connectionParams The connection parameters
 * @param {Object} params The CLI parameters
 * @param {string} folderPath The folder path
 * @returns {Promise<boolean>} Whether the push was successful
 */
export async function pushToServer(userConfig, filename, cachedFile, localCode, connectionParams, params, folderPath) {
    const config = getMergedConfig(userConfig)
    const serverCode = config.transformServer(localCode)

    // Check if there are any changes to push
    if (cachedFile.serverContent === serverCode) {
        if (params.verbose) {
            console.log(`No changes to push for ${filename}`)
        }
        return true
    }

    // Fetch the document from the server to check for modifications
    const [error, serverDoc] = await fetchDocument(config, cachedFile.name, connectionParams)
    if (error) {
        console.error(`Error fetching document ${cachedFile.name}:`, error)
        return false
    }

    // Convert server modified date to string for comparison
    const serverModified = new Date(serverDoc.modified).toISOString()

    // Check if the document has been modified on the server
    if (serverModified !== cachedFile.modified && !params['force-push']) {
        console.warn(`Document ${cachedFile.name} has been modified on the server since last fetch.`)
        console.warn(`Server modified: ${serverModified}, Local modified: ${cachedFile.modified}`)
        console.warn('Use --force-push to push your changes anyway.')
        return false
    }

    // Update the document on the server
    const [updateError, result] = await updateDocument(config, cachedFile.name, serverCode, connectionParams)
    if (updateError) {
        console.error(`Error updating document ${cachedFile.name}:`, updateError)
        return false
    }

    // Update the cache with the new server content and timestamp
    const cache = loadCache(folderPath)
    cache.files[filename] = {
        ...cachedFile,
        serverContent: serverCode,
        modified: new Date(result.modified).toISOString()
    }
    saveCache(folderPath, cache)

    console.log(`Successfully pushed changes for ${filename}`)
    return true
}

/**
 * Saves documents from the server to local files
 * @param {Object} userConfig The user configuration
 * @param {string} folderPath The folder path
 * @param {Object} connectionParams The connection parameters
 * @param {Object} params The CLI parameters
 */
export async function saveToLocal(userConfig, folderPath, connectionParams, params) {
    const config = getMergedConfig(userConfig)
    const cache = loadCache(folderPath)

    // Fetch documents from the server
    const [error, documents] = await fetchDocuments(config, connectionParams)
    if (error) {
        console.error('Error fetching documents:', error)
        return
    }

    // Process each document
    for (const doc of documents) {
        const title = doc[config.title_field]
        const normalizedTitle = normalizeName(title)
        const filename = `${config.prefix}${normalizedTitle}.${config.extension}`
        const filePath = path.join(folderPath, filename)

        // Convert server modified date to string for comparison
        const serverModified = new Date(doc.modified).toISOString()

        // Check if the file exists and has been modified
        const cachedFile = cache.files[filename]
        if (cachedFile) {
            if (serverModified === cachedFile.modified) {
                // If timestamps match, check if we need to push local changes
                if (fs.existsSync(filePath)) {
                    const localCode = fs.readFileSync(filePath, 'utf8')
                    const serverCode = config.transformServer(localCode)

                    if (cachedFile.serverContent !== serverCode) {
                        // Local changes exist, try to push them
                        await pushToServer(userConfig, filename, cachedFile, localCode, connectionParams, params, folderPath)
                    } else if (params.verbose) {
                        console.log(`No changes to push for ${filename}`)
                    }
                }
                continue
            }
            if (serverModified !== cachedFile.modified) {
                console.warn(`Warning: ${filename} has been modified on the server since last fetch.`)
                console.warn(`Server modified: ${serverModified}, Local modified: ${cachedFile.modified}`)
                if (!params['force-pull']) {
                    console.warn('Use --force-pull to overwrite your local changes.')
                    continue
                }
            }
        }

        // Update the cache
        cache.files[filename] = {
            name: doc.name,
            serverContent: doc[config.code_field],
            modified: serverModified
        }

        // Write the transformed code to the file
        const localCode = config.transformLocal(doc[config.code_field])
        fs.writeFileSync(filePath, localCode)
        console.log(`Saved ${filename}`)
    }

    // Save the updated cache
    saveCache(folderPath, cache)
} 