const cp = require('child_process');
const core = require('@actions/core');
const fs = require('fs');
const { context } = require('@actions/github');

const isGitHubTag = ref => ref && ref.includes('refs/tags/');

const isMasterBranch = ref => ref && ref === 'refs/heads/master';

const isNotMasterBranch = ref => ref && ref.includes('refs/heads/') && ref !== 'refs/heads/master';

const createTag = () => {
  core.info('Creating Docker image tag...');
  const { ref, sha } = context;
  const shortSha = sha.substring(0, 7);
  let dockerTag;

  if (isGitHubTag(ref)) {
    // If GitHub tag exists, use it as the Docker tag
    dockerTag = ref.replace('refs/tags/', '');
  } else if (isMasterBranch(ref)) {
    // If we're on the master branch, use dev-{GIT_SHORT_SHA} as the Docker tag
    dockerTag = `dev-${shortSha}`;
  } else if (isNotMasterBranch(ref)) {
    // If we're on a non-master branch, use branch-prefix-{GIT_SHORT_SHA) as the Docker tag
    // refs/heads/jira-123/feature/something
    const branchName = ref.replace('refs/heads/', '');
    const branchPrefix = branchName.includes('/') ? branchName.substring(0, branchName.indexOf('/')) : branchName;
    dockerTag = `${branchPrefix}-${shortSha}`;
  } else {
    core.setFailed(
      'Unsupported GitHub event - only supports push https://help.github.com/en/articles/events-that-trigger-workflows#push-event-push'
    );
  }
  return dockerTag;
};

const build = imageName => {
  core.info(`Building Docker image: ${imageName}...`);
  if (!fs.existsSync('./Dockerfile')) {
    core.setFailed('Dockerfile does not exist in root project directory!');
  }

  cp.execSync(`docker build -t ${imageName} .`);
};

const isEcr = registry => {
  return registry && registry.includes('amazonaws');
};

const getRegion = registry => {
  return registry.substring(registry.indexOf('ecr.') + 4, registry.indexOf('.amazonaws'));
};

const login = () => {

  const registry = core.getInput('registry', { required: true });
  const username = core.getInput('username');
  const password = core.getInput('password');

  // If using ECR, use the AWS CLI login command in favor of docker login
  if (isEcr(registry)) {
    core.info('Logging into ECR...');
    cp.execSync(`aws ecr get-login --region ${getRegion(registry)} --no-include-email`);
  } else if (username && password) {
    core.info('Logging into Docker registry...');
    cp.execSync(`docker login -u ${username} --password-stdin ${registry}`, {
      input: password
    });
  }
};

const push = imageName => {
  core.info('Pushing Docker image...');
  cp.execSync(`docker push ${imageName}`);
};

module.exports = {
  createTag,
  build,
  login,
  push
};
