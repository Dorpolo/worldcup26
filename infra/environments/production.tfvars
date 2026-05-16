# ── Core ──────────────────────────────────────────────────────────────────────
environment = "production"
aws_region  = "us-east-1"
domain      = "bobby.gg"

# ── Scaling ───────────────────────────────────────────────────────────────────
ha_nat        = true
desired_count = 2

# ── MongoDB Atlas ─────────────────────────────────────────────────────────────
atlas_tier        = "M30"
atlas_project_name = "bobby"
atlas_db_username = "bobby_app"

# ── Monitoring ────────────────────────────────────────────────────────────────
alert_email = "alerts@bobby.gg"

# ── Sensitive values ─────────────────────────────────────────────────────────
# Do NOT commit real values. Supply these via:
#   terraform apply -var-file=environments/production.tfvars \
#                   -var="atlas_public_key=$ATLAS_PUBLIC_KEY" \
#                   -var="atlas_private_key=$ATLAS_PRIVATE_KEY" \
#                   ... etc
#
# Or use a secrets backend such as AWS Secrets Manager or Vault,
# or export TF_VAR_* environment variables in CI.
