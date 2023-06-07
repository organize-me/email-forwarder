
/** CRCF seems to be the standard */
export const NEWLINE = "\r\n"


export const MAX_LINE_LENGTH = 78


export namespace Utils {

    export const fold = (text: string, wsp: "\t"|" " = "\t"):string => {
        // RFC-5322 2.1.1 Line Length Limits
    
        if(text.length<=MAX_LINE_LENGTH) {
            return text
        }
    
        const words = text.replace(/\s+/g, ' ').split(' ');
        let lineLength = 0;
        
        // use functional reduce, instead of for loop 
        return words.reduce((result: string, word: string | any[]) => {
          if (lineLength + word.length >= MAX_LINE_LENGTH) {
            lineLength = word.length;
            return result + `${NEWLINE}${wsp}${word}`; // don't add spaces upfront
          } else {
            lineLength += word.length + (result ? 1 : 0);
            return result ? result + ` ${word}` : `${word}`; // add space only when needed
          }
        }, '');
    }
    
    export const parseContentType = (contentType: string): {type: string, subtype: string, parameters: Map<string, string>} => {
        let parts = contentType.split(";").map((e) => e.trim())
        
        let type = parseMimeType(parts.shift())
    
        let params = new Map<string,string>()
        for(const part of parts) {
            if(!part) {
                continue
            }
    
            const param = parseMimeParam(part)
            params.set(param.name, param.value)
        }
    
        return {
            type: type.type,
            subtype: type.subtype,
            parameters: params
        }
    }
    
    const parseMimeType = (mimetype: string): {type: string, subtype: string} => {
        const index = mimetype.indexOf('/')
        if(index<0) {
            throw Error("incorrect mime type format")
        }
    
        let type = mimetype.substring(0, index).trim().toLowerCase()
        let subtype = mimetype.substring(index+1).trim().toLocaleLowerCase()
    
        return {
            type: type,
            subtype: subtype
        }
    }
    
    const parseMimeParam = (param: string): {name: string, value: string} => {
        let index = param.indexOf("=")
        if(index<0) {
            throw Error("incorrect mime param format")
        }
    
        let name = param.substring(0, index).trim().toLowerCase()
        let value = param.substring(index+1).trim()
    
        if(value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length-1)
        }
    
        return {
            name: name,
            value: value
        }
    }
    
    export const escapeHtml = (unsafe: string) => {
        return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
    }
}

