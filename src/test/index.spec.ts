import fs = require('fs');
import { expect } from 'chai';
import { SQSBatchResponse } from 'aws-lambda';

import LambdaTester = require('lambda-tester')
import lambda = require('../main/index');
import { mockClient } from "aws-sdk-client-mock";

import 'mocha';
import { DeleteObjectCommand, GetObjectCommand, GetObjectCommandInput, S3Client } from '@aws-sdk/client-s3';
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';

const s3Mock = mockClient(S3Client)
const s3MockRoot = "./src/test/data/mockS3/"

const sesMock = mockClient(SESClient)


beforeEach(() => {
  s3Mock.reset()
  s3Mock.on(GetObjectCommand).callsFake((input: GetObjectCommandInput) => {
    let body = fs.createReadStream(`${s3MockRoot}${input.Bucket}/${input.Key}`)
    
    return {
      Body: body
    }
  })
  s3Mock.on(DeleteObjectCommand).resolves({})

  sesMock.reset()
  sesMock.on(SendRawEmailCommand).callsFake((input: SendRawEmailCommand) => {
    return {
      "$metadata": {
        httpStatusCode: 200
      }
    }
  })
})


describe('Lambda Happy Path', () => {
  [
//      "happy-path.json",
//      "attachment-test.json",
      "cinemark.json",
//      "justhtml.json"
  ].forEach(eventFile => {
    it(`invocation: ${eventFile}`, function() {
      this.timeout(0)
      const event = require(`./data/events/${eventFile}`)
      
      return LambdaTester(lambda.handler)
        .event(event)
        .expectResult( (r: SQSBatchResponse ) => {
          expect( r.batchItemFailures ).to.empty
      });
    })
  })
});
