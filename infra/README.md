# Bobby — Terraform Infrastructure

Production-grade AWS infrastructure for the Bobby World Cup 2026 predictions platform.

## Architecture

```
                     ┌─────────────────────────────────────────────────────┐
                     │                     Internet                          │
                     └─────────────────────┬───────────────────────────────┘
                                           │
                     ┌─────────────────────▼───────────────────────────────┐
                     │              Vercel (Next.js web app)                │
                     │           https://bobby.gg  (or staging)             │
                     └─────────────────────┬───────────────────────────────┘
                                           │  HTTPS
                     ┌─────────────────────▼───────────────────────────────┐
                     │          Route53  (api/agent/mcp.bobby.gg)           │
                     └─────────────────────┬───────────────────────────────┘
                                           │
                     ┌─────────────────────▼───────────────────────────────┐
                     │        Application Load Balancer  (HTTPS/443)        │
                     │   HTTP→HTTPS redirect · ACM cert · host-based routing│
                     └──────┬──────────────┬──────────────┬────────────────┘
                            │              │              │
              api.bobby.gg  │  agent.b.gg  │  mcp.b.gg   │
                     ┌──────▼──┐    ┌──────▼──┐   ┌──────▼──┐
                     │ ECS API │    │ECS Agent│   │ ECS MCP │   (Fargate, private subnets)
                     │ :4000   │    │  :8000  │   │  :4001  │
                     └──┬──────┘    └────┬────┘   └────┬────┘
                        │               │              │
                     ┌──▼───────────────▼──────────────▼───────────────────┐
                     │          AWS Cloud Map (bobby.internal DNS)           │
                     └────────────────────────────────────────────────────┬─┘
                                                                          │
              ┌───────────────────────────┐   ┌────────────────────────┐  │
              │  MongoDB Atlas (M10/M30)  │   │ Upstash Redis          │◄─┘
              │  VPC peering via NAT EIP  │   │ (serverless, managed)  │
              └───────────────────────────┘   └────────────────────────┘

  Supporting services:
    ECR — one repo per service (bobby-api, bobby-agent, bobby-mcp)
    Secrets Manager — bobby/{env}/app (all env vars)
    CloudWatch — log groups, dashboards, alarms → SNS → email
    S3 — ALB access logs
    DynamoDB — Terraform state locking
```

## Prerequisites

| Tool | Version |
|------|---------|
| Terraform | >= 1.7 |
| AWS CLI | >= 2.x, configured with sufficient IAM permissions |
| MongoDB Atlas account | — |
| Vercel account | — |

### Required IAM permissions (AWS)

Your deployer IAM principal needs at least:
`AmazonVPCFullAccess`, `AmazonECS_FullAccess`, `AmazonEC2ContainerRegistryFullAccess`,
`ElasticLoadBalancingFullAccess`, `AmazonRoute53FullAccess`, `AWSCertificateManagerFullAccess`,
`SecretsManagerReadWrite`, `CloudWatchFullAccess`, `SNSFullAccess`, `IAMFullAccess`,
`AmazonS3FullAccess`, `AmazonDynamoDBFullAccess`.

---

## First-time setup — bootstrap remote state

Run this **once** before `terraform init`. Replace `<account-id>` if needed.

```bash
# 1. Create the S3 state bucket (do this for each environment)
aws s3api create-bucket \
  --bucket bobby-terraform-state-staging \
  --region us-east-1

aws s3api put-bucket-versioning \
  --bucket bobby-terraform-state-staging \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket bobby-terraform-state-staging \
  --server-side-encryption-configuration \
    '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

aws s3api put-public-access-block \
  --bucket bobby-terraform-state-staging \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# 2. Create the DynamoDB lock table (shared across environments)
aws dynamodb create-table \
  --table-name bobby-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

---

## Usage

### Staging

```bash
cd infra/

terraform init \
  -backend-config="bucket=bobby-terraform-state-staging" \
  -backend-config="key=bobby/staging/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=bobby-terraform-locks" \
  -backend-config="encrypt=true"

terraform plan \
  -var-file=environments/staging.tfvars \
  -var="atlas_org_id=$ATLAS_ORG_ID" \
  -var="atlas_public_key=$ATLAS_PUBLIC_KEY" \
  -var="atlas_private_key=$ATLAS_PRIVATE_KEY" \
  -var="atlas_db_password=$ATLAS_DB_PASSWORD" \
  -var="vercel_api_token=$VERCEL_TOKEN" \
  -var="anthropic_api_key=$ANTHROPIC_API_KEY" \
  -var="internal_api_key=$INTERNAL_API_KEY" \
  -var="cron_secret=$CRON_SECRET" \
  -var="api_football_key=$API_FOOTBALL_KEY" \
  -var="tavily_api_key=$TAVILY_API_KEY" \
  -var="nextauth_secret=$NEXTAUTH_SECRET" \
  -var="resend_api_key=$RESEND_API_KEY" \
  -var="redis_url=$REDIS_URL" \
  -var="route53_zone_id=$ROUTE53_ZONE_ID" \
  -out=staging.tfplan

terraform apply staging.tfplan
```

### Production

```bash
# Re-init with production bucket (or use terraform workspace)
terraform init -reconfigure \
  -backend-config="bucket=bobby-terraform-state-production" \
  -backend-config="key=bobby/production/terraform.tfstate" \
  -backend-config="region=us-east-1" \
  -backend-config="dynamodb_table=bobby-terraform-locks" \
  -backend-config="encrypt=true"

terraform plan \
  -var-file=environments/production.tfvars \
  # ... same -var flags as staging ...
  -out=production.tfplan

terraform apply production.tfplan
```

---

## GitHub Actions secrets

Set the following repository secrets in GitHub (Settings → Secrets → Actions):

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | Deployer IAM access key |
| `AWS_SECRET_ACCESS_KEY` | Deployer IAM secret key |
| `ATLAS_ORG_ID` | MongoDB Atlas organisation ID |
| `ATLAS_PUBLIC_KEY` | MongoDB Atlas API public key |
| `ATLAS_PRIVATE_KEY` | MongoDB Atlas API private key |
| `ATLAS_DB_PASSWORD` | Atlas application user password |
| `VERCEL_TOKEN` | Vercel personal/team API token |
| `VERCEL_TEAM_ID` | Vercel team ID (leave empty for personal) |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `INTERNAL_API_KEY` | Internal service-to-service secret |
| `CRON_SECRET` | Cron endpoint authorisation token |
| `API_FOOTBALL_KEY` | API-Football (RapidAPI) key |
| `TAVILY_API_KEY` | Tavily search key |
| `NEXTAUTH_SECRET` | NextAuth.js secret (min 32 chars) |
| `RESEND_API_KEY` | Resend email API key |
| `REDIS_URL` | Upstash Redis URL |
| `ROUTE53_ZONE_ID` | Route53 hosted zone ID for bobby.gg |

---

## Module reference

| Module | What it creates |
|--------|-----------------|
| `networking` | VPC, public/private subnets, IGW, NAT GW(s), route tables, ALB & ECS security groups |
| `ecr` | 3 ECR repos (bobby-api/agent/mcp), lifecycle policies, scan-on-push |
| `secrets` | Secrets Manager secret `bobby/{env}/app` with all env vars; IAM read policy |
| `ecs` | ECS cluster, Fargate task defs (api/agent/mcp), services, IAM roles, Cloud Map |
| `alb` | Internet-facing ALB, ACM cert, Route53 DNS validation, target groups, listener rules |
| `monitoring` | CloudWatch log groups, dashboard, alarms (CPU/memory/5xx/latency), SNS topic |

Root `main.tf` also manages:
- **MongoDB Atlas**: cluster, database user, IP allowlist (NAT EIP)
- **Vercel**: project, environment variables per deployment target

---

## Useful commands

```bash
# Show all outputs after apply
terraform output

# Target a single module (useful during development)
terraform apply -target=module.networking -var-file=environments/staging.tfvars ...

# Destroy staging (never run on production without careful review)
terraform destroy -var-file=environments/staging.tfvars ...

# Push a Docker image to ECR (after apply)
IMAGE=$(terraform output -raw ecr_api_url)
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin "$IMAGE"
docker build -t "$IMAGE:latest" -f apps/api/Dockerfile .
docker push "$IMAGE:latest"
```
