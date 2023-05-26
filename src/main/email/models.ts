import { Stream } from "stream"

export interface EmailContentBlock {
    headers: EmailContentHeaders
    data: Stream
}

export interface EmailContentHeaders {
    mimeVersion?: string
    contentType?: string
    contentDescription?: string
    contentDisposition?: string
    contentTransferEncoding?: string
}

export interface EmailReaderCallback {
    onHeader: (headers: Map<string, string>) => void
    onContent: (content: EmailContentBlock) => void
    onEnd: () => void
}

export interface EmailContentType {
    type: string
    subtype: string
    parameters: Map<string, string>
}

/**
 * Represents the email headers.
 * This structures preserves all headers and their display order
 */
export class EmailHeaders implements Iterable<{name: string, value: string}> {
    private headers: {name: string, value: string}[]

    constructor(headers: {name: string, value: string}[]) {
        this.headers = headers
    }

    getAt(index: number) {
        return this.headers[index]
    }

    get(name: string): {name: string, value: string}[] | undefined {
        let value:{name: string, value: string}[] = []
        
        name = name.toLowerCase()
        for(const header of this.headers) {
            if(header.name.toLowerCase() === name) {
                value.push(header)
            }
        }

        return value.length===0 ? undefined : value
    }

    getFirst(name: string): {name: string, value: string} | undefined {
        name = name.toLowerCase()
        for(const header of this.headers) {
            if(header.name.toLowerCase() === name) {
                return header
            }
        }
        return undefined
    }

    size(): number {
        return this.headers.length
    }

    [Symbol.iterator](): Iterator<{ name: string; value: string }, any, undefined> {
        return this.headers[Symbol.iterator]()
    }
}