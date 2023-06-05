# email-forwarder
An AWS lambda to forward emails. This allows you to receive emails sent to your AWS managed domain, forwading them to the address of your choosing.

# prerequisites
 * An AWS account with a domain already set up through Route53
 * [AWS SES setup](https://docs.aws.amazon.com/ses/latest/dg/setting-up.html)

# infastructure
The deployment process sets up your aws infastructre. For an individual or family, assuming you're already paying for a domain name, the operating costs to recive emails should be close to zero.

 * *ses:* Recives emails sent to your domain and puts them in an s3 bucket and notifies sns.
   * ~$0.12 @ 1000 emails/month ([ses costs](https://aws.amazon.com/ses/pricing/)). The estimate is assuming there will be aproximatly 1GB of attachments / 1000 emails
 * *s3:* Recived emails are saved in s3 until they are processed. 
   * ~$0.02 @ 1GB/month; Message ([s3 costs](https://aws.amazon.com/s3/pricing/)). This is a high estimate. It's very unlikly an individual or family will use 1GB/month.
 * *sns/sqs:* After the SES saves the email to s3, it sends a message to SNS where it's picked up by SQS and then the Lambda.
   * ~$0.00 @ 1000 emails/month ([sns costs](https://aws.amazon.com/sns/pricing/) / [sqs costs](https://aws.amazon.com/sqs/pricing/))
 * *lambda:* The lambda processes and forwards emails sent to your domain.
   * ~$0.00 @ 1000 emails/month ([lambda costs](https://aws.amazon.com/lambda/pricing/)).

*Aproximate Total:* $0.14 / month

*Note that this cost estimation does not include the price of your domain name, which is by far the most expensive.*

# deploy
