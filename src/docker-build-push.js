const core = require('@actions/core');
const docker = require('./docker');
const github = require('./github');
const { parseArray } = require('./utils');

const buildOpts = {
  tags: undefined,
  buildArgs: undefined,
  labels: undefined,
  target: undefined,
  buildDir: undefined,
  multiPlatform: false,
  overrideDriver: false,
  enableBuildKit: false,
  platform: undefined,
  skipPush: false,
  ssh: undefined
};

const setBuildOpts = (addLatest, addTimestamp) => {
  buildOpts.tags = parseArray(core.getInput('tags')) || docker.createTags(addLatest, addTimestamp);
  buildOpts.multiPlatform = core.getInput('multiPlatform') === 'true';
  buildOpts.overrideDriver = core.getInput('overrideDriver') === 'true';
  buildOpts.buildArgs = parseArray(core.getInput('buildArgs'));
  buildOpts.labels = parseArray(core.getInput('labels'));
  buildOpts.target = core.getInput('target');
  buildOpts.buildDir = core.getInput('directory') || '.';
  buildOpts.enableBuildKit = core.getInput('enableBuildKit') === 'true';
  buildOpts.platform = core.getInput('platform');
  buildOpts.skipPush = core.getInput('pushImage') === 'false';
  buildOpts.ssh = parseArray(core.getInput('ssh'));
};

const run = () => {
  try {
    // Capture action inputs
    const image = core.getInput('image', { required: true });
    const registry = core.getInput('registry', { required: true });
    const username = core.getInput('username');
    const password = core.getInput('password');
    const dockerfile = core.getInput('dockerfile');
    const githubOwner = core.getInput('githubOrg') || github.getDefaultOwner();
    const addLatest = core.getInput('addLatest') === 'true';
    const addTimestamp = core.getInput('addTimestamp') === 'true';
    setBuildOpts(addLatest, addTimestamp);

    // Create the Docker image name
    const imageFullName = docker.createFullImageName(registry, image, githubOwner);
    core.info(`Docker image name used for this build: ${imageFullName}`);

    // Log in, build & push the Docker image
    docker.login(username, password, registry, buildOpts.skipPush);
    docker.build(imageFullName, dockerfile, buildOpts);
    docker.push(imageFullName, buildOpts.tags, buildOpts);

    // Capture outputs
    core.setOutput('imageFullName', imageFullName);
    core.setOutput('imageName', image);
    core.setOutput('tags', buildOpts.tags.join(','));
  } catch (error) {
    core.setFailed(error.message);
  }
};

module.exports = run;
