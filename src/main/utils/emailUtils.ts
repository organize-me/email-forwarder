import { EmailContentType } from "../email/models"

/** CRCF seems to be the standard */
export const newline = "\r\n"

export const fold = (text: string, wsp: "\t"|" " = "\t"):string => {
    // RFC-5322 2.1.1 Line Length Limits
    let maxLineLength = 78

    if(text.length<=maxLineLength) {
        return text
    }

    const words = text.replace(/\s+/g, ' ').split(' ');
    let lineLength = 0;
    
    // use functional reduce, instead of for loop 
    return words.reduce((result: string, word: string | any[]) => {
      if (lineLength + word.length >= maxLineLength) {
        lineLength = word.length;
        return result + `${newline}${wsp}${word}`; // don't add spaces upfront
      } else {
        lineLength += word.length + (result ? 1 : 0);
        return result ? result + ` ${word}` : `${word}`; // add space only when needed
      }
    }, '');
}

export const parseContentType = (contentType: string): EmailContentType => {
    let parts = contentType.split(";").map((e) => e.trim())
    
    let type = parseMimeType(parts.shift())

    let params = new Map<string,string>()
    for(const part of parts) {
        if(!part) {
            continue
        }

        const param = parseMimeParam(part)
        params[param.name] = param.value
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

export const parseReceived = (received: string): {from: string, by: string, via: string, with: string, id: string, for: string, date: string } => {
    /*
        From RFC821
        <time-stamp-line> ::= "Received:" <SP> <stamp> <CRLF>
            <stamp> ::= <from-domain> <by-domain> <opt-info> ";" <daytime>
            <from-domain> ::= "FROM" <SP> <domain> <SP>
            <by-domain> ::= "BY" <SP> <domain> <SP>
            <opt-info> ::= [<via>] [<with>] [<id>] [<for>]
            <via> ::= "VIA" <SP> <link> <SP>
            <with> ::= "WITH" <SP> <protocol> <SP>
            <id> ::= "ID" <SP> <string> <SP>
            <for> ::= "FOR" <SP> <path> <SP>
            <link> ::= The standard names for links are registered with the Network Information Center.
            <protocol> ::= The standard names for protocols are registered with the Network Information Center.
            <daytime> ::= <SP> <date> <SP> <time>
            <date> ::= <dd> <SP> <mon> <SP> <yy>
            <time> ::= <hh> ":" <mm> ":" <ss> <SP> <zone>
            <dd> ::= the one or two decimal integer day of the month in the range 1 to 31.
            <mon> ::= "JAN" | "FEB" | "MAR" | "APR" | "MAY" | "JUN" | "JUL" | "AUG" | "SEP" | "OCT" | "NOV" | "DEC"
            <yy> ::= the two decimal integer year of the century in the range 00 to 99.
    */
    
    const matchFirst= (str: string, regex: RegExp): string | undefined => {
        return regex.exec(str)?.[0]
    }
    
    received = " " + received.trimEnd();

    let fromRegex = /\sfrom\s(.|\n|\r\n)+?(?=\sby\s)/gi
    var from = matchFirst(received, fromRegex)?.substring(" from ".length)?.trim()
    if(from) {
        received = received.substring(fromRegex.lastIndex)
    }

    let byRegex = /\sby\s(.|\n|\r\n)+?(?=(\svia\s|\swith\s|\sid\s|\sfor\s|;))/gi
    var by = matchFirst(received, byRegex)?.substring(" by ".length)?.trim()
    if(by) {
        received = received.substring(byRegex.lastIndex)
    }

    let viaRegex = /\svia\s(.|\n|\r\n)+?(?=(\swith\s|\sid\s|\sfor\s|;))/gi
    var via = matchFirst(received, viaRegex)?.substring(" via ".length)?.trim()
    if(via) {
        received = received.substring(viaRegex.lastIndex)
    }

    let withRegex = /\swith\s(.|\n|\r\n)+?(?=(\sid\s|\sfor\s|;))/gi
    var wth = matchFirst(received, withRegex)?.substring(" with ".length)?.trim()
    if(wth) {
        received = received.substring(withRegex.lastIndex)
    }

    let idRegex = /\sid\s(.|\n|\r\n)+?(?=(\sfor\s|;))/gi
    var id = matchFirst(received, idRegex)?.substring(" id ".length)?.trim()
    if(id) {
        received = received.substring(idRegex.lastIndex)
    }

    var forRegex = /\sfor\s(.|\n|\r\n)+?(?=;)/gi
    var fr = matchFirst(received, forRegex)?.substring(" for ".length)?.trim()
    if(fr) {
        received = received.substring(forRegex.lastIndex)
    }
    
    var dateStartIndex = received.indexOf(";")
    var date = dateStartIndex>=0 ? received.substring(dateStartIndex+1).trim() : undefined

    return {
        from: from,
        by: by,
        via: via,
        with: wth,
        id: id,
        for: fr,
        date: date
    }
}