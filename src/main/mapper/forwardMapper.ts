import config = require('config');
import { EmailEvent } from "./models";

export const toForwardHeaders = (event: EmailEvent): {name: string, value: string}[] => {
    const values: {name: string, value: string}[] = []
    const mapping = findMapping(event.mail.destination)
    const headers = createHeaderMap(event)

    // Date
    values.push({
        name: "Date",
        value: event.mail.timestamp
    })

    // From
    values.push({
        name: "From",
        value: mapping.from
    })

    // To
    values.push({
        name: "To",
        value: mapping.to
    })

    // Subject
    values.push({
        name: "Subject",
        value: event.mail.commonHeaders.subject
    })

    // Mime-Version
    const mimeVersion = headers.get("mime-version")
    if(mimeVersion) {
        values.push({
            name: mimeVersion.name,
            value: mimeVersion.value
        })
    }

    // Content-Type
    const contentType = headers.get("content-type")
    if(contentType) {
        values.push({
            name: contentType.name,
            value: contentType.value
        })
    }

    // Importance
    const importance = headers.get("importance")
    if(importance) {
        values.push({
            name: importance.name,
            value: importance.value
        })
    }
    
    return values
}

function findMapping(destination: string[]): {to: string, from: string} {
    if(destination.length!=1) {
        throw new Error("unexpected number of destination addresses")
    }
    let whoFor = destination[0].toLowerCase()

    const mappings = config.get("mappings")
    let mapping: any = mappings[Object.keys(mappings).find(k => k.trim().toLowerCase() === whoFor)]

    if(!mapping) {
        throw new Error(`forward mapping could not be found for address: ${whoFor}`)
    }

    return mapping as {to: string, from: string}
}

function createHeaderMap(event: EmailEvent):Map<string, {name: string, value: string}> {
    const map = new Map<string, {name: string, value: string}>()
    
    for(const header of event.mail.headers) {
        map.set(header.name.toLowerCase(), header)
    }

    return map
}
