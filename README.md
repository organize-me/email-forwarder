# Email-Forwarder
Do you have a domain you're managing through AWS? Would you like to use that domain for emails, but you're too cheap to pay the $4.00 a month per user for WorkMail? Then I may have the product for you. This project aims to forward emails sent to your domain to an address of your choosing for as many users as you want!

### Features
 * *Multiple Mappings:* Maybe you'd like to forward emails for more than yourself. With multiple email mappings, you can forward emails for the entire family!
 * *Reply To Sender:* Forwarded emails aren't sent to your target inbox by the sender, they are sent by the forwarding process. Replys to emails, though, are still sent to the orginal sender.
 * *Unmapped Emails Bounced*: Emails sent to an address that isn't mapped gets bounced back to the sender! This will let them know their email was not recived by anyone.
 * *Original Message Headers:* Knowing who sent the email, and who the email was intended for, is important. This forwarder adds the orginal header info to the body of the email, including the orginal `From`, `To`, and `Cc` headers.
 * *Supports Large Attachments:* Large or small, you'll get your attachments! (Up to 40MB, see Limitations)

### Limitations
  * *No Spoofing*: Ideally, the emails you receive in your target inbox would have all of the original headers, like it was sent directly to that address, but this isn't possible in SES. AWS requires emails sent through SES be a verified address or domain.
  * *40 MB Limit*: SES supports emails only up to 40MB.

# Infrastructure
![Infrastructure Diagram](documents/infrastructure.jpeg)

<sub>*note that this diagram is not a complete. The setup also includes Route53 records, policies, and roles.</sub>

### Use-Case 1: Happy Path
 1. User sends an email to our domain, and it gets routed to AWS
 2. SES identifies the domain and processes the email according to our rules
    1. Savs the email to an S3 bucket
    2. Notifies our SNS topic that an email was received
 3. SQS picks up the notification and triggers the lambda.
 4. The Lambda pulls the email from the S3 bucket, processes it, and send it to the target mailbox (via SES), and deletes the email from s3.

### Use-Case 2: Failed to Process
 1. User sends an email to our domain, and it gets routed to AWS
 2. SES identifies the domain and processes the email according to our rules
    1. Savs the email to an S3 bucket
    2. Notifies our SNS topic that an email was received
 3. SQS picks up the notification and triggers the lambda.
 4. The Lambda pulls the email from the S3 bucket and processing fails.
 5. The message is returned to the SQS queue; Go to step 3 and reprocess a variable `x` number of times
 6. When the process fails `x` times, the message is sent to the DLQ
 7. Cloudwatch identifies that a message was added to the DLQ and starts an alert
 8. The cloudwatch alert is sent to the alert SNS topic
 9. An email subscription sends an email, notifying the admin of the alert

# Cost
Assuming you're already paying for a domain name, the added cost should be very close to nothing. For private useage, most should stay within the free-tier.
