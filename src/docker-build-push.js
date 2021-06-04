const core = require('@actions/core');
const docker = require('./docker');
const github = require('./github');

const GITHUB_REGISTRY_URLS = ['docker.pkg.github.com', 'ghcr.io'];

let image;
let registry;
let tags;
let buildArgs;
let githubOwner;
let labels;

// Convert buildArgs from String to Array, as GH Actions currently does not support Arrays
const processBuildArgsInput = buildArgsInput => {
  if (buildArgsInput) {
    buildArgs = buildArgsInput.split(',');
  }

  return buildArgs;
};

const split = stringArray =>
  stringArray === null || stringArray === undefined || stringArray === ''
    ? undefined
    : stringArray.split(',').map(value => value.trim());

// Get GitHub Action inputs
const processInputs = () => {
  image = core.getInput('image', { required: true });
  registry = core.getInput('registry', { required: true });
  tags = split(core.getInput('tags')) || docker.createTags();
  buildArgs = processBuildArgsInput(core.getInput('buildArgs'));
  githubOwner = core.getInput('githubOrg') || github.getDefaultOwner();
  labels = split(core.getInput('labels'));
};

const isGithubRegistry = () => {
  return GITHUB_REGISTRY_URLS.includes(registry);
};

// Create the full Docker image name with registry prefix (without tag)
const createFullImageName = () => {
  let imageFullName;
  if (isGithubRegistry()) {
    imageFullName = `${registry}/${githubOwner.toLowerCase()}/${image}`;
  } else {
    imageFullName = `${registry}/${image}`;
  }
  return imageFullName;
};

const run = () => {
  try {
    processInputs();

    const imageFullName = createFullImageName();
    core.info(`Docker image name created: ${imageFullName}`);

    // const tagsCopy = tags.slice();
    // const firstTag = tagsCopy.shift();

    docker.login();
    // docker.build(imageFullName, firstTag, buildArgs, labels);
    // docker.push(imageFullName, firstTag);
    docker.build(imageFullName, tags, buildArgs, labels);
    docker.push(imageFullName, tags);

    // TODO: Refactor to use commands
    // docker build -t mrsmithers/e2e-image:latest -t mrsmithers/e2e-image:v1 -f e2e/Dockerfile .
    // docker push mrsmithers/e2e-image --all-tags
    // tagsCopy.forEach(tag => {
    //   docker.tag(imageFullName, firstTag, tag);
    //   docker.push(imageFullName, tag);
    //   core.info(`Docker image ${imageFullName}:${firstTag} pushed to registry`);
    // });

    core.setOutput('imageFullName', imageFullName);
    core.setOutput('imageName', image);
    core.setOutput('tags', tags.join(','));
  } catch (error) {
    core.setFailed(error.message);
  }
};

module.exports = run;
