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


  /**
   * Constructs the original headers for the html part of the email.
   * 
   * @param from The "from" header from the orginal email
   * @param to The "to" header from the orginal email
   * @param cc The "cc" header from the orginal cc
   * @returns The original headers as html
   */
  export const createHtml = (from: string | undefined, to: string | undefined, cc: string | undefined): string => `
  <div style="padding: 3px 3px 10px 3px">
    <table style="background-color: #FFFFFF; box-shadow: 0 0 9px 0px #FFFFFF; border-radius: 4px">
      <tbody>
        ${ from ? `
        <tr>
            <td><em><span style="color: #808080 !important; font-size: 12px; padding-right: 10px">From: </span></em></td>
            <td><em><span style="color: #808080 !important; font-size: 12px">${Utils.escapeHtml(from)}</span></em></td>
        </tr>
        `:''}

        ${ to ? `
        <tr>
            <td><em><span style="color: #808080 !important; font-size: 12px; padding-right: 10px">To: </span></em></td>
            <td><em><span style="color: #808080 !important; font-size: 12px">${Utils.escapeHtml(to)}</span></em></td>
        </tr>
        `:''}
        
        ${ cc ? `
        <tr>
            <td><em><span style="color: #808080 !important; font-size: 12px; padding-right: 10px">Cc: </span></em></td>
            <td><em><span style="color: #808080 !important; font-size: 12px">${Utils.escapeHtml(cc)}</span></em></td>
        </tr>
        `:''}
      </tbody>
    </table>
  </div>
  `
}
