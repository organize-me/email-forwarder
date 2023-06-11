import { Address } from "./ForwardMapper"
import { NEWLINE, Utils } from "./Utils"

export namespace OriginalHeaders {

  /**
   * Constructs the original headers for the text part of the email.
   * 
   * @param from The "from" header from the orginal email
   * @param to The "to" header from the orginal email
   * @param cc The "cc" header from the orginal cc
   * @returns The original headers as text
   */
  export const createText = (from: string | undefined, to: string | undefined, cc: string | undefined): string => {
    let value = ""
    if(from) {
      value += `From: ${from}` + NEWLINE
    }
    if(to) {
      value += `To: ${to}` + NEWLINE
    }
    if(cc) {
      value += `Cc: ${cc}` + NEWLINE
    }

    value += NEWLINE

    return value
  }


  export const createHtmlStyle = () => `
    <style>
      div.email-headers {
        style="padding: 3px 3px 10px 3px !important"
      }
      .email-headers table {
        background-color: #FFFFFF !important;
        box-shadow: 0 0 9px 0px #FFFFFF !important;
        border-radius: 4px !important;
      }
      .email-headers span, .email-headers a {
        color: #808080 !important;
        font-size: 12px !important;
      }
      .email-headers span.header-name {
        padding-right: 10px !important;
      }
    </style>
  `

  /**
   * Constructs the original headers for the html part of the email.
   * 
   * @param from The "from" header from the orginal email
   * @param to The "to" header from the orginal email
   * @param cc The "cc" header from the orginal cc
   * @returns The original headers as html
   */
  export const createHtml = (from: string | undefined, to: string | undefined, cc: string | undefined): string => `
  <div class="email-headers">
    <table>
      <tbody>
        ${ from ? `
        <tr>
            <td><em><span class="header-name">From: </span></em></td>
            <td><em><span>${createLinks(from)}</span></em></td>
        </tr>
        `:''}

        ${ to ? `
        <tr>
            <td><em><span class="header-name">To: </span></em></td>
            <td><em><span>${createLinks(to)}</span></em></td>
        </tr>
        `:''}
        
        ${ cc ? `
        <tr>
            <td><em><span class="header-name">Cc: </span></em></td>
            <td><em><span>${createLinks(cc)}</span></em></td>
        </tr>
        `:''}
      </tbody>
    </table>
  </div>
  `
}

const createLinks = (addresses: string): string => {
  const addressList = Address.parseList(addresses)
  const linkList = [] as string[]

  for(const address of addressList) {
    if(address.name) {
      linkList.push(`<a href="mailto:${Utils.escapeHtml(address.address)}">${Utils.escapeHtml(address.name)}</a>`)
    } else {
      linkList.push(`<a href="mailto:${Utils.escapeHtml(address.address)}">${Utils.escapeHtml(address.address)}</a>`)
    }
  }

  return linkList.toString()
}