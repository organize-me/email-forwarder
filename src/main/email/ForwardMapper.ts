import config = require('config');
import { EmailEvent } from '..';
import { Utils } from './Utils';

export namespace ForwardMapper {
    export const toForwardHeaders = (event: EmailEvent): {name: string, value: string}[] => {
        const values: {name: string, value: string}[] = []
        const to = findMappings(event.mail.destination)
        const from = createFrom(event)
        const replyTo = event.mail.commonHeaders.from
        const headers = createHeaderMap(event)
        
    
        // Date
        values.push({
            name: "Date",
            value: event.mail.timestamp
        })
    
        // From
        values.push({
            name: "From",
            value: from
        })

        values.push({
          name: "Reply-To",
          value: replyTo.toString()
        })
    
        // To
        values.push({
            name: "To",
            value: to
        })
    
        // Subject
        values.push({
            name: "Subject",
            value: event.mail.commonHeaders.subject
        })
    
        // Mime-Version
        const mimeVersion = headers.get("mime-version")
        if(mimeVersion) {
            values.push({
                name: mimeVersion.name,
                value: mimeVersion.value
            })
        }
    
        // Content-Type
        const contentType = getContentType(headers)
        if(contentType) {
            values.push({
                name: contentType.name,
                value: contentType.value
            })
        }
    
        // Importance
        const importance = headers.get("importance")
        if(importance) {
            values.push({
                name: importance.name,
                value: importance.value
            })
        }
        
        return values
    }

    function createFrom(event: EmailEvent): string {
        const namePrefix = config.has("name-prefix") ? config.get("name-prefix") : ""
        const newFromAddress = config.get("from")
        const origFrom = event.mail.commonHeaders.from.map(NameAddress.parse)
    
        if(origFrom.length<1) {
            throw new Error("from address not defined")
        }
    
        // We can only support one From. We'll take the name from the first From
        const name = origFrom[0].name ?? origFrom[0].address
        return `${namePrefix} ${name} <${newFromAddress}>`
    }
    
    function findMappings(destination: string[]): string {
        const forwards = config.get("forward")
        const forwardsMap = new Map<string, string>()
        for(const key of Object.keys(forwards)) {
            forwardsMap.set(key.toLowerCase(), forwards[key])
        }
    
        return destination.map(d=>findMapping(d, forwardsMap)).toString()
    }
    
    function findMapping(destination: string, forwards: Map<string, string>): string {
        let whoFor = destination.toLowerCase()
        let mapping = forwards.get(whoFor)
    
        if(!mapping) {
            throw new Error(`forward mapping could not be found for address: ${whoFor}`)
        }
    
        return mapping
    }
    
    function createHeaderMap(event: EmailEvent):Map<string, {name: string, value: string}> {
        const map = new Map<string, {name: string, value: string}>()
        
        for(const header of event.mail.headers) {
            map.set(header.name.toLowerCase(), header)
        }
    
        return map
    }

    function getContentType(headers: Map<string, {name: string, value: string}>): {name: string, value: string} {
      const contentTypeHeader = headers.get("content-type")
      const contentType = Utils.parseContentType(contentTypeHeader.value)

      if(contentType.type.toLowerCase() === "multipart") {
        // if the content type is "multipart, use that header"
        return contentTypeHeader
      } else {
        // if the content type is not "multipart", it's a single entry email. This forwaders, however, only
        // processes multipart emails. Convert to a multipart. A multipart can support a single entry.
        return {
          name: "Content-Type",
          value: `multipart/alternative; boundary="${Utils.createRandomBoundry()}"`
        }
      }
    }
}



export class NameAddress {
    public name?: string;
    public address: string

    constructor(params: {name?: string, address: string}) {
        this.name = params.name
        this.address = params.address
    }

    toString(): string {
        return this.name ? `${this.name} <${this.address}>` : this.address
    }

    static parse(address: string): NameAddress {
        address = address.trim()
        
        if(/^.*<.*>$/.test(address)) {
            // name-addr format
            
            let addressStartIndex = address.indexOf('<')
            let addressEndIndex = address.indexOf('>')
            let name = address.substring(0,addressStartIndex).replaceAll('"', '').trim()
            let adrs = address.substring(addressStartIndex+1, addressEndIndex).replaceAll('"', '').trim()

            return new NameAddress({
                name: name,
                address: adrs
            })
            
        } else {
            // addr-spec format
            
            return new NameAddress({
                address: address
            })
        }
    }

    static parseList(addressList: string): NameAddress[] {
        let addresses = addressList.replace(";", ",").split(",")

        let addressArray = []
        for(const address of addresses) {
            addressArray.push(NameAddress.parse(address))
        }

        return addressArray
    }
}

