# Email-Forwarder
This is a system for forwarding emails received by AWS's Simple Email Service to an external mail-service, such as gmail. This project is the lambda that processes emails as well as the terraform to setup the aws infrastructure. The goal is to support email forwarding without requiring a lot of ramp-up, or a deep understanding of AWS.

### Features
 * *Multiple Mappings:* Maybe you'd like to forward emails for more than yourself. With multiple email mappings, you can forward emails for the entire family!
 * *Reply To Sender:* Forwarded emails aren't sent to your target inbox by the sender, they are sent by the forwarding lambda process. Replays to emails, though, are still sent to the original sender.
 * *Unmapped Emails Bounced*: Emails sent to an address that isn't mapped gets bounced back to the sender! This will let them know their email was not received by anyone.
 * *Original Message Headers:* Knowing who sent the email, and who the email was intended for, is important. If the email's html is parseable, this forwarder adds the original header info to the body of the email, including the original `From`, `To`, and `Cc` headers.
 * *Supports Large Attachments:* Large or small, you'll get your attachments! (Up to 10MB, see Limitations)

### Limitations
  * *No Spoofing*: Ideally, the emails you receive in your target inbox would have all of the original headers, like it was sent directly to that address, but this isn't possible in SES. AWS requires emails sent through SES be a verified address or domain.
  * *10 MB Limit*: javascript SES client currently only supports emails up to 10MB.

# Infrastructure
![Infrastructure Diagram](documents/infrastructure.jpeg)

<sub>*note that this diagram is not a complete. The setup also includes Route53 records, policies, and roles.</sub>

### Use-Case 1: Happy Path
 1. User sends an email to our domain, and it gets routed to AWS
 2. SES identifies the domain and processes the email according to our rules
    1. Saves the email to an S3 bucket
    2. Notifies our SNS topic that an email was received
 3. SQS picks up the notification and triggers the lambda.
 4. The Lambda pulls the email from the S3 bucket, processes it, and send it to the target mailbox (via SES), and deletes the email from s3.

### Use-Case 2: Failed to Process
 1. User sends an email to our domain, and it gets routed to AWS
 2. SES identifies the domain and processes the email according to our rules
    1. Saves the email to an S3 bucket
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
