import { SQSBatchResponse, SQSEvent, SQSHandler, SQSRecord, SQSBatchItemFailure } from "aws-lambda";

import fs = require('fs');
import nodemailer = require("nodemailer");
import { EmailReader } from "./email/emailReader";
import { writeEmail } from "./email/emailWriter";
import { Readable, PassThrough } from "stream";
import { mapToForwardHeaders } from "./mapper/forwardMapper";

export const handler: SQSHandler = async (event: SQSEvent): Promise<SQSBatchResponse> => {

    const batchItemFailures: SQSBatchItemFailure[] = []
    testString()
    await Promise.all(event.Records.map(async r => {
        try {
            await anotherTest()
            //await handleRecord(r)
        } catch(e) {
            console.error(e)

            batchItemFailures.push({
                itemIdentifier: r.messageId
            })
        }
    }))

    return {
        batchItemFailures: batchItemFailures
    }
}

const handleRecord = async(record: SQSRecord): Promise<void> => {

}

function testString() {
    let str = "the value is ${val}"
    let instructions = `return \`${str}\``

    //var func = new Function('var', instructions)
    var func = new Function('val' , instructions)


    console.log(func(22, 33))
}

const anotherTest = async() => {
    const fileStream = fs.createReadStream('./src/test/data/cc-test.eml');
    
    let data = await new EmailReader().read(fileStream)
    let forwardHeaders = mapToForwardHeaders(data.headers)

    let stream = new PassThrough()
    
    // send email using stream (async)
    let send = sendEmail(forwardHeaders.getFirst("to").value, stream)
    
    // write email to stream
    writeEmail({
        headers: forwardHeaders,
        body: data.body
    }, stream)
    
    // wait for send to complete
    
    let info = await send
    console.log(`message sent: ${info.messageId}`)
    console.log(`response: ${info.response}`)
}

const sendEmail = async (to: string, stream: Readable) => {

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "localhost",
    port: 1025,
    secure: false,
    
    tls: {
        rejectUnauthorized: false
    }
  });

  // send mail with defined transport object
  return transporter.sendMail({
    envelope: {to:to},
    raw: stream
  });
}
