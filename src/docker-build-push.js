const core = require('@actions/core');
const docker = require('./docker');
const github = require('./github');
const { parseArray } = require('./utils');

const run = () => {
  try {
    // Capture action inputs
    const image = core.getInput('image', { required: true });
    const registry = core.getInput('registry', { required: true });
    const username = core.getInput('username');
    const password = core.getInput('password');
    const addLatest = core.getInput('addLatest') === 'true';
    const addTimestamp = core.getInput('addTimestamp') === 'true';
    const tags = parseArray(core.getInput('tags')) || docker.createTags(addLatest, addTimestamp);
    const buildArgs = parseArray(core.getInput('buildArgs'));
    const githubOwner = core.getInput('githubOrg') || github.getDefaultOwner();
    const labels = parseArray(core.getInput('labels'));
    const target = core.getInput('target');
    const dockerfile = core.getInput('dockerfile');
    const buildDir = core.getInput('directory') || '.';
    const enableBuildKit = core.getInput('enableBuildKit') === 'true';

    // Create the Docker image name
    const imageFullName = docker.createFullImageName(registry, image, githubOwner);
    core.info(`Docker image name used for this build: ${imageFullName}`);

    // Log in, build & push the Docker image
    docker.login(username, password, registry);
    docker.build(imageFullName, tags, buildArgs, labels, target, dockerfile, buildDir, enableBuildKit);
    docker.push(imageFullName, tags);

    // Capture outputs
    core.setOutput('imageFullName', imageFullName);
    core.setOutput('imageName', image);
    core.setOutput('tags', tags.join(','));
  } catch (error) {
    core.setFailed(error.message);
  }
};

module.exports = run;
