locals {
  services = ["products", "orders", "web"]
}

resource "aws_ecr_repository" "this" {
  for_each = toset(local.services)

  name                 = "${var.cluster_name}/${each.key}"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  # Without this, destroy fails while any images remain in the repository.
  force_delete = true
}