import { SQSBatchResponse, SQSEvent, SQSHandler, SQSRecord, SQSBatchItemFailure } from "aws-lambda";

export const handler: SQSHandler = async (event: SQSEvent): Promise<SQSBatchResponse> => {
    
    // kickoff record processing
    let promises: {record: SQSRecord, promise: Promise<void>}[] = []
    for(const record of event.Records) {
        promises.push({
            record: record,
            promise: handleRecord(record)
        })
    }

    // wait for record processing
    let batchItemFailures: SQSBatchItemFailure[] = []
    for(const p of promises) {
        try {
            await p.promise
        } catch(e) {
            batchItemFailures.push({
                itemIdentifier: p.record.messageId
            })
        }
    }

    // return failed records
    return {
        batchItemFailures: batchItemFailures
    }
}

const handleRecord = async(record: SQSRecord): Promise<void> => {

}