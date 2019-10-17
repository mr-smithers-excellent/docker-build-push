# Docker Build & Push Action
<p><a href="https://github.com/mr-smithers-excellent/docker-build-push-action"><img alt="GitHub Actions status" src="https://github.com/mr-smithers-excellent/docker-build-push-action/.github/workflows/ci.yml/badge.svg"></a></p>

Builds a Docker image using a `Dockerfile` in the root project directory and pushes the resulting Docker image to the private registry of your choosing.

## Requirements

* [GitHub Actions Beta](https://github.com/features/actions) program participation
* Run [checkout action](https://github.com/actions/checkout) before using this action
```yaml
steps:
  - uses: actions/checkout@v1
```

## Inputs

| Name | Description |
|------|-------------|

## Examples

### Docker Hub

```yaml
uses: mr-smithers-excellent/docker-build-push-action@master
with:
  image: docker-hub-repo/image-name
  registry: docker.io
  username: your-username
  password: ${{ secrets.password }}
```

### Google Container Registry (GCR)

```yaml
uses: mr-smithers-excellent/docker-build-push-action@master
with:
  image: gcp-project/image-name
  registry: https://gcr.io
  username: _json_key
  password: ${{ secrets.password }}
```

## Tagging the image using GitOps

By default, this action will use an algorithm based on the state of your git repo to determine the Docker image tag. This is designed to enable develops to more easily use [GitOps](https://dzone.com/articles/what-is-gitops-really) in their CI/CD pipelines.
