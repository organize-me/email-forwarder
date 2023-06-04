import { Readable, once } from "stream";
import SMTPTransport = require("nodemailer/lib/smtp-transport");

export const sendEmail = async (from: string, to: string, stream: Readable) => {
  stream.on("data", (data) => {
    process.stdout.write(data.toString())
  }).on("error", (err: Error) => {
    console.error(err)
  }).on("end", () => {
    console.log("end")
  })

  await once(stream, "close")
}
