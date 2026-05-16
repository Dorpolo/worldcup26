locals {
  services = {
    api = {
      image       = var.api_image
      cpu         = 512
      memory      = 1024
      port        = 4000
      tg_arn      = var.api_target_group_arn
      health_path = "/health"
      env_vars = {
        PORT             = "4000"
        NODE_ENV         = "production"
        MCP_SERVICE_URL  = "http://mcp.bobby.internal:4001"
        AGENT_SERVICE_URL = "http://agent.bobby.internal:8000"
      }
    }
    agent = {
      image       = var.agent_image
      cpu         = 1024
      memory      = 2048
      port        = 8000
      tg_arn      = var.agent_target_group_arn
      health_path = "/health"
      env_vars = {
        PORT              = "8000"
        INTERNAL_API_URL  = "https://${var.domain}"
        LANGCHAIN_TRACING_V2 = "false"
      }
    }
    mcp = {
      image       = var.mcp_image
      cpu         = 256
      memory      = 512
      port        = 4001
      tg_arn      = var.mcp_target_group_arn
      health_path = "/health"
      env_vars = {
        PORT             = "4001"
        NODE_ENV         = "production"
        INTERNAL_API_URL = "https://${var.domain}"
      }
    }
  }
}

# ── ECS Cluster ───────────────────────────────────────────────────────────────

resource "aws_ecs_cluster" "main" {
  name = "bobby-${var.environment}"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "bobby-${var.environment}"
  }
}

resource "aws_ecs_cluster_capacity_providers" "main" {
  cluster_name       = aws_ecs_cluster.main.name
  capacity_providers = ["FARGATE", "FARGATE_SPOT"]

  default_capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
    base              = 1
  }
}

# ── IAM Roles ─────────────────────────────────────────────────────────────────

data "aws_iam_policy_document" "ecs_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# Task Execution Role: used by the ECS agent to pull images, write logs, etc.
resource "aws_iam_role" "task_execution" {
  name               = "bobby-${var.environment}-task-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json

  tags = {
    Name = "bobby-${var.environment}-task-execution-role"
  }
}

resource "aws_iam_role_policy_attachment" "task_execution_managed" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "task_execution_secrets" {
  name = "bobby-${var.environment}-task-execution-secrets"
  role = aws_iam_role.task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadAppSecret"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = var.app_secret_arn
      },
      {
        Sid    = "GetECRAuthToken"
        Effect = "Allow"
        Action = ["ecr:GetAuthorizationToken"]
        Resource = "*"
      }
    ]
  })
}

# Task Role: used by the running container process
resource "aws_iam_role" "task" {
  name               = "bobby-${var.environment}-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_assume_role.json

  tags = {
    Name = "bobby-${var.environment}-task-role"
  }
}

resource "aws_iam_role_policy" "task_secrets_read" {
  name = "bobby-${var.environment}-task-secrets-read"
  role = aws_iam_role.task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadAppSecret"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = var.app_secret_arn
      }
    ]
  })
}

# ── CloudWatch Log Groups ─────────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "service" {
  for_each          = local.services
  name              = "/ecs/bobby-${each.key}"
  retention_in_days = 30

  tags = {
    Name    = "/ecs/bobby-${each.key}"
    Service = each.key
  }
}

# ── Cloud Map (Service Discovery) ────────────────────────────────────────────

resource "aws_service_discovery_private_dns_namespace" "internal" {
  name        = "bobby.internal"
  description = "Internal DNS namespace for Bobby ${var.environment} services"
  vpc         = var.vpc_id

  tags = {
    Name = "bobby-${var.environment}-internal-namespace"
  }
}

resource "aws_service_discovery_service" "service" {
  for_each = local.services

  name = each.key

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.internal.id
    routing_policy = "MULTIVALUE"

    dns_records {
      ttl  = 10
      type = "A"
    }
  }

  health_check_custom_config {
    failure_threshold = 1
  }

  tags = {
    Name    = "bobby-${var.environment}-${each.key}-discovery"
    Service = each.key
  }
}

# ── Task Definitions ──────────────────────────────────────────────────────────

resource "aws_ecs_task_definition" "service" {
  for_each = local.services

  family                   = "bobby-${var.environment}-${each.key}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = each.value.cpu
  memory                   = each.value.memory
  execution_role_arn       = aws_iam_role.task_execution.arn
  task_role_arn            = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = each.key
      image     = each.value.image
      essential = true

      portMappings = [
        {
          containerPort = each.value.port
          protocol      = "tcp"
        }
      ]

      environment = [
        for k, v in each.value.env_vars : { name = k, value = v }
      ]

      # All secrets are pulled from a single Secrets Manager JSON blob
      secrets = [
        { name = "MONGODB_URI",       valueFrom = "${var.app_secret_arn}:MONGODB_URI::" },
        { name = "REDIS_URL",         valueFrom = "${var.app_secret_arn}:REDIS_URL::" },
        { name = "ANTHROPIC_API_KEY", valueFrom = "${var.app_secret_arn}:ANTHROPIC_API_KEY::" },
        { name = "INTERNAL_API_KEY",  valueFrom = "${var.app_secret_arn}:INTERNAL_API_KEY::" },
        { name = "CRON_SECRET",       valueFrom = "${var.app_secret_arn}:CRON_SECRET::" },
        { name = "API_FOOTBALL_KEY",  valueFrom = "${var.app_secret_arn}:API_FOOTBALL_KEY::" },
        { name = "TAVILY_API_KEY",    valueFrom = "${var.app_secret_arn}:TAVILY_API_KEY::" },
        { name = "NEXTAUTH_SECRET",   valueFrom = "${var.app_secret_arn}:NEXTAUTH_SECRET::" },
        { name = "RESEND_API_KEY",    valueFrom = "${var.app_secret_arn}:RESEND_API_KEY::" }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.service[each.key].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:${each.value.port}${each.value.health_path} || exit 1"]
        interval    = 30
        timeout     = 10
        retries     = 3
        startPeriod = 60
      }

      readonlyRootFilesystem = false
      user                   = each.key == "agent" ? "1001" : null
    }
  ])

  tags = {
    Name    = "bobby-${var.environment}-${each.key}"
    Service = each.key
  }
}

# ── ECS Services ──────────────────────────────────────────────────────────────

resource "aws_ecs_service" "api" {
  name                               = "bobby-${var.environment}-api"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.service["api"].arn
  desired_count                      = var.desired_count
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  health_check_grace_period_seconds  = 60
  force_new_deployment               = true
  enable_execute_command             = true

  network_configuration {
    subnets          = var.private_subnets
    security_groups  = [var.ecs_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.api_target_group_arn
    container_name   = "api"
    container_port   = 4000
  }

  service_registries {
    registry_arn = aws_service_discovery_service.service["api"].arn
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller {
    type = "ECS"
  }

  tags = {
    Name    = "bobby-${var.environment}-api"
    Service = "api"
  }

  depends_on = [aws_iam_role_policy_attachment.task_execution_managed]
}

resource "aws_ecs_service" "agent" {
  name                               = "bobby-${var.environment}-agent"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.service["agent"].arn
  desired_count                      = var.desired_count
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  health_check_grace_period_seconds  = 90
  force_new_deployment               = true
  enable_execute_command             = true

  network_configuration {
    subnets          = var.private_subnets
    security_groups  = [var.ecs_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.agent_target_group_arn
    container_name   = "agent"
    container_port   = 8000
  }

  service_registries {
    registry_arn = aws_service_discovery_service.service["agent"].arn
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller {
    type = "ECS"
  }

  tags = {
    Name    = "bobby-${var.environment}-agent"
    Service = "agent"
  }

  depends_on = [aws_iam_role_policy_attachment.task_execution_managed]
}

resource "aws_ecs_service" "mcp" {
  name                               = "bobby-${var.environment}-mcp"
  cluster                            = aws_ecs_cluster.main.id
  task_definition                    = aws_ecs_task_definition.service["mcp"].arn
  desired_count                      = var.desired_count
  launch_type                        = "FARGATE"
  platform_version                   = "LATEST"
  health_check_grace_period_seconds  = 60
  force_new_deployment               = true
  enable_execute_command             = true

  network_configuration {
    subnets          = var.private_subnets
    security_groups  = [var.ecs_sg_id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = var.mcp_target_group_arn
    container_name   = "mcp"
    container_port   = 4001
  }

  service_registries {
    registry_arn = aws_service_discovery_service.service["mcp"].arn
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller {
    type = "ECS"
  }

  tags = {
    Name    = "bobby-${var.environment}-mcp"
    Service = "mcp"
  }

  depends_on = [aws_iam_role_policy_attachment.task_execution_managed]
}
