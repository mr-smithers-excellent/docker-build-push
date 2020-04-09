const core = require('@actions/core');
const github = require('@actions/github');
const docker = require('./docker');

const GITHUB_REGISTRY = 'docker.pkg.github.com';

// Convert buildArgs from String to Array, as GH Actions currently does not support Arrays
const processBuildArgsInput = buildArgsInput => {
  let buildArgs = null;
  if (buildArgsInput) {
    buildArgs = buildArgsInput.split(',');
  }

  return buildArgs;
};

const isGitHubRegistry = registry => {
  return registry === GITHUB_REGISTRY;
};

const run = () => {
  try {
    // Get GitHub Action inputs
    const image = core.getInput('image', { required: true });
    const registry = core.getInput('registry', { required: true });
    const tag = core.getInput('tag') || docker.createTag();
    const buildArgs = processBuildArgsInput(core.getInput('buildArgs'));
    const githubRepo = core.getInput('githubRepo') || github.context.repo;

    // Create the full Docker image name
    let imageName;
    if (isGitHubRegistry(registry)) {
      imageName = `${GITHUB_REGISTRY}/${githubRepo}/${image}:${tag}`;
    } else {
      imageName = `${registry}/${image}:${tag}`;
    }

    docker.login();
    docker.build(imageName, buildArgs);
    docker.push(imageName);

    core.setOutput('imageFullName', imageName);
  } catch (error) {
    core.setFailed(error.message);
  }
};

module.exports = run;
