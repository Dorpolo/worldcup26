output "app_secret_arn" {
  description = "ARN of the application Secrets Manager secret"
  value       = aws_secretsmanager_secret.app.arn
  sensitive   = true
}

output "ecs_secret_read_policy_arn" {
  description = "ARN of the IAM policy granting Secrets Manager read access"
  value       = aws_iam_policy.ecs_secret_read.arn
}
