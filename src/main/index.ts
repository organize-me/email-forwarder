import { SQSBatchResponse, SQSEvent, SQSHandler, SQSRecord, SQSBatchItemFailure } from "aws-lambda";
import { DeleteObjectCommand, GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Readable } from "stream";
import { ForwardMapper } from "./email/ForwardMapper";
import { EmailProcessor } from "./email/EmailProcessor";


export const handler: SQSHandler = async (event: SQSEvent): Promise<SQSBatchResponse> => {

    const batchItemFailures: SQSBatchItemFailure[] = []
    
    for(const r of event.Records) {
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
    }
    
    console.info("batch processing done")

    return {
        batchItemFailures: batchItemFailures
    }
}

const processRecord = async(record: SQSRecord): Promise<void> => {

    console.info(`${record.messageId}: parsing record body`)
    const event = JSON.parse(record.body) as EmailEvent
    const fwdHeaders = ForwardMapper.toForwardHeaders(event)

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

    await s3Client.send(new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
    }))
}


export interface EmailEvent {
    notificationType: string
    mail: {
        timestamp: string,
        source: string,
        messageId: string,
        destination: string[]
        headersTruncated: boolean
        headers: {name: string, value: string}[]
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
