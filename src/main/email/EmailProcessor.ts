import { AttachmentStream, MailParser, MessageText } from "mailparser";
import { PassThrough, Readable, Writable } from "stream";
import { SESEmailSender as EmailSender } from "./EmailSender";
import { Utils } from "./Utils";
import { EmailWriter } from "./EmailWriter";


export class EmailProcessor {

    private readonly fwdHeaders: {name: string, value: string}[]
    private readonly fwdFrom: string
    private readonly fwdTo: string
    private readonly fwdContentSubtype: string

    private readonly emailWriter: EmailWriter

    constructor(fwdHeaders: {name: string, value: string}[], origHeaders: {name: string, value: string}[]) {
        this.fwdHeaders = fwdHeaders;
        
        const fwdContentType = this.getContentType(fwdHeaders)
        this.fwdContentSubtype = fwdContentType.subtype

        this.fwdFrom = this.getHeader(fwdHeaders, "From").value
        this.fwdTo = this.getHeader(fwdHeaders, "To").value

        this.emailWriter = new EmailWriter(
            fwdContentType.boundary,
            this.getHeader(origHeaders, "From")?.value,
            this.getHeader(origHeaders, "To")?.value,
            this.getHeader(origHeaders, "Cc")?.value
        )
    }

    public async processEmail(inEmail: Readable) {
        const out = new PassThrough()
        const sendInfo = new EmailSender().sendEmail(this.fwdFrom, this.fwdTo, out)

        this.emailWriter.writeHeaders(out, this.fwdHeaders)
        
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
        const contentType = Utils.parseContentType(contentTypeHeader.value)
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
                this.emailWriter.writeMessageText(out, data as MessageText, this.isMixed())
            } else if (data.type === 'attachment') {
                let attachmentStream = data as AttachmentStream
                this.emailWriter.writeAttachment(out, attachmentStream)
            }
        }).on("error", (error: Error) => {
            console.error(error)
            out.emit("error", error)
        }).on("end", () => {
            this.emailWriter.writeEnd(out)
            out.end()
        })
    
        return parser
    }

    private isMixed(): boolean {
        return this.fwdContentSubtype.toLowerCase() === "mixed"
    }
}
