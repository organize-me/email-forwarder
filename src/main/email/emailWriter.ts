import { Readable, Writable, once } from "stream";
import { fold, newline } from "../utils/emailUtils";
import { EmailHeaders } from "./models";


export const writeEmail = (email: {headers: EmailHeaders, body: Readable}, out: Writable) => {
    // write the headers to the out stream
    for(const header of email.headers) {
        let fheader = fold(`${header.name}: ${header.value}`)
        out.write(fheader)
        out.write(newline)
    }
    out.write(newline)

    // pipe the email body to the out stream
    email.body.pipe(out, {
        end: true
    })
}