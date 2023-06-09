import { Writable } from "stream"
import { MAX_LINE_LENGTH, NEWLINE, Utils } from "./Utils"
import { AttachmentStream, MessageText } from "mailparser"
import { Base64Encode } from "base64-stream"
import quotedPrintable = require("quoted-printable")
import { OriginalHeaders } from "./OriginalHeaders"
import utf8 = require("utf8")
import { parse as htmlParse , Node} from 'node-html-parser';
import crypto = require('crypto');

export class EmailWriter {

    private readonly boundry: string
    
    private readonly origFrom: string | undefined
    private readonly origTo: string | undefined
    private readonly origCc: string | undefined

    constructor(
        boundry: string,
        origFrom: string | undefined,
        origTo: string | undefined,
        origCc: string | undefined
    ) {
        this.boundry = boundry
        this.origFrom = origFrom
        this.origTo = origTo
        this.origCc = origCc
    }

    public writeHeaders(out: Writable, headers: {name: string, value: string}[]) {
        for(const header of headers) {
            let fheader = Utils.fold(`${header.name}: ${header.value}`)
            out.write(fheader)
            out.write(NEWLINE)
        }
        out.write(NEWLINE)
    }

    public writeMessageText(out: Writable, messageText: MessageText, isAlternativeContent: boolean) {
        let boundary = this.boundry

        if(isAlternativeContent) {
            // open a new alternative content part
            out.write("--")
            out.write(this.boundry)
            out.write(NEWLINE)

            boundary = "--=_FWD-" + crypto.randomUUID()
            out.write(Utils.fold(`Content-Type: multipart/alternative; boundary="${boundary}"`))
            out.write(NEWLINE)
            out.write(NEWLINE)
        }

        if(messageText.text) {
            this.writeText(out, messageText.text, boundary)
        }

        if(messageText.html && typeof messageText.html==='string') {
            this.writeHtml(out, messageText.html, boundary)
        }

        if(isAlternativeContent) {
            // close alternative content part
            out.write("--")
            out.write(boundary)
            out.write("--")
            out.write(NEWLINE)
        }
    }

    private writeText = (out: Writable, text: string, boundary: string = this.boundry) => {
        console.log("writing text")

        // headers
        out.write("--")
        out.write(boundary)
        out.write(NEWLINE)
        out.write("MIME-Version: 1.0")
        out.write(NEWLINE)
        out.write("Content-Type: text/plain; charset=UTF-8")
        out.write(NEWLINE)
        out.write("Content-Transfer-Encoding: quoted-printable")
        out.write(NEWLINE)
        out.write(NEWLINE)


        out.write(quotedPrintable.encode(utf8.encode(OriginalHeaders.createText(this.origFrom, this.origTo, this.origCc) + text)))
        out.write(NEWLINE)

        console.log("writing text complete")
    }

    private writeHtml = (out: Writable, html: string, boundary: string = this.boundry) => {
        console.log("writing html")

        // headers
        out.write("--")
        out.write(boundary)
        out.write(NEWLINE)
        out.write("MIME-Version: 1.0")
        out.write(NEWLINE)
        out.write("Content-Type: text/html; charset=UTF-8")
        out.write(NEWLINE)
        out.write("Content-Transfer-Encoding: quoted-printable")
        out.write(NEWLINE)
        out.write(NEWLINE)

        out.write(quotedPrintable.encode(utf8.encode(this.insertHeaders(html, OriginalHeaders.createHtmlStyle(), OriginalHeaders.createHtml(this.origFrom, this.origTo, this.origCc)))))
        out.write(NEWLINE)

        console.log("writing html complete")
    }

    public writeAttachment = (out: Writable, attachment: AttachmentStream, boundry: string = this.boundry) => {
        console.log("writing attachment")

        out.write("--")
        out.write(boundry)
        out.write(NEWLINE)
        out.write(Utils.fold(`Content-Type: ${attachment.contentType}; name=${attachment.filename}`))
        out.write(NEWLINE)
        out.write("Content-Transfer-Encoding: base64")
        out.write(NEWLINE)
        out.write(Utils.fold(`Content-Disposition: attachment; filename=${attachment.filename}`))
        out.write(NEWLINE)
        out.write(NEWLINE)
        
        const base64 = new Base64Encode({lineLength: MAX_LINE_LENGTH})

        attachment.content
            .pipe(base64)
            .pipe(out, {end: false})

        base64.on("end", ()=> {
            out.write(NEWLINE, (err) => {
                console.log("writing attachment")
                attachment.release()
            })
        })
    }
    
    public writeEnd = (out: Writable) => {
        out.write("--")
        out.write(this.boundry)
        out.write("--")
        out.write(NEWLINE)
    }

    /**
     * Adds the headers-html as the first child in the html body element.
     * 
     * @param html the html
     * @param headersHtml headers (in html) to add insert into the body
     * @returns 
     *      html with the headers inserted as the first element in the body
     */
    private insertHeaders = (html: string, headerStyleHtml: string, headersHtml: string): string => {
        const styleNode = htmlParse(headerStyleHtml) as Node
        const headersNode = htmlParse(headersHtml) as Node
        const htmlNode = htmlParse(html)
        
        const head = htmlNode.querySelector("head")
        head.appendChild(styleNode)

        const body = htmlNode.querySelector("body")
        const childNodes = body.childNodes

        body.set_content([headersNode].concat(childNodes))

        return htmlNode.removeWhitespace().toString()
    }
}