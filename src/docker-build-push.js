const core = require('@actions/core');
const docker = require('./docker');

const buildOpts = {
  tags: undefined,
  buildArgs: undefined,
  labels: undefined,
  target: undefined,
  context: undefined,
  enableBuildKit: false,
  platform: undefined
};

const run = () => {
  try {
    // Capture action inputs
    const push = core.getBooleanInput('push');
    const image = core.getInput('image', { required: true });
    const registry = core.getInput('registry', { required: push });
    const username = core.getInput('username');
    const password = core.getInput('password');
    const dockerfile = core.getInput('dockerfile');
    const addLatest = core.getBooleanInput('addLatest');
    const addTimestamp = core.getBooleanInput('addTimestamp');
    buildOpts.tags = core.getMultilineInput('tags') || docker.createTags(addLatest, addTimestamp);
    buildOpts.buildArgs = core.getMultilineInput('buildArgs');
    buildOpts.labels = core.getMultilineInput('labels');
    buildOpts.target = core.getInput('target');
    buildOpts.context = core.getInput('context');
    buildOpts.enableBuildKit = core.getBooleanInput('enableBuildKit');
    buildOpts.platform = core.getInput('platform');

    // Create the Docker image name
    const imageFullName = docker.createFullImageName(registry, image);
    core.info(`Docker image name used for this build: ${imageFullName}`);

    // Build the Docker image
    docker.build(imageFullName, dockerfile, buildOpts);

    // Log in & push the Docker image
    if (push) {
      docker.login(username, password, registry);
      docker.push(imageFullName, buildOpts.tags);
    }

    // Capture outputs
    core.setOutput('imageFullName', imageFullName);
    core.setOutput('imageName', image);
    core.setOutput('tags', buildOpts.tags.join('\n'));
  } catch (error) {
    core.setFailed(error.message);
  }
};

module.exports = run;
