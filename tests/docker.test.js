jest.mock('@actions/core');

const { context } = require('@actions/github');
const core = require('@actions/core');
const cp = require('child_process');
const fs = require('fs');
const docker = require('../src/docker');
const { cpOptions } = require('../src/utils');

describe('Create Docker image tags', () => {
  let addLatest;
  let addTimestamp;

  beforeEach(() => {
    addLatest = false;
    addTimestamp = false;
  });

  test('Create from tag push', () => {
    context.ref = 'refs/tags/v1.0';
    context.sha = '8d93430eddafb926c668181c71f579556f68668c';

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags).toContain('v1.0');
    expect(tags.length).toEqual(1);
  });

  test('Create from tag push with addLatest', () => {
    context.ref = 'refs/tags/v1.0';
    context.sha = '8d93430eddafb926c668181c71f579556f68668c';
    addLatest = true;

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags).toContain('v1.0');
    expect(tags).toContain('latest');
    expect(tags.length).toEqual(2);
  });

  test('Create from tag push with addTimestamp', () => {
    context.ref = 'refs/tags/v1.0';
    context.sha = '8d93430eddafb926c668181c71f579556f68668c';
    addLatest = true;
    addTimestamp = true;

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags).toContain('v1.0');
    expect(tags).toContain('latest');
    expect(tags.length).toEqual(2);
  });

  test('Create from tag push with capital letters', () => {
    context.ref = 'refs/tags/V1.0';
    context.sha = '60336540c3df28b52b1e364a65ff5b8f6ec135b8';

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags).toContain('v1.0');
    expect(tags.length).toEqual(1);
  });

  test('Create from master branch push', () => {
    context.ref = 'refs/heads/master';
    context.sha = '79d9bbba94cdbe372703f184e82c102107c71264';

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags).toContain('master-79d9bbb');
    expect(tags.length).toEqual(1);
  });

  test('Create from dev branch push with addLatest', () => {
    context.ref = 'refs/heads/dev';
    context.sha = '79d9bbba94cdbe372703f184e82c102107c71264';
    addLatest = true;

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags).toContain('dev-79d9bbb');
    expect(tags).toContain('latest');
    expect(tags.length).toEqual(2);
  });

  test('Create from dev branch push with addTimestamp', () => {
    context.ref = 'refs/heads/dev';
    context.sha = '79d9bbba94cdbe372703f184e82c102107c71264';
    addTimestamp = true;

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags.length).toEqual(1);
    const tag = tags[0];

    const baseTag = tag.substring(0, 11);
    expect(baseTag).toEqual('dev-79d9bbb');

    const timestamp = tag.substring(12, tag.length);
    expect(timestamp).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}\.[0-9]+$/);
  });

  test('Create from feature branch pre-pended with Jira ticket number', () => {
    context.ref = 'refs/heads/jira-123/feature/some-cool-feature';
    context.sha = 'f427b0b731ed7664ce4a9fba291ab25fa2e57bd3';

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags).toContain('jira-123-feature-some-cool-feature-f427b0b');
    expect(tags.length).toEqual(1);
  });

  test('Create from feature branch without Jira number', () => {
    context.ref = 'refs/heads/no-jira-number';
    context.sha = 'd3c98d2f50ab48322994ad6f80e460bde166b32f';

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags).toContain('no-jira-number-d3c98d2');
    expect(tags.length).toEqual(1);
  });

  test('Create from feature branch with capital letters', () => {
    context.ref = 'refs/heads/SOME-mixed-CASE-Branch';
    context.sha = '152568521eb446d7b331a4e7c1215d29605bf884';

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags).toContain('some-mixed-case-branch-1525685');
    expect(tags.length).toEqual(1);
  });

  test('Create from pull request push (not supported)', () => {
    context.ref = 'refs/pull/1';
    context.sha = '89977b79ba5102dab6f3687e6c3b9c1cda878d0a';
    core.setFailed = jest.fn();

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags.length).toEqual(0);
    expect(core.setFailed).toHaveBeenCalledWith(
      'Unsupported GitHub event - only supports push https://help.github.com/en/articles/events-that-trigger-workflows#push-event-push'
    );
  });
});

describe('Docker build, login & push commands', () => {
  cp.execSync = jest.fn();
  fs.existsSync = jest.fn();
  core.setFailed = jest.fn();

  afterEach(() => {
    cp.execSync.mockReset();
    fs.existsSync.mockReset();
    core.setFailed.mockReset();
  });

  afterAll(() => {
    cp.execSync.mockRestore();
    fs.existsSync.mockRestore();
    core.setFailed.mockRestore();
  });

  describe('Build image', () => {
    let buildOpts;
    let dockerfile;

    beforeEach(() => {
      buildOpts = {
        tags: undefined,
        buildArgs: undefined,
        labels: undefined,
        target: undefined,
        buildDir: '.',
        enableBuildKit: false,
        platform: undefined
      };
      dockerfile = 'Dockerfile';
    });

    test('No Dockerfile', () => {
      const image = 'gcr.io/some-project/image';
      buildOpts.tags = ['v1'];
      dockerfile = 'Dockerfile.nonexistent';

      docker.build(image, dockerfile, buildOpts);
      expect(fs.existsSync).toHaveBeenCalledWith(dockerfile);
      expect(core.setFailed).toHaveBeenCalledWith(`Dockerfile does not exist in location ${dockerfile}`);
    });

    test('Dockerfile exists', () => {
      const image = 'gcr.io/some-project/image';
      buildOpts.tags = ['v1'];
      fs.existsSync = jest.fn().mockReturnValueOnce(false);

      docker.build(image, dockerfile, buildOpts);
      expect(fs.existsSync).toHaveBeenCalledWith('Dockerfile');
      expect(cp.execSync).toHaveBeenCalledWith(`docker build -f Dockerfile -t ${image}:${buildOpts.tags} .`, cpOptions);
    });

    test('Build with build args', () => {
      const image = 'docker.io/this-project/that-image';
      buildOpts.tags = ['latest'];
      buildOpts.buildArgs = ['VERSION=latest', 'BUILD_DATE=2020-01-14'];

      docker.build(image, dockerfile, buildOpts);
      expect(fs.existsSync).toHaveBeenCalledWith('Dockerfile');
      expect(cp.execSync).toHaveBeenCalledWith(
        `docker build -f Dockerfile -t ${image}:${buildOpts.tags} --build-arg VERSION=latest --build-arg BUILD_DATE=2020-01-14 .`,
        cpOptions
      );
    });

    test('Build with labels and target', () => {
      const image = 'docker.io/this-project/that-image';
      buildOpts.tags = ['latest'];
      buildOpts.labels = ['version=1.0', 'maintainer=mr-smithers-excellent'];
      buildOpts.target = 'builder';

      docker.build(image, dockerfile, buildOpts);
      expect(fs.existsSync).toHaveBeenCalledWith('Dockerfile');
      expect(cp.execSync).toHaveBeenCalledWith(
        `docker build -f Dockerfile -t ${image}:${buildOpts.tags} --label version=1.0 --label maintainer=mr-smithers-excellent --target builder .`,
        cpOptions
      );
    });

    test('Build with platform', () => {
      const image = 'docker.io/this-project/that-image';
      buildOpts.tags = ['latest'];
      buildOpts.platform = 'linux/amd64,linux/arm64';

      docker.build(image, dockerfile, buildOpts);
      expect(fs.existsSync).toHaveBeenCalledWith('Dockerfile');
      expect(cp.execSync).toHaveBeenCalledWith(
        `docker build -f Dockerfile -t ${image}:${buildOpts.tags} --platform linux/amd64,linux/arm64 .`,
        cpOptions
      );
    });

    test('Build in different directory', () => {
      const image = 'gcr.io/some-project/image';
      buildOpts.tags = ['v1'];
      buildOpts.buildDir = 'working-dir';

      docker.build(image, dockerfile, buildOpts);
      expect(fs.existsSync).toHaveBeenCalledWith('Dockerfile');
      expect(cp.execSync).toHaveBeenCalledWith(
        `docker build -f Dockerfile -t ${image}:${buildOpts.tags} ${buildOpts.buildDir}`,
        cpOptions
      );
    });
  });

  describe('Registry login', () => {
    let username;
    let password;
    let registry;

    beforeEach(() => {
      username = undefined;
      password = undefined;
      registry = undefined;
    });

    test('Docker Hub login', () => {
      username = 'mrsmithers';
      password = 'areallysecurepassword';
      registry = 'docker.io';

      docker.login(username, password, registry);

      expect(cp.execSync).toHaveBeenCalledWith(`docker login -u ${username} --password-stdin ${registry}`, {
        input: password
      });
    });

    test('ECR login', () => {
      registry = '123456789123.dkr.ecr.us-east-1.amazonaws.com';

      docker.login(username, password, registry);

      expect(cp.execSync).toHaveBeenCalledWith(
        `aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${registry}`
      );
    });

    test('ECR Windows login', () => {
      process.env.RUNNER_OS = 'Windows';
      registry = '123456789123.dkr.ecr.us-east-1.amazonaws.com';

      docker.login(username, password, registry);

      expect(cp.execSync).toHaveBeenCalledWith(
        `aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${registry}`
      );
    });

    test('Skip login command if skipPush is set to true', () => {
      const skipPush = true;
      docker.login(username, password, registry, skipPush);

      expect(cp.execSync.mock.calls.length).toEqual(0);
    });

    test('Missing username or password should throw an error', () => {
      docker.login(undefined, undefined, registry);

      expect(cp.execSync.mock.calls.length).toEqual(0);
      expect(core.setFailed).toHaveBeenCalled();
    });

    test('returns undefined if empty login and does not execute command', () => {
      docker.login(username, password, registry);

      expect(cp.execSync.mock.calls.length).toEqual(0);
    });
  });

  describe('Docker push', () => {
    test('Docker Hub push', () => {
      const imageName = 'gcr.io/my-project/image';
      const tag = 'v1';

      docker.push(imageName, tag);

      expect(cp.execSync).toHaveBeenCalledWith(`docker push ${imageName} --all-tags`, cpOptions);
    });

    test('Skip push command if skipPush is set to true', () => {
      const skipPush = true;
      docker.push('my-org/my-image', 'latest', skipPush);

      expect(cp.execSync.mock.calls.length).toEqual(0);
    });
  });
});
