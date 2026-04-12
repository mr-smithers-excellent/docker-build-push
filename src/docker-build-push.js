import * as core from '@actions/core';
import * as docker from './docker.js';
import * as github from './github.js';
import { parseArray } from './utils.js';

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

const determineTags = (customTags, appendMode, addLatest, addTimestamp) => {
  if (!customTags) {
    return docker.createTags(addLatest, addTimestamp);
  }

  if (appendMode) {
    return docker.createTags(addLatest, addTimestamp).concat(customTags);
  }

  return customTags;
};

const setBuildOpts = (addLatest, addTimestamp) => {
  const customTags = parseArray(core.getInput('tags'));
  const appendMode = core.getInput('appendMode') === 'true';

  buildOpts.tags = determineTags(customTags, appendMode, addLatest, addTimestamp);

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
  buildOpts.cacheFrom = core.getInput('cacheFrom');
  buildOpts.cacheTo = core.getInput('cacheTo');
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
    const skipLogin = core.getInput('skipLogin') === 'true';
    setBuildOpts(addLatest, addTimestamp);

    // Create the Docker image name
    const imageFullName = docker.createFullImageName(registry, image, githubOwner);
    core.info(`Docker image name used for this build: ${imageFullName}`);

    // Log in, build & push the Docker image
    /* #224: https://github.com/mr-smithers-excellent/docker-build-push/issues/224 */
    if (skipLogin) {
      core.info('Skipping Docker login as skipLogin is set to true.');
      /* #373: https://github.com/mr-smithers-excellent/docker-build-push/issues/373 */
    } else if (buildOpts.skipPush && username === '') {
      core.warning(
        'Skipping docker authentication as no credentials were provided. If your base image is located on a private docker registry, the docker build might fail.'
      );
    } else {
      core.info('Perform docker login with provided credentials, even if pushImage is set to false.');
      docker.login(username, password, registry);
    }
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

export default run;
