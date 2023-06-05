# Email-Forwarder
An AWS lambda to forward emails. This allows you to receive emails sent to your AWS managed domain, forwading them to the address of your choosing.

# Prerequisites
 * An AWS account with a domain already set up through Route53
 * [AWS SES setup](https://docs.aws.amazon.com/ses/latest/dg/setting-up.html)

# Infastructure
The deployment process sets up your aws infastructre.

### Cost
For an individual or family, assuming you're already paying for a domain name, the operating costs to recive emails should be close to zero. The following table braks down the cost per month. The breakdown assumes 1000 emails / month with 1 GB of attachments. For private useage, this is more than average.

| Service | Reasion                         | $     | $ Link                                         | $ Breakdown 
|---------|---------------------------------|-------|------------------------------------------------|----------------
| SES     | Recives emails                  | $0.12 | [link](https://aws.amazon.com/ses/pricing/)    | * 1000 Inbound Emails: $0.00<br /> * 1000 Outbound Emails: $0.00<br /> * 1 GB of Attachments: $0.12
| S3      | Persists emails                 | $0.02 | [link](https://aws.amazon.com/s3/pricing/)     | * 1 GB of storage: $0.02 
| SNS     | Notified when email's recived   | $0.00 | [link](https://aws.amazon.com/sns/pricing/)    | * SNS subscription: $0.00
| SQS     | SNS Subscribed, triggers lambda | $0.00 | [link](https://aws.amazon.com/sqs/pricing/)    | * 1000 messages: $0.00
| Lambda  | Forwards recived emails         | $0.00 | [link](https://aws.amazon.com/lambda/pricing/) | * 1000 invokations @ 512MB: $0.00

*Aproximate Total:* $0.14 / month

<sub>*Note that this cost estimation does not include the price of your domain name, which is by far the most expensive paRert of this.</sub>

# Deploy
