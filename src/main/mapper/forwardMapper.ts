import { EmailHeaders } from "../email/models"
import { parseReceived } from "../utils/emailUtils"

import config = require('config');

/**
 * Headers from the original email to forward
 */
const forwardHeaders = [
    "Date",
    "From",
    "To",
    "Subject",
    "MIME-Version",
    "Content-Type",
    "Importance",
]

export const mapToForwardHeaders = (headers: EmailHeaders): EmailHeaders => {
    const receivedFor = findReceivedFor(headers)
    const mapping = findMapping(receivedFor)

    const headerValues: {name: string, value: string}[] = []
    for(const headerName of forwardHeaders) {
        if (headerName.toLowerCase() === "from") {
            headerValues.push({name: "From", value: mapping.from})
        } else if (headerName.toLowerCase() === "to") {
            headerValues.push({name: "To", value: mapping.to})
        } else {
            let header = headers.getFirst(headerName)
            if(header) {
                headerValues.push(header)
            }
        }
    }

    // TODO check that all required headers were defined

    return new EmailHeaders(headerValues)
}

function findReceivedFor(headers: EmailHeaders) {
    let receivedHeaders = headers.get("Received") ?? []
    for(const r of receivedHeaders) {
        let received = parseReceived(r.value)
        if(received.for) {
            return received.for
        }
    }

    throw new Error("failed to who email is for")
}

function findMapping(whoFor: string): {to: string, from: string} {
    whoFor = whoFor.trim().toLowerCase()

    const mappings = config.get("mappings")
    let mapping: any = mappings[Object.keys(mappings).find(k => k.trim().toLowerCase() === whoFor)]

    if(!mapping) {
        throw new Error(`forward mapping could not be found for address: ${whoFor}`)
    }

    return mapping as {to: string, from: string}
}
