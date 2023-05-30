terraform {
  backend "s3" {
    key    = "email-forwarder/terraform.tfstate"
  }
}
