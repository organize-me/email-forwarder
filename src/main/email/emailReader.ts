import { PassThrough, Readable, Writable } from "stream";
import readline = require('readline');
import { newline } from "../utils/emailUtils";
import { EmailHeaders } from "./models";

export class EmailReader {

    constructor() {
    }

    read = async (input: Readable): Promise<{headers: EmailHeaders, body: Readable}> => new Promise((resolve, reject) => {

        // init state machine
        var stateNode: StateNode  = new HeaderStateNode(resolve, reject)

        const rl = readline.createInterface({
            input: input,
            crlfDelay: Infinity,
        })
        rl.on("line", (line: string) => {
            if(stateNode.process(line)) {
                stateNode = stateNode.goNext()
            }
        })
        rl.on("error", (error: Error) => {
            stateNode.error(error)
        })
        rl.on("close", () => { 
            stateNode.eof()
        })
    })
}

interface StateNode {

    /**
     * Processes the next available line
     * 
     * @param line the next line to process
     * @returns `true` if processing is done. `false` if further processing is needed
     */
    process: (line: string) => boolean
    
    /**
     * Returns the next state node.
     * @returns 
     *      The next state node
     */
    goNext: () => StateNode

    /**
     * Tells the state node that an error occurd
     */
    error: (error: Error) => void

    /**
     * Tells the state node that the end-of-file was found
     */
    eof: () => void
}

/**
 * Parses the email's main headers
 */
class HeaderStateNode implements StateNode {
    public value: EmailHeaders
    
    private parser = new HeaderParser()

    private resolve: (value: {headers: EmailHeaders, body: Readable}) => void
    private reject: (reasion: any) => void

    constructor(resolve: (value: {headers: EmailHeaders, body: Readable})=>void, reject: (reasion: any)=>void) {
        this.resolve = resolve
        this.reject = reject
    }

    public process = (line: string) => {
        var headers = this.parser.next(line)
        if(headers) {
            this.value = headers
            return true
        } else {
            return false
        }
    }

    public goNext(): StateNode {
        // As soon as we're done parsing the headers, resolve the promise.
        // Processing will continue. Further events will be reported through the steam

        let stream = new PassThrough()

        this.resolve({
            headers: this.value,
            body: stream
        })

        return new StreamStateNode(stream)
    }

    public eof() {
        this.reject(new Error("EOF unexspectidaly reached"))
    }
    public error(error: Error) {
        this.reject(error)
    }
}

/**
 * Streams the remaining content.
 */
class StreamStateNode implements StateNode {
    private stream: Writable

    constructor(stream: Writable) {
        this.stream = stream
    }

    public process(line: string) {
        this.stream.write(line)
        this.stream.write(newline)
        return false
    }
    
    public goNext(): StateNode {
        throw Error("Unexspected State Change Request")
    }

    public eof() {
        this.stream.end()
    }
    
    public error(error: Error) {
        this.stream.emit("error", error)
    }
}


class HeaderParser {
    headers: {name: string, value: string}[] = []
    current: {name: string, value: string} = undefined

    next(line: string): EmailHeaders | undefined {
        if(!line) {
            // end
            if(this.current) {
                this.submitCurrentHeader()
            }

            // parsing done
            return new EmailHeaders(this.headers)
        } else if(this.current && /^[ \t]+.*$/.test(line)) {
            // unfold header value
            this.current.value += " " + line.trim()
        } else {
            // new header value
            let seperatorIndex = line.indexOf(":")
            if(seperatorIndex>=0) {
                if(this.current) {
                    // New header found
                    this.submitCurrentHeader()
                }

                this.current = {
                    name: line.substring(0, seperatorIndex).trim(),
                    value: line.substring(seperatorIndex+1).trim()
                }
            }
        }

        // parsing still in progress
        return undefined
    }

    private submitCurrentHeader() {
        this.headers.push({
            name: this.current.name,
            value: this.current.value
        })
        this.current = undefined
    }
}
