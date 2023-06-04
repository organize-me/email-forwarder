import { SQSBatchResponse, SQSEvent, SQSHandler, SQSRecord, SQSBatchItemFailure } from "aws-lambda";
import { DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { toForwardHeaders } from "./mapper/forwardMapper";
import { EmailProcessor } from "./email/emailProcessor";
import { EmailEvent } from "./mapper/models";


export const handler: SQSHandler = async (event: SQSEvent): Promise<SQSBatchResponse> => {

    const batchItemFailures: SQSBatchItemFailure[] = []
    
    await Promise.all(event.Records.map(async r => {
        try {
            console.info(`${r.messageId}: processing start`)
            await processRecord(r)
            console.info(`${r.messageId}: processing successful`)
        } catch(e) {
            console.error(`${r.messageId}: processing error`)
            console.error(e)

            batchItemFailures.push({
                itemIdentifier: r.messageId
            })
        }

        console.info(`${r.messageId}: message complete`)
    }))
    console.info("batch processing done")

    return {
        batchItemFailures: batchItemFailures
    }
}

const processRecord = async(record: SQSRecord): Promise<void> => {

    console.info(`${record.messageId}: parsing record body`)
    const event = JSON.parse(record.body) as EmailEvent
    const fwdHeaders = toForwardHeaders(event)

    let bucket: string = event.receipt.action.bucketName
    let key = event.receipt.action.objectKey
    console.info(`${record.messageId}: email object: bucket=${bucket} key=${key}`)

    console.info(`${record.messageId}: pulling email object`)
    
    const s3Client = new S3Client({})
    const item = await s3Client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: key
    }))
    let bodyStream = item.Body as Readable

    console.info(`${record.messageId}: sending email`)
    await new EmailProcessor(fwdHeaders, event.mail.headers).processEmail(bodyStream)
}
