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

    // when we're done reading the email body, close the out stream
    // If an error is found, forward that error to the out stream
    once(email.body, "close").catch((e:Error) => {
        out.emit("error", e)
    }).finally(() => {
        out.end()
        out.destroy()
    })

    // pipe the email body to the out stream
    email.body.pipe(out)
}