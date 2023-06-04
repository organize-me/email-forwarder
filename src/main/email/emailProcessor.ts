import { AttachmentStream, MailParser, MessageText } from "mailparser";
import { PassThrough, Readable, Writable } from "stream";
import { sendEmail } from "./emailSender";
//import { sendEmail } from "./emailPrinter";
import { escapeHtml, fold, maxLineLength, newline, parseContentType } from "../utils/emailUtils";
import { parse as htmlParse , Node} from 'node-html-parser';
import {Base64Encode} from 'base64-stream';

import crypto = require('crypto');
import utf8 = require('utf8');
import quotedPrintable = require('quoted-printable');

export class EmailProcessor {

    private readonly fwdHeaders: {name: string, value: string}[]
    private readonly fwdFrom: string
    private readonly fwdTo: string
    private readonly fwdContentType: string
    private readonly fwdContentSubtype: string
    private readonly fwdBoundry: string

    private readonly origFrom: string
    private readonly origTo: string

    constructor(fwdHeaders: {name: string, value: string}[], origHeaders: {name: string, value: string}[]) {
        this.fwdHeaders = fwdHeaders;
        
        const fwdContentType = this.getContentType(fwdHeaders)
        this.fwdContentType = fwdContentType.type
        this.fwdContentSubtype = fwdContentType.subtype
        this.fwdBoundry = fwdContentType.boundary

        this.fwdFrom = this.getHeader(fwdHeaders, "From").value
        this.fwdTo = this.getHeader(fwdHeaders, "To").value

        this.origFrom = this.getHeader(origHeaders, "From").value
        this.origTo = this.getHeader(origHeaders, "To").value
    }

    public async processEmail(inEmail: Readable) {
        const out = new PassThrough()
        const sendInfo = sendEmail(this.fwdFrom, this.fwdTo, out)

        this.writeHeaders(out)
        
        const parser = this.setupMailParser(out)
        inEmail.pipe(parser)

        const info = await sendInfo
        // TODO log info
    }

    private getContentType(headers: {name: string, value: string}[]): {type: string, subtype: string, boundary} {
        const contentTypeHeader = this.getHeader(headers, "Content-Type")
        if(!contentTypeHeader) {
            throw new Error("content-type not defined")
        }
        const contentType = parseContentType(contentTypeHeader.value)
        const boundary = contentType.parameters.get("boundary")
        
        if(boundary) {
            return  {
                type: contentType.type,
                subtype: contentType.subtype,
                boundary: boundary
            }
        } else {
            throw new Error("boundry not defined")
        }
    }

    private getHeader(headers: {name: string, value: string}[], key: string): {name: string, value: string} | undefined {
        key = key.toLowerCase()
        for(const header of headers) {
            if(key == header.name.toLowerCase()) {
                return header
            }
        }
        return undefined;
    }

    private setupMailParser(out: Writable): MailParser {
        let parser = new MailParser({})
        
        parser.on('data', (data: AttachmentStream | MessageText) => {
            if (data.type == 'text') {
                this.writeMessageText(out, data as MessageText)
            } else if (data.type === 'attachment') {
                let attachmentStream = data as AttachmentStream
                this.writeAttachment(out, attachmentStream)
            }
        }).on("error", (error: Error) => {
            console.error(error)
            out.emit("error", error)
        }).on("end", () => {
            this.writeEnd(out)
            out.end()
        })
    
        return parser
    }

    private writeHeaders(out: Writable) {
        for(const header of this.fwdHeaders) {
            let fheader = fold(`${header.name}: ${header.value}`)
            out.write(fheader)
            out.write(newline)
        }
        out.write(newline)
    }

    private writeMessageText(out: Writable, messageText: MessageText) {
        const isMixed = this.fwdContentSubtype.toLowerCase() == "mixed"
        let boundary = this.fwdBoundry

        if(isMixed) {
            // if mixed, add a new alternative part with a new boundry            
            out.write("--")
            out.write(this.fwdBoundry)
            out.write(newline)

            boundary = "--=_FWD-" + crypto.randomUUID()
            out.write(fold(`Content-Type: multipart/alternative; boundary="${boundary}"`))
            out.write(newline)
            out.write(newline)
        }

        if(messageText.text) {
            this.writeText(out, messageText.text, boundary)
        }

        if(messageText.html && typeof messageText.html==='string') {
            this.writeHtml(out, messageText.html, boundary)
        }

        if(isMixed) {
            // close our alternative part
            out.write("--")
            out.write(boundary)
            out.write("--")
            out.write(newline)
        }
    }

    private writeText(out: Writable, text: string, boundary: string) {
        console.log("writing text")

        // headers
        out.write("--")
        out.write(boundary)
        out.write(newline)
        out.write("MIME-Version: 1.0")
        out.write(newline)
        out.write("Content-Type: text/plain; charset=UTF-8")
        out.write(newline)
        out.write("Content-Transfer-Encoding: quoted-printable")
        out.write(newline)
        out.write(newline)


        out.write(quotedPrintable.encode(utf8.encode(this.createOrignalHeadersText() + text)))
        out.write(newline)

        console.log("writing text complete")
    }

    private writeHtml(out: Writable, html: string, boundary: string) {
        console.log("writing html")

        // headers
        out.write("--")
        out.write(boundary)
        out.write(newline)
        out.write("MIME-Version: 1.0")
        out.write(newline)
        out.write("Content-Type: text/html; charset=UTF-8")
        out.write(newline)
        out.write("Content-Transfer-Encoding: quoted-printable")
        out.write(newline)
        out.write(newline)

        out.write(quotedPrintable.encode(utf8.encode(this.insertHeaders(html, this.createOrignalHeadersHtml()))))
        out.write(newline)

        console.log("writing html complete")
    }

    private writeAttachment(out: Writable, attachment: AttachmentStream) {
        console.log("writing attachment")

        out.write("--")
        out.write(this.fwdBoundry)
        out.write(newline)
        out.write(fold(`Content-Type: ${attachment.contentType}; name=${attachment.filename}`))
        out.write(newline)
        out.write("Content-Transfer-Encoding: base64")
        out.write(newline)
        out.write(fold(`Content-Disposition: attachment; filename=${attachment.filename}`))
        out.write(newline)
        out.write(newline)
        

        const base64 = new Base64Encode({lineLength: maxLineLength})

        attachment.content
            .pipe(base64)
            .pipe(out, {end: false})

        base64.on("end", ()=> {
            console.log("writing attachment complete")
            
            out.write(newline, (err) => {
                console.log("???")
                attachment.release()
            })
        })
    }

    private writeEnd(out: Writable) {
        out.write("--")
        out.write(this.fwdBoundry)
        out.write("--")
        out.write(newline)
    }

    private createOrignalHeadersText(): string {
        return `From: ${this.origFrom}` + newline +
               `To: ${this.origTo}` + newline +
                newline
    }

    private createOrignalHeadersHtml(): string {
        return `
            <div>
                <p><span style="font-size: small; color: #808080;">From: ${escapeHtml(this.origFrom)}</span></p>
                <p><span style="font-size: small; color: #808080;">To: ${escapeHtml(this.origTo)}</span></p>
            </div>`
    }

    /**
     * Adds the headers-html as the first child in the html body element.
     * 
     * @param html the html
     * @param headersHtml headers (in html) to add insert into the body
     * @returns 
     *      html with the headers inserted as the first element in the body
     */
    private insertHeaders(html: string, headersHtml: string): string {
        const headersNode = htmlParse(headersHtml) as Node
        const htmlNode = htmlParse(html)
        
        const body = htmlNode.querySelector("body")
        const childNodes = body.childNodes

        body.set_content([headersNode].concat(childNodes))

        return htmlNode.removeWhitespace().toString()
    }
}
