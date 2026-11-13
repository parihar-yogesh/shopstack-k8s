output "github_actions_role_arn" {
  description = "Role GitHub Actions assumes to deploy. Set this as the AWS_ROLE_ARN repository variable."
  value       = aws_iam_role.github_actions.arn
}