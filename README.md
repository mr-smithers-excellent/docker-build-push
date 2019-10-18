# Docker Build & Push Action
<p><a href="https://github.com/mr-smithers-excellent/docker-build-push"><img alt="GitHub Actions status" src="https://github.com/mr-smithers-excellent/docker-build-push/workflows/Tests/badge.svg"></a></p>

Builds a Docker image and pushes it to the private registry of your choosing.

## Requirements

* [GitHub Actions Beta](https://github.com/features/actions) program participation
* Run [checkout action](https://github.com/actions/checkout) before using this action
```yaml
steps:
  - uses: actions/checkout@v1

  - uses: mr-smithers-excellent/docker-build-push@master
    with:
      image: repo/image
      registry: registry-url.io
      dockerfile: Dockerfile.ci
      username: username
      password: ${{ secrets.DOCKER_PASSWORD }}
```

## Inputs

| Name       | Description                                       | Required |
|------------|---------------------------------------------------|----------|
| image      | Docker image name                                 | Yes      |
| registry   | Registry host                                     | Yes      |
| dockerfile | Location of Dockerfile (defaults to `Dockerfile`) | No       |
| username   | Registry username                                 | No       |
| password   | Registry password or token                        | No       |

## Examples

### Docker Hub

* Save your Docker Hub username (`DOCKER_USERNAME`) and password (`DOCKER_PASSWORD`) as secrets in your GitHub repo
* Modify sample below and include in your workflow `.github/workflows/*.yml` file 

```yaml
uses: mr-smithers-excellent/docker-build-push@master
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
uses: mr-smithers-excellent/docker-build-push@master
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
* Modify sample below and include in your workflow `.github/workflows/*.yml` file

```yaml
uses: mr-smithers-excellent/docker-build-push@master
with:
  image: image-name
  registry: [aws-account-number].dkr.ecr.[region].amazonaws.com
env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Tagging the image using GitOps

By default, this action will use an algorithm based on the state of your git repo to determine the Docker image tag. This is designed to enable developers to more easily use [GitOps](https://www.weave.works/technologies/gitops/) in their CI/CD pipelines. Below is a table detailing how the GitHub trigger (branch or tag) determines the Docker tag.

| Trigger                  | Commit SHA | Docker Tag           |
|--------------------------|------------|----------------------|
| /refs/tags/v1.0          | N/A        | v1.0                 |
| /refs/heads/master       | 1234567    | dev-1234567          |
| /refs/heads/some-feature | 1234567    | some-feature-1234567 | 
