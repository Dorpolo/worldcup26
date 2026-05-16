data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" { state = "available" }

# ── Networking ────────────────────────────────────────────────────────────────

module "networking" {
  source = "./modules/networking"

  environment         = var.environment
  aws_region          = var.aws_region
  availability_zones  = slice(data.aws_availability_zones.available.names, 0, 2)
  ha_nat              = var.ha_nat
}

# ── ECR ───────────────────────────────────────────────────────────────────────

module "ecr" {
  source = "./modules/ecr"

  environment = var.environment
  services    = ["bobby-api", "bobby-agent", "bobby-mcp"]
}

# ── Secrets ───────────────────────────────────────────────────────────────────

module "secrets" {
  source = "./modules/secrets"

  environment      = var.environment
  mongodb_uri      = "mongodb+srv://${var.atlas_db_username}:${var.atlas_db_password}@${mongodbatlas_cluster.main.connection_strings[0].standard_srv != "" ? replace(mongodbatlas_cluster.main.connection_strings[0].standard_srv, "mongodb+srv://", "") : "placeholder"}/bobby?retryWrites=true&w=majority"
  redis_url        = var.redis_url
  anthropic_api_key = var.anthropic_api_key
  internal_api_key = var.internal_api_key
  cron_secret      = var.cron_secret
  api_football_key = var.api_football_key
  tavily_api_key   = var.tavily_api_key
  nextauth_secret  = var.nextauth_secret
  resend_api_key   = var.resend_api_key
}

# ── ECS ───────────────────────────────────────────────────────────────────────

module "ecs" {
  source = "./modules/ecs"

  environment     = var.environment
  aws_region      = var.aws_region
  account_id      = data.aws_caller_identity.current.account_id
  vpc_id          = module.networking.vpc_id
  private_subnets = module.networking.private_subnet_ids
  ecs_sg_id       = module.networking.ecs_sg_id
  desired_count   = var.desired_count
  app_secret_arn  = module.secrets.app_secret_arn

  api_image   = "${module.ecr.repo_urls["bobby-api"]}:latest"
  agent_image = "${module.ecr.repo_urls["bobby-agent"]}:latest"
  mcp_image   = "${module.ecr.repo_urls["bobby-mcp"]}:latest"

  api_target_group_arn   = module.alb.api_target_group_arn
  agent_target_group_arn = module.alb.agent_target_group_arn
  mcp_target_group_arn   = module.alb.mcp_target_group_arn

  domain = var.domain
}

# ── ALB ───────────────────────────────────────────────────────────────────────

module "alb" {
  source = "./modules/alb"

  environment     = var.environment
  aws_region      = var.aws_region
  vpc_id          = module.networking.vpc_id
  public_subnets  = module.networking.public_subnet_ids
  alb_sg_id       = module.networking.alb_sg_id
  domain          = var.domain
  route53_zone_id = var.route53_zone_id
}

# ── Monitoring ────────────────────────────────────────────────────────────────

module "monitoring" {
  source = "./modules/monitoring"

  environment        = var.environment
  alb_arn_suffix     = module.alb.alb_arn_suffix
  api_tg_arn_suffix  = module.alb.api_tg_arn_suffix
  agent_tg_arn_suffix = module.alb.agent_tg_arn_suffix
  mcp_tg_arn_suffix  = module.alb.mcp_tg_arn_suffix
  ecs_cluster_name   = module.ecs.cluster_name
  alert_email        = var.alert_email
}

# ── MongoDB Atlas ─────────────────────────────────────────────────────────────

resource "mongodbatlas_project" "main" {
  name   = "${var.atlas_project_name}-${var.environment}"
  org_id = var.atlas_org_id
}

resource "mongodbatlas_cluster" "main" {
  project_id = mongodbatlas_project.main.id
  name       = "bobby-${var.environment}"

  cluster_type = "REPLICASET"
  mongo_db_major_version = "7.0"

  replication_specs {
    num_shards = 1
    regions_config {
      region_name     = "US_EAST_1"
      electable_nodes = var.atlas_tier == "M10" ? 3 : 3
      priority        = 7
      read_only_nodes = 0
    }
  }

  provider_name               = "AWS"
  provider_region_name        = "US_EAST_1"
  provider_instance_size_name = var.atlas_tier
  provider_disk_iops          = var.atlas_tier == "M10" ? 100 : 3000

  auto_scaling_disk_gb_enabled = true

  backup_enabled               = var.environment == "production" ? true : false
  pit_enabled                  = var.environment == "production" ? true : false

  lifecycle {
    prevent_destroy = true
  }
}

resource "mongodbatlas_database_user" "app" {
  project_id         = mongodbatlas_project.main.id
  username           = var.atlas_db_username
  password           = var.atlas_db_password
  auth_database_name = "admin"

  roles {
    role_name     = "readWrite"
    database_name = "bobby"
  }

  labels {
    key   = "environment"
    value = var.environment
  }
}

resource "mongodbatlas_project_ip_access_list" "nat_gateways" {
  for_each   = toset(module.networking.nat_gateway_ips)
  project_id = mongodbatlas_project.main.id
  ip_address = each.value
  comment    = "NAT Gateway EIP — ${var.environment}"
}

# ── Vercel ────────────────────────────────────────────────────────────────────

resource "vercel_project" "bobby" {
  name      = "bobby-${var.environment}"
  framework = "nextjs"

  git_repository = {
    type = "github"
    repo = "dorpolo/worldcup26"
  }

  root_directory = "apps/web"

  build_command    = "cd ../.. && pnpm turbo run build --filter=web..."
  output_directory = ".next"
  install_command  = "pnpm install --frozen-lockfile"
}

locals {
  vercel_env_vars = {
    NEXTAUTH_URL        = "https://${var.domain}"
    NEXTAUTH_SECRET     = var.nextauth_secret
    MONGODB_URI         = "mongodb+srv://${var.atlas_db_username}:${var.atlas_db_password}@${replace(mongodbatlas_cluster.main.connection_strings[0].standard_srv, "mongodb+srv://", "")}/bobby?retryWrites=true&w=majority"
    REDIS_URL           = var.redis_url
    INTERNAL_API_KEY    = var.internal_api_key
    CRON_SECRET         = var.cron_secret
    API_FOOTBALL_KEY    = var.api_football_key
    RESEND_API_KEY      = var.resend_api_key
    RAILWAY_AGENT_URL   = "https://agent.${var.domain}"
    MCP_SERVER_URL      = "https://mcp.${var.domain}"
    NEXT_PUBLIC_API_URL = "https://api.${var.domain}"
    NODE_ENV            = "production"
  }
}

resource "vercel_project_environment_variable" "bobby" {
  for_each   = local.vercel_env_vars
  project_id = vercel_project.bobby.id
  key        = each.key
  value      = each.value
  targets    = var.environment == "production" ? ["production"] : ["preview"]
  sensitive  = true
}
