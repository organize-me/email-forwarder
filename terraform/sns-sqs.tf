// --== SNS ==-- //
// Creates the topic. SES will send this topic a message after it saves the email to our s3 bucket
resource "aws_sns_topic" "email_forwarder" {
  name = local.function_name
  tags = local.tags
}

// --== SQS ==-- //
// This queue is subscribed to the topic. Our lambda function is triggered by this queue
resource "aws_sqs_queue" "email_forwarder_queue" {
  name                        = local.function_name
  delay_seconds               = 0
  max_message_size            = 262144
  message_retention_seconds   = 86400
  receive_wait_time_seconds   = 10
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.email_forwarder_dlq.arn
    maxReceiveCount     = 3
  })

  tags = local.tags
}

// The queue's policy allows sns to send our queue messages
data "aws_iam_policy_document" "email_forwarder_queue_policy_doc" {
  statement {
    sid     = "1"
    effect  = "Allow"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions   = ["sqs:SendMessage"]
    resources = [aws_sqs_queue.email_forwarder_queue.arn]

    condition {
      test      = "ArnEquals"
      variable  = "aws:SourceArn"
      values    = [aws_sns_topic.email_forwarder.arn]
    }
  }
}

// Adds the policy
resource "aws_sqs_queue_policy" "email_forwarder_queue_policy" {
  queue_url = aws_sqs_queue.email_forwarder_queue.id
  policy    = data.aws_iam_policy_document.email_forwarder_queue_policy_doc.json
}

// The dlq for when processing fails
resource "aws_sqs_queue" "email_forwarder_dlq" {
  name = "${local.function_name}-dlq"
  tags = local.tags
}

// --== Subscription ==-- //
// Subscribes our queue to the topic
resource "aws_sns_topic_subscription" "email_forwarder_topic_subscription" {
  topic_arn             = aws_sns_topic.email_forwarder.arn
  endpoint              = aws_sqs_queue.email_forwarder_queue.arn
  protocol              = "sqs"
  raw_message_delivery  = true
}