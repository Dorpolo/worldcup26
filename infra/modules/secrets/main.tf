data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ── Application Secret ────────────────────────────────────────────────────────

resource "aws_secretsmanager_secret" "app" {
  name                    = "bobby/${var.environment}/app"
  description             = "Bobby ${var.environment} application environment variables"
  recovery_window_in_days = var.environment == "production" ? 30 : 7

  tags = {
    Name = "bobby-${var.environment}-app-secrets"
  }
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id

  secret_string = jsonencode({
    MONGODB_URI       = var.mongodb_uri
    REDIS_URL         = var.redis_url
    ANTHROPIC_API_KEY = var.anthropic_api_key
    INTERNAL_API_KEY  = var.internal_api_key
    CRON_SECRET       = var.cron_secret
    API_FOOTBALL_KEY  = var.api_football_key
    TAVILY_API_KEY    = var.tavily_api_key
    NEXTAUTH_SECRET   = var.nextauth_secret
    RESEND_API_KEY    = var.resend_api_key
  })

  lifecycle {
    # Prevent accidental overwrites when values are managed outside Terraform
    ignore_changes = [secret_string]
  }
}

# ── IAM Policy ────────────────────────────────────────────────────────────────

resource "aws_iam_policy" "ecs_secret_read" {
  name        = "bobby-${var.environment}-ecs-secret-read"
  description = "Allows ECS tasks to read the Bobby ${var.environment} application secret"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "GetSecret"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = aws_secretsmanager_secret.app.arn
      },
      {
        Sid    = "DecryptSecret"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        # Allow usage of the default Secrets Manager KMS key
        Resource = "arn:aws:kms:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:key/*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.${data.aws_region.current.name}.amazonaws.com"
          }
        }
      }
    ]
  })
}
