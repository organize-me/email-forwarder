import config = require('config');
import { EmailEvent, Address } from "./models";

export const toForwardHeaders = (event: EmailEvent): {name: string, value: string}[] => {
    const values: {name: string, value: string}[] = []
    const to = findMappings(event.mail.destination)
    const from = createFrom(event)
    const headers = createHeaderMap(event)
    

    // Date
    values.push({
        name: "Date",
        value: event.mail.timestamp
    })

    // From
    values.push({
        name: "From",
        value: from
    })

    // To
    values.push({
        name: "To",
        value: to
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

function createFrom(event: EmailEvent): string {
    const namePrefix = config.has("name-prefix") ? config.get("name-prefix") : ""
    const newFromAddress = config.get("from")
    const origFrom = event.mail.commonHeaders.from.map(Address.parse)

    if(origFrom.length<1) {
        throw new Error("from address not defined")
    }

    // We can only support one From. We'll take the name from the first From
    const name = origFrom[0].name ?? origFrom[0].address
    return `${namePrefix} ${name} <${newFromAddress}>`
}


function findMappings(destination: string[]): string {
    const forwards = config.get("forward")
    const forwardsMap = new Map<string, string>()
    for(const key of Object.keys(forwards)) {
        forwardsMap.set(key.toLowerCase(), forwards[key])
    }

    return destination.map(d=>findMapping(d, forwardsMap)).toString()
}

function findMapping(destination: string, forwards: Map<string, string>): string {
    let whoFor = destination.toLowerCase()
    let mapping = forwards.get(whoFor)

    if(!mapping) {
        throw new Error(`forward mapping could not be found for address: ${whoFor}`)
    }

    return mapping
}

function createHeaderMap(event: EmailEvent):Map<string, {name: string, value: string}> {
    const map = new Map<string, {name: string, value: string}>()
    
    for(const header of event.mail.headers) {
        map.set(header.name.toLowerCase(), header)
    }

    return map
}
