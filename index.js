/* eslint-disable no-console */
/* eslint-disable antfu/no-top-level-await */

import fs from 'fs'
import path from 'path'
import chokidar from 'chokidar'
import fg from 'fast-glob'
import { getCliParams, getConnectionParams, loadConfig, loadCache } from './src/utils.js'
import { saveToLocal, pushToServer } from './src/sync.js'

/**
 * Main function that processes files and sets up file watcher
 */
async function main() {
    try {
        // Load environment variables and CLI parameters
        const params = getCliParams()
        const configFiles = await fg.glob(params.pattern)

        if (configFiles.length === 0) {
            console.error('No configuration files found matching pattern:', params.pattern)
            process.exit(1)
        }

        // Get connection parameters from environment variables
        const connectionParams = getConnectionParams()

        // Process each config file
        for (const configPath of configFiles) {
            try {
                const folderPath = path.dirname(configPath)
                const userConfig = await loadConfig(configPath)

                if (!userConfig || Object.keys(userConfig).length === 0) {
                    console.error(`Failed to load configuration from ${configPath}`)
                    continue
                }

                console.log(`Processing configuration in /${folderPath}`)

                // Save documents from server to local files
                await saveToLocal(userConfig, folderPath, connectionParams, params)

                // Set up file watcher if needed
                if (params.watch) {
                    const watcher = chokidar.watch(folderPath, {
                        ignored: /(^|[\/\\])\../,
                        persistent: true
                    })

                    watcher.on('change', async (filePath) => {
                        const cache = loadCache(folderPath)
                        const filename = path.basename(filePath)
                        const cachedFile = cache.files[filename]

                        if (cachedFile) {
                            const localCode = fs.readFileSync(filePath, 'utf8')
                            await pushToServer(userConfig, filename, cachedFile, localCode, connectionParams, params, folderPath)
                        }
                    })

                    console.log(`Watching for changes in ${folderPath}`)
                }
            } catch (error) {
                console.error(`Error processing ${configPath}:`, error.message)
            }
        }
    } catch (error) {
        console.error('Fatal error:', error.message)
        process.exit(1)
    }
}

// Run the main function
await main()