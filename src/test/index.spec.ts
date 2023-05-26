import { expect } from 'chai';
import { SQSBatchResponse } from 'aws-lambda';

import LambdaTester = require('lambda-tester')
import lambda = require('../main/index');

import 'mocha';

describe('Lambda Happy Path', () => {
  [
    "happy-path.json"
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