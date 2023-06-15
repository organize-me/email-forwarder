// --== S3 ==-- //
// Sets up the s3 bucket

// The bucket that SES will store emails in
resource "aws_s3_bucket" "email_forwarder_s3" {
  bucket = local.function_name
  tags = local.tags
}

resource "aws_s3_bucket_lifecycle_configuration" "email_forwarder_s3_expire" {
  bucket = aws_s3_bucket.email_forwarder_s3.id

  rule {
    id = "delete"
    status = "Enabled"
    expiration {
      days = 7
    }
  }
}

// The policy document needed to let SES save emails in the bucket
data "aws_iam_policy_document" "email_forwarder_s3_policy_doc" {
  statement {
    sid     = "AllowSESPuts"
    effect  = "Allow"

    principals {
      type        = "Service"
      identifiers = ["ses.amazonaws.com"]
    }

    actions   = ["s3:PutObject"]
    resources = ["${aws_s3_bucket.email_forwarder_s3.arn}/*"]

    condition {
      test      = "StringEquals"
      variable  = "AWS:SourceAccount"
      values    = [data.aws_caller_identity.current.account_id]
    }

    condition {
      test      = "StringLike"
      variable  = "AWS:SourceArn"
      values    = ["arn:aws:ses:*"]
    }
  }
}

// Sets the bucket policy
resource "aws_s3_bucket_policy" "email_forwarder_s3_policy" {
  bucket = aws_s3_bucket.email_forwarder_s3.id
  policy = data.aws_iam_policy_document.email_forwarder_s3_policy_doc.json
}