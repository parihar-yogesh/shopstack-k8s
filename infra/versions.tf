terraform {
  # 1.10 is the minimum for the S3 backend's built-in state locking.
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.59"
    }
  }

  # This bucket is created by hand; Terraform cannot store state in a bucket it
  # has not yet created.
  backend "s3" {
    bucket       = "shopstack-k8s-tfstate-eu-central-1"
    key          = "shopstack/terraform.tfstate"
    region       = "eu-central-1"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project   = "shopstack-k8s"
      ManagedBy = "terraform"
    }
  }
}