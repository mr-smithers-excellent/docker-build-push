# Docker Build & Push Action
[![Tests](https://github.com/mr-smithers-excellent/docker-build-push/workflows/Tests/badge.svg?branch=master&event=push)](https://github.com/mr-smithers-excellent/docker-build-push/actions)
[![Maintainability](https://api.codeclimate.com/v1/badges/ac0bf06dc93ba3110cd3/maintainability)](https://codeclimate.com/github/mr-smithers-excellent/docker-build-push/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/ac0bf06dc93ba3110cd3/test_coverage)](https://codeclimate.com/github/mr-smithers-excellent/docker-build-push/test_coverage)

Builds a Docker image and pushes it to the private registry of your choosing.

## Supported Docker registries

* Docker Hub
* Google Container Registry (GCR)
* AWS Elastic Container Registry (ECR)
* GitHub Docker Registry

## Basic usage

* Ensure you run the [checkout action](https://github.com/actions/checkout) before using this action
* Add the following to a workflow `.yml` file in the `/.github` directory of your repo
```yaml
steps:
  - uses: actions/checkout@v1.0
    name: Check out code

  - uses: mr-smithers-excellent/docker-build-push@v4
    name: Build & push Docker image
    with:
      image: repo/image
      tag: latest
      registry: registry-url.io
      dockerfile: Dockerfile.ci
      username: ${{ secrets.DOCKER_USERNAME }}
      password: ${{ secrets.DOCKER_PASSWORD }}
```

## Inputs

| Name       | Description                                                                             | Required |
|------------|-----------------------------------------------------------------------------------------|----------|
| image      | Docker image name                                                                       | Yes      |
| tag        | Docker image tag (see [Tagging the image with GitOps](#tagging-the-image-using-gitops)) | No       |
| registry   | Docker registry host                                                                    | Yes      |
| dockerfile | Location of Dockerfile (defaults to `Dockerfile`)                                       | No       |
| directory  | Directory to pass to `docker build` command, if not project root                        | No       |
| buildArgs  | Docker build arguments in format `KEY=VALUE,KEY=VALUE`                                  | No       |
| username   | Docker registry username                                                                | No       |
| password   | Docker registry password or token                                                       | No       |
| githubOrg  | GitHub organization to push image to (if not current)                                   | No       |

## Outputs

| Name          | Description                                                       | Format                     |
|---------------|-------------------------------------------------------------------|----------------------------|
| imageFullName | Full name of the Docker image with registry prefix and tag suffix | `registry/owner/image:tag` |
| imageName     | Name of the Docker image with owner prefix                        | `owner/image`              |
| tag           | Tag for the Docker image                                          | `tag`                      |

## Examples

### Docker Hub

* Save your Docker Hub username (`DOCKER_USERNAME`) and password (`DOCKER_PASSWORD`) as secrets in your GitHub repo
* Modify sample below and include in your workflow `.github/workflows/*.yml` file 

```yaml
uses: mr-smithers-excellent/docker-build-push@v4
with:
  image: docker-hub-repo/image-name
  registry: docker.io
  username: ${{ secrets.DOCKER_USERNAME }}
  password: ${{ secrets.DOCKER_PASSWORD }}
```

### Google Container Registry (GCR)

* Create a service account with the ability to push to GCR (see [configuring access control](https://cloud.google.com/container-registry/docs/access-control))
* Create and download JSON key for new service account
* Save content of `.json` file as a secret called `DOCKER_PASSWORD` in your GitHub repo
* Modify sample below and include in your workflow `.github/workflows/*.yml` file 
* Ensure you set the username to `_json_key`

```yaml
uses: mr-smithers-excellent/docker-build-push@v4
with:
  image: gcp-project/image-name
  registry: gcr.io
  username: _json_key 
  password: ${{ secrets.DOCKER_PASSWORD }} 
```

### AWS Elastic Container Registry (ECR)

* Create an IAM user with the ability to push to ECR (see [example policies](https://docs.aws.amazon.com/AmazonECR/latest/userguide/ecr_managed_policies.html))
* Create and download access keys
* Save `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as secrets in your GitHub repo
* Ensure the repo you are trying to push to already exists, if not create with `aws ecr create-repository` before pushing
* Modify sample below and include in your workflow `.github/workflows/*.yml` file

```yaml
uses: mr-smithers-excellent/docker-build-push@v4
with:
  image: image-name
  registry: [aws-account-number].dkr.ecr.[region].amazonaws.com
env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### GitHub Docker Registry

* It is assumed you'll be pushing the image to a repo inside your GitHub organization, unless you set `githubOrg`
* Provide the image name in `github-repo-name/image-name` format  
* Provide either the `${{ github.actor }}` or an alternate username for Docker login (with associated token below)
* Pass the default GitHub Actions token or custom secret with [proper push permissions](https://help.github.com/en/actions/configuring-and-managing-workflows/authenticating-with-the-github_token#permissions-for-the-github_token)

```yaml
uses: mr-smithers-excellent/docker-build-push@v4
with:
  image: github-repo/image-name
  registry: docker.pkg.github.com
  githubOrg: override-org # optional
  username: ${{ github.actor }}
  password: ${{ secrets.GITHUB_TOKEN }} 
```

## Tagging the image using GitOps

By default, if you do not pass a `tag` input this action will use an algorithm based on the state of your git repo to determine the Docker image tag. This is designed to enable developers to more easily use [GitOps](https://www.weave.works/technologies/gitops/) in their CI/CD pipelines. Below is a table detailing how the GitHub trigger (branch or tag) determines the Docker tag.

| Trigger                  | Commit SHA | Docker Tag           |
|--------------------------|------------|----------------------|
| /refs/tags/v1.0          | N/A        | v1.0                 |
| /refs/heads/dev          | 1234567    | dev-1234567          |
| /refs/heads/master       | 1234567    | master-1234567       |
| /refs/heads/SOME-feature | 1234567    | some-feature-1234567 | 
