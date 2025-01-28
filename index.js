/* eslint-disable no-console */
/* eslint-disable antfu/no-top-level-await */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import chokidar from 'chokidar'
import dotenv from 'dotenv'
import fg from 'fast-glob'
import _ from 'lodash'
import mri from 'mri'
import { ofetch } from 'ofetch'
import pDebounce from 'p-debounce'

const CODE_EDITOR_HINT = 'FCE-EDITOR'

/**
 * Retrieves CLI parameters with default values for pattern, watch mode, production, and force.
 * @returns {{ pattern: string, shouldWatch: boolean }} The parsed CLI parameters.
 */
function getCliParams() {
    const argv = mri(process.argv.slice(2))
    return {
        pattern: argv.pattern || argv._?.[0] || '**/*.{py,sql,html,css,scss,jinja-html}',
        shouldWatch: argv.w || argv.watch || false,
    }
}

/**
 * Get connection parameters.
 * @returns {{ baseURL: string, headers: { Authorization: string }}} Connection parameters for API requests.
 */
function getConnectionParams() {
    return {
        baseURL: process.env.FRAPPE_SITE_URL,
        headers: {
            Authorization: `token ${process.env.FRAPPE_API_KEY}:${process.env.FRAPPE_API_SECRET}`,
        },
    }
}

function getFileContent(filepath) {
    const relativePath = path.join(process.env.FRAPPE_CODE_PATH, filepath)
    const fileContent = fs.readFileSync(relativePath, 'utf8')
    if (!fileContent.includes(CODE_EDITOR_HINT))
        return
    return fileContent
}

function getCodeBlocks(content) {
    const lines = content.split('\n')

    const result = []
    let currentHeader = null
    let currentText = []

    function saveCurrentHeader() {
        if (currentHeader) {
            const headerArgs = currentHeader.split(CODE_EDITOR_HINT)[1].trim()
            const parts = headerArgs.match(/"([^"]*(?:""[^"]*)*)"|(\S+)/g).map((part) => {
                // Handle quoted strings: Remove outer quotes and replace "" with "
                if (part.startsWith('"')) {
                    return part.slice(1, -1).replace(/""/g, '"')
                }
                return part // Unquoted part remains as is
            })
            const args = mri(parts)

            result.push({
                args,
                code: currentText.join('\n').trim(),
            })
        }
    }

    lines.forEach((line) => {
        // Check if the line is a header
        if (line.includes(CODE_EDITOR_HINT)) {
            // Save the previous header and its text before starting a new one
            saveCurrentHeader()

            currentHeader = line.trim() // Update the current header
            currentText = [] // Reset the text for the new header
        }
        else if (currentHeader) {
            // Collect lines of text until the next header
            currentText.push(line)
        }
    })

    // Add the last header and text after finishing the loop
    saveCurrentHeader()

    return result
}

async function fetchDocumentField(doctype, docname, docfield, connectionParams) {
    const url = `api/resource/${doctype}/${encodeURIComponent(docname)}`
    try {
        const response = await ofetch(url, connectionParams)
        return [undefined, response.data[docfield]]
    }
    catch (error) {
        return [error, undefined]
    }
}

async function updateDocument(doctype, docname, docfield, code, connectionParams) {
    const url = `api/resource/${doctype}/${encodeURIComponent(docname)}`
    try {
        const response = await ofetch(url, { ...connectionParams, method: 'PUT', body: {
            [docfield]: code,
        } })
        return [undefined, response.data]
    }
    catch (error) {
        return [error, undefined]
    }
}

async function processCodeBlock(codeBlock, connectionParams) {
    console.info(`${codeBlock.args.doctype}:${codeBlock.args.docname}:${codeBlock.args.docfield} - Fetching`)
    const [error, currentCode] = await fetchDocumentField(codeBlock.args.doctype, codeBlock.args.docname, codeBlock.args.docfield, connectionParams)
    if (error)
        console.error(`${codeBlock.args.doctype}:${codeBlock.args.docname}:${codeBlock.args.docfield} - Failed to fetch`)
    if (currentCode !== codeBlock.code) {
        console.info(`${codeBlock.args.doctype}:${codeBlock.args.docname}:${codeBlock.args.docfield} - Pushing changes`)
        const [error] = await updateDocument(codeBlock.args.doctype, codeBlock.args.docname, codeBlock.args.docfield, codeBlock.code, connectionParams)
        if (error)
            console.error(`${codeBlock.args.doctype}:${codeBlock.args.docname}:${codeBlock.args.docfield} - Failed to update`)
        console.log(`${codeBlock.args.doctype}:${codeBlock.args.docname}:${codeBlock.args.docfield} - Updated`)
    }
    else {
        console.info(`${codeBlock.args.doctype}:${codeBlock.args.docname}:${codeBlock.args.docfield} - No changes detected`)
    }
}

async function processConsoleBlock(codeBlock, connectionParams) {
    if (codeBlock.args.clear)
        console.clear()
    console.log('Running console block...')
    console.time('Console block run')
    console.log('')
    const url = `api/method/frappe.desk.doctype.system_console.system_console.execute_code`
    try {
        const response = await ofetch(url, {
            ...connectionParams,
            method: 'POST',
            body: {
                doc: JSON.stringify({
                    'type': codeBlock.args.type,
                    'commit': codeBlock.args.commit ? 1 : 0,
                    'doctype': 'System Console',
                    'console': codeBlock.code,
                }),
            },
        })
        if (response._debug_messages) {
            const lines = JSON.parse(response._debug_messages)
            for (const line of lines) {
                console.log(line)
            }
        }
        else if (response?.message?.output) {
            console.log(response.message.output)
        }
        else {
            console.log('No output')
        }
    }
    catch (error) {
        console.error(error)
    }
    console.log('')
    console.timeEnd('Console block run')
}

async function processFile(filepath, connectionParams) {
    const content = getFileContent(filepath)
    if (!content)
        return
    const codeBlocks = getCodeBlocks(content)
    for (const codeBlock of codeBlocks) {
        if (codeBlock.args.doctype)
            await processCodeBlock(codeBlock, connectionParams)
        if (codeBlock.args.console)
            await processConsoleBlock(codeBlock, connectionParams)
    }
}

/**
 * Main function to process files and optionally set up a file watcher for changes.
 * This function:
 * - Loads environment variables using dotenv.
 * - Parses CLI parameters.
 * - Processes matched files based on the specified pattern.
 * - Optionally watches files for changes and reprocesses them if needed.
 */
async function main() {
    // Load environment variables from the .env file, overriding any pre-existing ones
    dotenv.config({ override: true })

    // Retrieve command-line parameters (pattern, watch flag, production flag)
    const params = getCliParams()

    // Set up API connection parameters based on whether the environment is production or development
    const connectionParams = getConnectionParams()

    // Find all files matching the pattern specified in CLI parameters
    const filepaths = fg.sync(params.pattern, { cwd: process.env.FRAPPE_CODE_PATH })

    // Process each file and get the code blocks using for...of for proper async handling
    for (const filepath of filepaths) {
        await processFile(filepath, connectionParams)
    }

    // If watch mode is not enabled, terminate here
    if (!params.shouldWatch)
        return

    // Watch mode: set up a file watcher to detect changes and reprocess files if needed
    console.log('\nWatching for changes...')

    const watcherBundle = filepaths.map((filepath) => {
        return {
            filepath,
            processChanges: pDebounce(async () => {
                console.log(`File changed: ${filepath}`)
                await processFile(filepath, connectionParams)
            }, 1000),
        }
    })
    const watcherDict = _.keyBy(watcherBundle, 'filepath')

    // Initialize file watcher using chokidar, watching for changes in the relevant file paths
    const watcher = chokidar.watch(watcherBundle.map((bundle) => bundle.filepath), {
        persistent: true,
        usePolling: true,
        cwd: process.env.FRAPPE_CODE_PATH,
    })

    // When a file changes, reprocess the corresponding bundle
    watcher.on('change', (filepath) => {
        watcherDict[filepath].processChanges()
    })
}

await main()
