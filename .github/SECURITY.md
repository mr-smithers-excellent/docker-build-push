# Security Policy

## Supported Versions

Only the latest major version receives security updates. Users should
always reference the action via its major version tag (e.g. `@v7`) rather
than pinning to a minor/patch version or a commit SHA that predates a fix,
so security patches are picked up automatically.

| Version | Supported          |
| ------- | ------------------ |
| 7.x     | :white_check_mark: |
| < 7.0   | :x:                |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

This repository has [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability)
enabled. To report a vulnerability:

1. Go to the [Security tab](https://github.com/mr-smithers-excellent/docker-build-push/security) of this repository.
2. Click **Report a vulnerability**.
3. Fill in as much detail as you can: affected version(s), a description of
   the issue, its impact, and steps to reproduce (a proof-of-concept is
   appreciated).

This opens a private draft security advisory visible only to you and the
maintainers, so the issue can be discussed and fixed before public
disclosure.

You can expect an initial response within a few business days. Once a fix
is available and released, the advisory will be published and you will be
credited as the reporter unless you request otherwise.
