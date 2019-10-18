# Docker Build & Push Action
<p><a href="https://github.com/mr-smithers-excellent/docker-build-push"><img alt="GitHub Actions status" src="https://github.com/mr-smithers-excellent/docker-build-push/workflows/Tests/badge.svg"></a></p>

Builds a Docker image using a `Dockerfile` in the root project directory and pushes the resulting Docker image to the private registry of your choosing.

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
      username: username
      password: ${{ secrets.DOCKER_PASSWORD }}
```

## Inputs

| Name     | Description                | Required |
|----------|----------------------------|----------|
| image    | Docker image name          | Yes      |
| registry | Registry host              | Yes      |
| username | Registry username          | No       |
| password | Registry password or token | No       |

## Examples

### Docker Hub

```yaml
uses: mr-smithers-excellent/docker-build-push@master
with:
  image: docker-hub-repo/image-name
  registry: docker.io
  username: your-username
  password: ${{ secrets.DOCKER_PASSWORD }}
```

### Google Container Registry (GCR)

```yaml
uses: mr-smithers-excellent/docker-build-push@master
with:
  image: gcp-project/image-name
  registry: gcr.io
  username: _json_key
  password: ${{ secrets.DOCKER_PASSWORD }} # Use content of service account JSON key
```

### AWS Elastic Container Registry (ECR)

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
