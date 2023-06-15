resource "aws_sns_topic" "email_forwarder_alarm" {
  name = "${local.function_name}-alarm"
  tags = local.tags
}

resource "aws_sns_topic_subscription" "email_forwarder_alarm_subscription" {
  topic_arn             = aws_sns_topic.email_forwarder_alarm.arn
  endpoint              = local.admin_email
  protocol              = "email"
}

resource "aws_cloudwatch_metric_alarm" "dlq-alarm" {
  alarm_name          = "${local.function_name}-alarm"
  actions_enabled     = true
  alarm_actions       = [aws_sns_topic.email_forwarder_alarm.arn]
  comparison_operator = "GreaterThanOrEqualToThreshold"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  statistic           = "Maximum"
  period              = 900 // 15 minuteshour
  threshold           = 1
  evaluation_periods  = 1
  treat_missing_data  = "missing"

  dimensions = {
    QueueName = aws_sqs_queue.email_forwarder_dlq.name
  }

  tags = local.tags
}