locals {
  services = ["api", "agent", "mcp"]
}

# ── CloudWatch Log Groups ─────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "ecs" {
  for_each          = toset(local.services)
  name              = "/ecs/bobby-${each.key}"
  retention_in_days = 30

  tags = {
    Name    = "/ecs/bobby-${each.key}"
    Service = each.key
  }
}

# ── SNS Topic ─────────────────────────────────────────────────────────────────

resource "aws_sns_topic" "alerts" {
  name         = "bobby-${var.environment}-alerts"
  display_name = "Bobby ${var.environment} Alerts"

  tags = {
    Name = "bobby-${var.environment}-alerts"
  }
}

resource "aws_sns_topic_subscription" "email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

# ── CloudWatch Alarms ─────────────────────────────────────────────────────────

# CPU utilisation per ECS service
resource "aws_cloudwatch_metric_alarm" "ecs_cpu_high" {
  for_each = toset(local.services)

  alarm_name          = "bobby-${var.environment}-${each.key}-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "CPU utilisation > 80% for 3 consecutive minutes on bobby-${each.key}"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = "bobby-${var.environment}-${each.key}"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name    = "bobby-${var.environment}-${each.key}-cpu-high"
    Service = each.key
  }
}

# Memory utilisation per ECS service
resource "aws_cloudwatch_metric_alarm" "ecs_memory_high" {
  for_each = toset(local.services)

  alarm_name          = "bobby-${var.environment}-${each.key}-memory-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = 60
  statistic           = "Average"
  threshold           = 85
  alarm_description   = "Memory utilisation > 85% for 3 consecutive minutes on bobby-${each.key}"
  treat_missing_data  = "notBreaching"

  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName = "bobby-${var.environment}-${each.key}"
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name    = "bobby-${var.environment}-${each.key}-memory-high"
    Service = each.key
  }
}

# ALB 5xx error rate
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "bobby-${var.environment}-alb-5xx-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Sum"
  threshold           = 10
  alarm_description   = "ALB 5xx responses > 10 in the last minute"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "bobby-${var.environment}-alb-5xx-high"
  }
}

# Target response time
resource "aws_cloudwatch_metric_alarm" "alb_response_time" {
  alarm_name          = "bobby-${var.environment}-alb-response-time-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Average"
  threshold           = 5
  alarm_description   = "Average ALB target response time > 5s"
  treat_missing_data  = "notBreaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "bobby-${var.environment}-alb-response-time-high"
  }
}

# Healthy host count per target group (alarm when 0 healthy hosts)
resource "aws_cloudwatch_metric_alarm" "unhealthy_hosts_api" {
  alarm_name          = "bobby-${var.environment}-api-unhealthy-hosts"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "API service has no healthy hosts"
  treat_missing_data  = "breaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.api_tg_arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name    = "bobby-${var.environment}-api-unhealthy-hosts"
    Service = "api"
  }
}

resource "aws_cloudwatch_metric_alarm" "unhealthy_hosts_agent" {
  alarm_name          = "bobby-${var.environment}-agent-unhealthy-hosts"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "Agent service has no healthy hosts"
  treat_missing_data  = "breaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.agent_tg_arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name    = "bobby-${var.environment}-agent-unhealthy-hosts"
    Service = "agent"
  }
}

resource "aws_cloudwatch_metric_alarm" "unhealthy_hosts_mcp" {
  alarm_name          = "bobby-${var.environment}-mcp-unhealthy-hosts"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Minimum"
  threshold           = 1
  alarm_description   = "MCP service has no healthy hosts"
  treat_missing_data  = "breaching"

  dimensions = {
    LoadBalancer = var.alb_arn_suffix
    TargetGroup  = var.mcp_tg_arn_suffix
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]

  tags = {
    Name    = "bobby-${var.environment}-mcp-unhealthy-hosts"
    Service = "mcp"
  }
}

# ── CloudWatch Dashboard ──────────────────────────────────────────────────────

resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "Bobby-${var.environment}"

  dashboard_body = jsonencode({
    widgets = [
      # ── Row 1: ECS CPU ──────────────────────────────────────────────────
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 8
        height = 6
        properties = {
          title  = "ECS CPU Utilization — API"
          region = "us-east-1"
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", var.ecs_cluster_name,
            "ServiceName", "bobby-${var.environment}-api", { stat = "Average", color = "#2ca02c" }]
          ]
          yAxis = { left = { min = 0, max = 100 } }
          view  = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 0
        width  = 8
        height = 6
        properties = {
          title  = "ECS CPU Utilization — Agent"
          region = "us-east-1"
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", var.ecs_cluster_name,
            "ServiceName", "bobby-${var.environment}-agent", { stat = "Average", color = "#ff7f0e" }]
          ]
          yAxis = { left = { min = 0, max = 100 } }
          view  = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 0
        width  = 8
        height = 6
        properties = {
          title  = "ECS CPU Utilization — MCP"
          region = "us-east-1"
          metrics = [
            ["AWS/ECS", "CPUUtilization", "ClusterName", var.ecs_cluster_name,
            "ServiceName", "bobby-${var.environment}-mcp", { stat = "Average", color = "#1f77b4" }]
          ]
          yAxis = { left = { min = 0, max = 100 } }
          view  = "timeSeries"
        }
      },
      # ── Row 2: ECS Memory ───────────────────────────────────────────────
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "ECS Memory Utilization — API"
          region = "us-east-1"
          metrics = [
            ["AWS/ECS", "MemoryUtilization", "ClusterName", var.ecs_cluster_name,
            "ServiceName", "bobby-${var.environment}-api", { stat = "Average", color = "#2ca02c" }]
          ]
          yAxis = { left = { min = 0, max = 100 } }
          view  = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "ECS Memory Utilization — Agent"
          region = "us-east-1"
          metrics = [
            ["AWS/ECS", "MemoryUtilization", "ClusterName", var.ecs_cluster_name,
            "ServiceName", "bobby-${var.environment}-agent", { stat = "Average", color = "#ff7f0e" }]
          ]
          yAxis = { left = { min = 0, max = 100 } }
          view  = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 6
        width  = 8
        height = 6
        properties = {
          title  = "ECS Memory Utilization — MCP"
          region = "us-east-1"
          metrics = [
            ["AWS/ECS", "MemoryUtilization", "ClusterName", var.ecs_cluster_name,
            "ServiceName", "bobby-${var.environment}-mcp", { stat = "Average", color = "#1f77b4" }]
          ]
          yAxis = { left = { min = 0, max = 100 } }
          view  = "timeSeries"
        }
      },
      # ── Row 3: ALB request count + 5xx rate ────────────────────────────
      {
        type   = "metric"
        x      = 0
        y      = 12
        width  = 12
        height = 6
        properties = {
          title  = "ALB Request Count"
          region = "us-east-1"
          metrics = [
            ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", var.alb_arn_suffix,
            { stat = "Sum", color = "#1f77b4" }]
          ]
          view = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 12
        width  = 12
        height = 6
        properties = {
          title  = "ALB 5xx Error Rate"
          region = "us-east-1"
          metrics = [
            ["AWS/ApplicationELB", "HTTPCode_ELB_5XX_Count", "LoadBalancer", var.alb_arn_suffix,
            { stat = "Sum", color = "#d62728" }]
          ]
          view = "timeSeries"
        }
      },
      # ── Row 4: Healthy host count ───────────────────────────────────────
      {
        type   = "metric"
        x      = 0
        y      = 18
        width  = 8
        height = 6
        properties = {
          title  = "Healthy Hosts — API"
          region = "us-east-1"
          metrics = [
            ["AWS/ApplicationELB", "HealthyHostCount",
              "LoadBalancer", var.alb_arn_suffix,
              "TargetGroup", var.api_tg_arn_suffix,
            { stat = "Average", color = "#2ca02c" }]
          ]
          yAxis = { left = { min = 0 } }
          view  = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 8
        y      = 18
        width  = 8
        height = 6
        properties = {
          title  = "Healthy Hosts — Agent"
          region = "us-east-1"
          metrics = [
            ["AWS/ApplicationELB", "HealthyHostCount",
              "LoadBalancer", var.alb_arn_suffix,
              "TargetGroup", var.agent_tg_arn_suffix,
            { stat = "Average", color = "#ff7f0e" }]
          ]
          yAxis = { left = { min = 0 } }
          view  = "timeSeries"
        }
      },
      {
        type   = "metric"
        x      = 16
        y      = 18
        width  = 8
        height = 6
        properties = {
          title  = "Healthy Hosts — MCP"
          region = "us-east-1"
          metrics = [
            ["AWS/ApplicationELB", "HealthyHostCount",
              "LoadBalancer", var.alb_arn_suffix,
              "TargetGroup", var.mcp_tg_arn_suffix,
            { stat = "Average", color = "#1f77b4" }]
          ]
          yAxis = { left = { min = 0 } }
          view  = "timeSeries"
        }
      }
    ]
  })
}
