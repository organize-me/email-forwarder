import { expect } from 'chai';

import 'mocha';
import { Address } from '../../main/mapper/models';


describe('email util tests', () => {
    [
        {
            address: "test <test@test.com>",
            expectName: "test",
            expectAddress: "test@test.com"
        },
        {
            address: "Test Name <test.name@test.com>",
            expectName: "Test Name",
            expectAddress: "test.name@test.com"
        },
        {
            address: "test.name@test.com",
            expectName: undefined,
            expectAddress: "test.name@test.com"
        },
    ].forEach((t) => {
        it(`test parse address: ${t.address}`, () => {
            let addr = Address.parse(t.address)
            
            expect(addr.name).eq(t.expectName)
            expect(addr.address).eq(t.expectAddress)
        })
    });

    [
        {
            addressList: "test@test.com, My Name <myname@test.com>",
            expectedNames: [undefined, "My Name"],
            expectAddresses: ["test@test.com", "myname@test.com"]
        }
    ].forEach((t) => {
        it(`test parse address list: ${t.addressList}`, () => {
            
            let addrList = Address.parseList(t.addressList)

            for(const index in addrList) {
                expect(addrList[index].name).eq(t.expectedNames[index])
                expect(addrList[index].address).eq(t.expectAddresses[index])
            }
        }
    )})
});
