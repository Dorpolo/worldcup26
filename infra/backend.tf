terraform {
  backend "s3" {
    # bucket and key must be supplied via -backend-config flags or backend.hcl
    # because they cannot reference variables. Use the bootstrap script to
    # create the bucket and DynamoDB table before first `terraform init`.
    #
    # Example init:
    #   terraform init \
    #     -backend-config="bucket=bobby-terraform-state-staging" \
    #     -backend-config="key=bobby/staging/terraform.tfstate" \
    #     -backend-config="region=us-east-1" \
    #     -backend-config="dynamodb_table=bobby-terraform-locks" \
    #     -backend-config="encrypt=true"

    encrypt = true
    # region is required here (cannot be variable); override with -backend-config
    region = "us-east-1"
  }
}
