import { SQSBatchResponse, SQSEvent, SQSHandler, SQSRecord, SQSBatchItemFailure } from "aws-lambda";

export const handler: SQSHandler = async (event: SQSEvent): Promise<SQSBatchResponse> => {

    const batchItemFailures: SQSBatchItemFailure[] = []

    return Promise.all(event.Records.map(r => {
        try {
            return handleRecord(r);
        } catch (e) { 
            batchItemFailures.push({
                itemIdentifier: r.messageId
            })
        }
    })).then(() => {
        return {
            batchItemFailures: batchItemFailures
        }
    })
}

const handleRecord = async(record: SQSRecord): Promise<void> => {
    console.info(JSON.stringify(record))
}
