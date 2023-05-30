import { SQSBatchResponse, SQSEvent, SQSHandler, SQSRecord, SQSBatchItemFailure } from "aws-lambda";
import { DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import nodemailer = require("nodemailer");
import { EmailReader } from "./email/emailReader";
import { writeEmail } from "./email/emailWriter";
import { Readable, PassThrough } from "stream";
import { mapToForwardHeaders } from "./mapper/forwardMapper";
import config = require('config');


export const handler: SQSHandler = async (event: SQSEvent): Promise<SQSBatchResponse> => {

    const batchItemFailures: SQSBatchItemFailure[] = []
    
    await Promise.all(event.Records.map(async r => {
        try {
            console.info(`${r.messageId}: processing start`)
            await handleRecord(r)
            console.info(`${r.messageId}: processing successful`)
        } catch(e) {
            console.error(`${r.messageId}: processing error`)
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
    const s3Client = new S3Client({})
    
    console.info(`${record.messageId}: parsing record body`)
    let event = JSON.parse(record.body) as SnsEmailEvent
    
    let bucket: string = event.receipt.action.bucketName
    let key = event.receipt.action.objectKey
    console.info(`${record.messageId}: email object: bucket=${bucket} key=${key}`)

    console.info(`${record.messageId}: pulling email object`)
    const item = await s3Client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key
    }))

    let bodyStream = item.Body as Readable

    console.info(`${record.messageId}: parsing headers`)
    let data = await new EmailReader().read(bodyStream)
    
    console.info(`${record.messageId}: mapping headers`)
    let forwardHeaders = mapToForwardHeaders(data.headers)

    let stream = new PassThrough()
    
    // send email using stream (async)
    console.info(`${record.messageId}: sending email stream`)
    let send = sendEmail(forwardHeaders.getFirst("from").value, forwardHeaders.getFirst("to").value, stream)
    
    // write email to stream
    console.info(`${record.messageId}: write email to stream`)
    writeEmail({
        headers: forwardHeaders,
        body: data.body
    }, stream)
    
    // wait for send to complete
    console.info(`${record.messageId}: wait for send`)
    let info = await send
    console.info(`${record.messageId}: message sent: ${info.messageId}`)
    console.info(`${record.messageId}: response: ${info.response}`)

    if(info.rejected.length>0) {
        throw new Error("email rejected")
    }

    // delete
    console.info(`${record.messageId}: deleting email object`)
    s3Client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
    }))
}

const sendEmail = async (from: string, to: string, stream: Readable) => {
    let smtpConfig = config.get("smtp")


  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport(smtpConfig);

  // send mail with defined transport object
  return transporter.sendMail({
    envelope: {
        from: from,
        to: to
    },
    raw: stream
  });
}

interface SnsEmailEvent {
    notificationType: string
    mail: {
        timestamp: string,
        source: string,
        messageId: string,
        destination: string[]
        headersTruncated: boolean
        headers: {name: string, value: string}
        commonHeaders: {
            returnPath: string
            from: string[]
            date: string
            to: string[]
            messageId: string
            subject: string
        }
    }
    receipt: {
        timestamp: string
        processingTimeMillis: number
        recipients: string[]
        spamVerdict: {status: string}
        virusVerdict: {status: string}
        spfVerdict: {status: string}
        dkimVerdict: {status: string}
        dmarcVerdict: {status: string}
        action: {
            type: string
            topicArn: string
            bucketName: string
            objectKey: string
        }
    }
}