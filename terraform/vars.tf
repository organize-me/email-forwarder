// --== Variables ==-- //

// the deployment envoirnment
variable "env" {
  type = string
  default = "production"
  description = "deployment envoirnment"
}

variable "config_directory" {
  type = string
  default = "../config/"
  description = "directory containing your configurations"
  validation {
    condition     = can(regex("^.*/$", var.config_directory))
    error_message = "the config_directory must end with a slash"
  }
}

locals {
  // The application config for the given envoirnment
  config = jsondecode(file("${var.config_directory}${var.env}.json"))

  // The name of our function
  function_name = "${replace(local.domain, ".", "-")}-email-forwarder-${var.env}"
  
  // Tags to attach to aws resources
  tags = {app = "email-forwarder", env = var.env}

  // The domain name
  domain = local.config.domain

  // The subdomains
  subdomains = toset(local.config.subdomains)

  // The address that emails are sent from
  from_email = local.config.from

  // Email address to send alerts to
  admin_email = local.config.admin-email
  
  // Set of mapped email addresses
  emails = keys(local.config.forward)
}

// The current aws region
data "aws_region" "current" {}

// The current aws identity
data "aws_caller_identity" "current" {}