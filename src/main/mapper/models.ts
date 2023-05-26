
export class Address {
    public name?: string;
    public address: string

    constructor(params: {name?: string, address: string}) {
        this.name = params.name
        this.address = params.address
    }

    toString(): string {
        return this.name ? `${this.name} <${this.address}>` : this.address
    }

    static parse(address: string): Address {
        address = address.trim()
        
        if(/^.*<.*>$/.test(address)) {
            // name-addr format
            
            let addressStartIndex = address.indexOf('<')
            let addressEndIndex = address.indexOf('>')
            let name = address.substring(0,addressStartIndex).trim()
            let adrs = address.substring(addressStartIndex+1, addressEndIndex).trim()

            return new Address({
                name: name,
                address: adrs
            })
            
        } else {
            // addr-spec format
            
            return new Address({
                address: address
            })
        }
    }

    static parseList(addressList: string): Address[] {
        let addresses = addressList.replace(";", ",").split(",")

        let addressArray = []
        for(const address of addresses) {
            addressArray.push(Address.parse(address))
        }

        return addressArray
    }
}



