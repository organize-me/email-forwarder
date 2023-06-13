// --== Route 53 ==-- //
// Sets the DNS MX records

// Pulls the aws hosted zone for the domain
data "aws_route53_zone" "primary" {
  name = "${local.domain}"
}

// Sets the MX records
resource "aws_route53_record" "primary" {
  zone_id = data.aws_route53_zone.primary.zone_id
  name    = ""
  type    = "MX"
  ttl     = "300"
  records = ["10 inbound-smtp.${data.aws_region.current.name}.amazonaws.com"]
}


resource "aws_route53_record" "subdomains" {
  for_each = local.subdomains

  zone_id = data.aws_route53_zone.primary.zone_id
  name    = each.key
  type    = "MX"
  ttl     = "300"
  records = ["10 inbound-smtp.${data.aws_region.current.name}.amazonaws.com"]
}
