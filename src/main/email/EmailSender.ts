import nodemailer = require("nodemailer");
import config = require('config');
import { Readable, once } from "stream";
import { SESClient, CloneReceiptRuleSetCommand, SendRawEmailCommand } from "@aws-sdk/client-ses";

export interface EmailSender {
  sendEmail: (from: string, to: string, stream: Readable) => Promise<MessageInfo>
}

export interface MessageInfo {
  accepted?: string[]
  rejected?: string[]
  pending?: string[]
  response?: string
}


export class NodemailerEmailSender implements EmailSender {
  sendEmail = async (from: string, to: string, stream: Readable): Promise<MessageInfo> => {
    let smtpConfig = config.get("smtp")

    // create reusable transporter object using the default SMTP transport
    let transporter = nodemailer.createTransport(smtpConfig);
  
    // send mail with defined transport object
    const info = await transporter.sendMail({
      envelope: {
          from: from,
          to: to
      },
      raw: stream
    });

    return {
      accepted: info.accepted.map(e => e.toString()),
      rejected: info.accepted.map(e => e.toString()),
      pending: info.accepted.map(e => e.toString()),
      response: info.response
    }
  }
  
}


export class SESEmailSender implements EmailSender {

  private static sesClient = new SESClient({})

  sendEmail = async (from: string, to: string, stream: Readable): Promise<MessageInfo> => {
    const data = await this.toArray(stream)
    
    const command = new SendRawEmailCommand({
      RawMessage: {
        Data: data
      }
    })

    const response = await SESEmailSender.sesClient.send(command)
    return {
      response: response.$metadata.httpStatusCode.toString()
    }
  }

  private toArray = (stream: Readable) => new Promise<Uint8Array>((resolve, reject) => {
    const array = new Array<any>()

    stream.on("data", (chunk) => {array.push(chunk)})
    stream.on("end", () => resolve(new Uint8Array(Buffer.concat(array))))
    stream.on("error", (err: Error) => reject(err))
  })
}

export class StdoutEmailSender implements EmailSender {
  sendEmail = async (from: string, to: string, stream: Readable): Promise<MessageInfo> => {
    stream.on("data", (data) => {
      process.stdout.write(data.toString())
    }).on("error", (err: Error) => {
      console.error(err)
    }).on("end", () => {
      console.log("end")
    })
  
    await once(stream, "close")
    
    return {
      accepted: [],
      rejected: [],
      pending: [],
      response: ""
    }
  }
}
