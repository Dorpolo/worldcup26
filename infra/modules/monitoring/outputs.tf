output "sns_topic_arn" {
  description = "SNS topic ARN for CloudWatch alarm notifications"
  value       = aws_sns_topic.alerts.arn
}

output "dashboard_name" {
  description = "CloudWatch dashboard name"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}
