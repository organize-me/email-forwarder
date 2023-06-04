import nodemailer = require("nodemailer");
import config = require('config');
import { Readable } from "stream";
import SMTPTransport = require("nodemailer/lib/smtp-transport");

export const sendEmail = async (from: string, to: string, stream: Readable): Promise<SMTPTransport.SentMessageInfo> => {
  let smtpConfig = config.get("smtp")

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport(smtpConfig);

  // send mail with defined transport object
  return transporter.sendMail({
    envelope: {
        from: from,
        to: to
    },
    raw: stream
  });
}
