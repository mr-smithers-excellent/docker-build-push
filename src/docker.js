const cp = require('child_process');
const core = require('@actions/core');
const fs = require('fs');
const { context } = require('@actions/github');
const { isGitHubTag, isBranch, isPullRequest, branchRefToSlug, prRefToSlug, tagRefToSlug } = require('./github');
const { timestamp, cpOptions, asBool } = require('./utils');

const GITHUB_REGISTRY_URLS = ['docker.pkg.github.com', 'ghcr.io'];

// Create the full Docker image name with registry prefix (without tags)
const createFullImageName = (registry, image, githubOwner) => {
  if (GITHUB_REGISTRY_URLS.includes(registry)) {
    return `${registry}/${githubOwner.toLowerCase()}/${image}`;
  }
  return `${registry}/${image}`;
};

// Create Docker tags based on input flags & Git branch
const createTags = (addLatest, addTimestamp) => {
  core.info('Creating Docker image tags...');
  const { sha } = context;
  const ref = context.ref.toLowerCase();
  const shortSha = sha.substring(0, 7);
  const dockerTags = [];

  if (isGitHubTag(ref)) {
    // If GitHub tag exists, use it as the Docker tag
    dockerTags.push(tagRefToSlug(ref));
  } else if (isBranch(ref)) {
    // If we're not building a tag, use branch-prefix-{GIT_SHORT_SHA) as the Docker tag
    // refs/heads/jira-123/feature/something
    const safeBranchName = branchRefToSlug(ref);
    const baseTag = `${safeBranchName}-${shortSha}`;
    const tag = addTimestamp ? `${baseTag}-${timestamp()}` : baseTag;
    dockerTags.push(tag);
  } else if (isPullRequest(ref)) {
    // pull_request event, use pr-{PR_NUMBER)-{GIT_SHORT_SHA) as the Docker tag
    const safePrRefName = prRefToSlug(ref);
    const baseTag = `pr-${safePrRefName}-${shortSha}`;
    const tag = addTimestamp ? `${baseTag}-${timestamp()}` : baseTag;
    dockerTags.push(tag);
  } else {
    core.setFailed(
      'Unsupported GitHub event - only supports push https://help.github.com/en/articles/events-that-trigger-workflows#push or' +
        ' pull https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request'
    );
  }

  if (asBool(addLatest)) {
    dockerTags.push('latest');
  }

  core.info(`Docker tags created: ${dockerTags}`);
  return dockerTags;
};

// Dynamically create 'docker build' command based on inputs provided
const createBuildCommand = (imageName, dockerfile, buildOpts) => {
  const tagsSuffix = buildOpts.tags.map(tag => `-t ${imageName}:${tag}`).join(' ');
  const builder = buildOpts.multiPlatform ? 'buildx build' : 'build';

  let buildCommandPrefix = `docker ${builder} -f ${dockerfile} ${tagsSuffix}`;

  if (buildOpts.buildArgs) {
    const argsSuffix = buildOpts.buildArgs.map(arg => `--build-arg ${arg}`).join(' ');
    buildCommandPrefix = `${buildCommandPrefix} ${argsSuffix}`;
  }

  if (buildOpts.labels) {
    const labelsSuffix = buildOpts.labels.map(label => `--label ${label}`).join(' ');
    buildCommandPrefix = `${buildCommandPrefix} ${labelsSuffix}`;
  }

  if (buildOpts.target) {
    buildCommandPrefix = `${buildCommandPrefix} --target ${buildOpts.target}`;
  }

  if (buildOpts.platform) {
    buildCommandPrefix = `${buildCommandPrefix} --platform ${buildOpts.platform}`;
  }

  if (buildOpts.multiPlatform && !buildOpts.skipPush) {
    buildCommandPrefix = `${buildCommandPrefix} --push`;
  }

  if (buildOpts.ssh) {
    const sshSuffix = buildOpts.ssh.map(ssh => `--ssh ${ssh}`).join(' ');
    buildCommandPrefix = `${buildCommandPrefix} ${sshSuffix}`;
  }

  if (buildOpts.enableBuildKit) {
    buildCommandPrefix = `DOCKER_BUILDKIT=1 ${buildCommandPrefix}`;
  }
  core.info(`BuildCommand ${buildCommandPrefix} ${buildOpts.buildDir}`);

  return `${buildCommandPrefix} ${buildOpts.buildDir}`;
};

// Perform 'docker build' command
const build = (imageName, dockerfile, buildOpts) => {
  if (!fs.existsSync(dockerfile)) {
    core.setFailed(`Dockerfile does not exist in location ${dockerfile}`);
  }

  // Setup buildx driver
  if (buildOpts.multiPlatform && !buildOpts.overrideDriver) {
    cp.execSync('docker buildx create --use');
  }

  core.info(`Building Docker image ${imageName} with tags ${buildOpts.tags}...`);
  cp.execSync(createBuildCommand(imageName, dockerfile, buildOpts), cpOptions);
};

const isEcr = registry => registry && registry.includes('amazonaws');

const getRegion = registry => registry.substring(registry.indexOf('ecr.') + 4, registry.indexOf('.amazonaws'));

// Log in to provided Docker registry
const login = (username, password, registry, skipPush) => {
  if (skipPush) {
    core.info('Input skipPush is set to true, skipping Docker log in step...');
    return;
  }

  // If using ECR, use the AWS CLI login command in favor of docker login
  if (isEcr(registry)) {
    const region = getRegion(registry);
    core.info(`Logging into ECR region ${region}...`);
    cp.execSync(
      `aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${registry}`
    );
  } else if (username && password) {
    core.info(`Logging into Docker registry ${registry}...`);
    cp.execSync(`docker login -u ${username} --password-stdin ${registry}`, {
      input: password
    });
  } else {
    core.setFailed('Must supply Docker registry credentials to push image!');
  }
};

// Push Docker image & all tags
const push = (imageName, tags, buildOpts) => {
  if (buildOpts?.multiPlatform) {
    core.info('Input multiPlatform is set to true, skipping Docker push step...');
    return;
  }
  if (buildOpts?.skipPush) {
    core.info('Input skipPush is set to true, skipping Docker push step...');
    return;
  }

  // Ensure tags is an array
  const tagArray = Array.isArray(tags) ? tags : [tags];
  core.info(`Pushing individual tags ${tagArray} for Docker image ${imageName}...`);

  tagArray.forEach(tag => {
    core.info(`Pushing tag: ${tag}`);
    cp.execSync(`docker push ${imageName}:${tag}`, cpOptions);
  });
};

module.exports = {
  createFullImageName,
  createTags,
  build,
  login,
  push
};
