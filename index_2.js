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

// Load environment variables from the .env file, overriding any pre-existing ones
dotenv.config({ override: true })

const settings = JSON.parse(fs.readFileSync('settings.json', 'utf8'))

const connectionParams = getConnectionParams()

for (const setting of settings) {
    fs.mkdirSync(setting.path, { recursive: true })
    const docs = await fetchDocuments(setting, connectionParams)
    for (const doc of docs[1]) {
        const normalizedName = normalizeName(doc.name)
        const normalizedTitle = normalizeName(doc[setting.titlefield])
        const filename = (() => {
            if (normalizedName === normalizedTitle)
                return `${normalizedName}.${setting.codefield}.${setting.extension}`
            return `${normalizedTitle}.${normalizeName}.${setting.codefield}.${setting.extension}`
        })()
        const code = doc[setting.codefield]
        const filepath = `${setting.path}/${filename}`
        const exists = fs.existsSync(filepath)
        if (!exists) {
            fs.writeFileSync(filepath, code)
            continue
        }
        const codeblocks = getCodeBlocks(code)
        codeblocks[0].code = code
        fs.writeFileSync(filepath, codeblocks)
    }
}

function normalizeName(name) {
    return name
        .replace(/[^a-z\d]/gi, '_')
        .replace(/_+/g, '_')
        .toLowerCase()
        .trim()
}

function getConnectionParams() {
    return {
        baseURL: process.env.FRAPPE_SITE_URL,
        headers: {
            Authorization: `token ${process.env.FRAPPE_API_KEY}:${process.env.FRAPPE_API_SECRET}`,
        },
    }
}

async function fetchDocuments(settings, connectionParams) {
    const url = `api/resource/${settings.doctype}`
    try {
        const response = await ofetch(url, {
            ...connectionParams,
            query: {
                filters: JSON.stringify(settings.filters),
                fields: JSON.stringify(['name', settings.titlefield, settings.codefield, 'modified']),
            },
        })
        return [undefined, response.data]
    }
    catch (error) {
        return [error, undefined]
    }
}

function getCodeBlocks(content, settings) {
    const lines = content.split('\n')

    const result = []
    let currentHeader = null
    let currentText = []

    function saveCurrentHeader(force = false) {
        if (currentHeader || force) {
            const args = (() => {
                if (currentHeader == null)
                    return {}
                if (!currentHeader.includes(settings.codehint))
                    return {}
                const headerArgs = currentHeader.split(settings.codehint)[1].trim()
                const parts = headerArgs.match(/"([^"]*(?:""[^"]*)*)"|(\S+)/g).map((part) => {
                    // Handle quoted strings: Remove outer quotes and replace "" with "
                    if (part.startsWith('"')) {
                        return part.slice(1, -1).replace(/""/g, '"')
                    }
                    return part // Unquoted part remains as is
                })
                return mri(parts)
            })()

            result.push({
                args,
                code: currentText.join('\n').trim(),
            })
        }
    }

    lines.forEach((line) => {
        // Check if the line is a header
        if (line.includes(settings.codehint)) {
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

    // If there are no headers, return the whole content as a single code block
    if (result.length === 0) {
        currentText = lines
        saveCurrentHeader(true)
    }

    return result
}
