locals {
  services = {
    api = {
      port        = 4000
      path_prefix = "/api"
      health_path = "/health"
      priority    = 10
      host_header = "api.${var.domain}"
    }
    agent = {
      port        = 8000
      path_prefix = "/agent"
      health_path = "/health"
      priority    = 20
      host_header = "agent.${var.domain}"
    }
    mcp = {
      port        = 4001
      path_prefix = "/mcp"
      health_path = "/health"
      priority    = 30
      host_header = "mcp.${var.domain}"
    }
  }
}

# ── ACM Certificate ───────────────────────────────────────────────────────────

resource "aws_acm_certificate" "main" {
  domain_name               = var.domain
  subject_alternative_names = ["*.${var.domain}"]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "bobby-${var.environment}-cert"
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.main.domain_validation_options :
    dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  }

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  records = [each.value.record]
  ttl     = 60
}

resource "aws_acm_certificate_validation" "main" {
  certificate_arn         = aws_acm_certificate.main.arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# ── Application Load Balancer ─────────────────────────────────────────────────

resource "aws_lb" "main" {
  name               = "bobby-${var.environment}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_sg_id]
  subnets            = var.public_subnets

  enable_deletion_protection = var.environment == "production" ? true : false
  enable_http2               = true
  idle_timeout               = 60

  access_logs {
    bucket  = aws_s3_bucket.alb_logs.bucket
    prefix  = "alb"
    enabled = true
  }

  tags = {
    Name = "bobby-${var.environment}-alb"
  }

  depends_on = [aws_s3_bucket_policy.alb_logs]
}

# ── ALB Access Logs S3 Bucket ─────────────────────────────────────────────────

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ELB service account IDs per region — us-east-1 is 127311923021
locals {
  elb_account_ids = {
    us-east-1      = "127311923021"
    us-east-2      = "033677994240"
    us-west-1      = "027434742980"
    us-west-2      = "797873946194"
    eu-west-1      = "156460612806"
    eu-central-1   = "054676820928"
    ap-southeast-1 = "114774131450"
    ap-northeast-1 = "582318560864"
  }
  elb_account_id = local.elb_account_ids[data.aws_region.current.name]
}

resource "aws_s3_bucket" "alb_logs" {
  bucket        = "bobby-${var.environment}-alb-logs-${data.aws_caller_identity.current.account_id}"
  force_destroy = var.environment != "production"

  tags = {
    Name = "bobby-${var.environment}-alb-logs"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    id     = "expire-alb-logs"
    status = "Enabled"

    filter {}

    expiration {
      days = 90
    }
  }
}

resource "aws_s3_bucket_public_access_block" "alb_logs" {
  bucket                  = aws_s3_bucket.alb_logs.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_policy" "alb_logs" {
  bucket = aws_s3_bucket.alb_logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowELBPutObject"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${local.elb_account_id}:root"
        }
        Action   = "s3:PutObject"
        Resource = "${aws_s3_bucket.alb_logs.arn}/alb/AWSLogs/${data.aws_caller_identity.current.account_id}/*"
      }
    ]
  })
}

# ── Target Groups ─────────────────────────────────────────────────────────────

resource "aws_lb_target_group" "service" {
  for_each = local.services

  name        = "bobby-${var.environment}-${each.key}"
  port        = each.value.port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    path                = each.value.health_path
    port                = "traffic-port"
    protocol            = "HTTP"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 10
    interval            = 30
    matcher             = "200-299"
  }

  deregistration_delay = 30

  tags = {
    Name    = "bobby-${var.environment}-${each.key}-tg"
    Service = each.key
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ── Listeners ─────────────────────────────────────────────────────────────────

# HTTP → HTTPS redirect
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = {
    Name = "bobby-${var.environment}-http-listener"
  }
}

# HTTPS listener with default 404 response
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.main.certificate_arn

  default_action {
    type = "fixed-response"

    fixed_response {
      content_type = "text/plain"
      message_body = "Not Found"
      status_code  = "404"
    }
  }

  tags = {
    Name = "bobby-${var.environment}-https-listener"
  }
}

# ── Listener Rules (host-header based routing) ────────────────────────────────

resource "aws_lb_listener_rule" "service" {
  for_each     = local.services
  listener_arn = aws_lb_listener.https.arn
  priority     = each.value.priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.service[each.key].arn
  }

  condition {
    host_header {
      values = [each.value.host_header]
    }
  }

  tags = {
    Name    = "bobby-${var.environment}-${each.key}-rule"
    Service = each.key
  }
}

# ── Route53 DNS Records ───────────────────────────────────────────────────────

resource "aws_route53_record" "service" {
  for_each = local.services

  zone_id = var.route53_zone_id
  name    = "${each.key}.${var.domain}"
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}
