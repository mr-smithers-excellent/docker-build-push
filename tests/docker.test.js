import { jest } from '@jest/globals';

jest.unstable_mockModule('@actions/core', () => ({
  setFailed: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  getInput: jest.fn(),
  setOutput: jest.fn()
}));

const core = await import('@actions/core');
const { default: cp } = await import('child_process');
const { default: fs } = await import('fs');
const { default: MockDate } = await import('mockdate');
const docker = await import('../src/docker.js');
const { cpOptions } = await import('../src/utils.js');

describe('Create Docker image tags', () => {
  let addLatest;
  let addTimestamp;

  beforeEach(() => {
    MockDate.set(new Date('2023-06-13T00:00:00'));
    addLatest = false;
    addTimestamp = false;
  });

  afterEach(() => {
    MockDate.reset();
    delete process.env.GITHUB_REF;
    delete process.env.GITHUB_SHA;
    core.setFailed.mockClear();
  });

  test('Create from tag push', () => {
    process.env.GITHUB_REF = 'refs/tags/v1.0';
    process.env.GITHUB_SHA = '8d93430eddafb926c668181c71f579556f68668c';

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags).toContain('v1.0');
    expect(tags.length).toEqual(1);
  });

  test('Create from tag push with addLatest', () => {
    process.env.GITHUB_REF = 'refs/tags/v1.0';
    process.env.GITHUB_SHA = '8d93430eddafb926c668181c71f579556f68668c';
    addLatest = true;

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags).toContain('v1.0');
    expect(tags).toContain('latest');
    expect(tags.length).toEqual(2);
  });

  test('Create from tag push with addLatest passed as string', () => {
    process.env.GITHUB_REF = 'refs/tags/v1.0';
    process.env.GITHUB_SHA = '8d93430eddafb926c668181c71f579556f68668c';
    addLatest = 'true';

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags).toContain('v1.0');
    expect(tags).toContain('latest');
    expect(tags.length).toEqual(2);
  });

  test('Create from tag push with addTimestamp', () => {
    process.env.GITHUB_REF = 'refs/tags/v1.0';
    process.env.GITHUB_SHA = '8d93430eddafb926c668181c71f579556f68668c';
    addLatest = true;
    addTimestamp = true;

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags).toContain('v1.0');
    expect(tags).toContain('latest');
    expect(tags.length).toEqual(2);
  });

  test('Create from tag push with capital letters', () => {
    process.env.GITHUB_REF = 'refs/tags/V1.0';
    process.env.GITHUB_SHA = '60336540c3df28b52b1e364a65ff5b8f6ec135b8';

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags).toContain('v1.0');
    expect(tags.length).toEqual(1);
  });

  test('Create from master branch push', () => {
    process.env.GITHUB_REF = 'refs/heads/master';
    process.env.GITHUB_SHA = '79d9bbba94cdbe372703f184e82c102107c71264';

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags).toContain('master-79d9bbb');
    expect(tags.length).toEqual(1);
  });

  test('Create from dev branch push with addLatest', () => {
    process.env.GITHUB_REF = 'refs/heads/dev';
    process.env.GITHUB_SHA = '79d9bbba94cdbe372703f184e82c102107c71264';
    addLatest = true;

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags).toContain('dev-79d9bbb');
    expect(tags).toContain('latest');
    expect(tags.length).toEqual(2);
  });

  test('Create from dev branch push with addTimestamp', () => {
    process.env.GITHUB_REF = 'refs/heads/dev';
    process.env.GITHUB_SHA = '79d9bbba94cdbe372703f184e82c102107c71264';
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
    process.env.GITHUB_REF = 'refs/heads/jira-123/feature/some-cool-feature';
    process.env.GITHUB_SHA = 'f427b0b731ed7664ce4a9fba291ab25fa2e57bd3';

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags).toContain('jira-123-feature-some-cool-feature-f427b0b');
    expect(tags.length).toEqual(1);
  });

  test('Create from feature branch without Jira number', () => {
    process.env.GITHUB_REF = 'refs/heads/no-jira-number';
    process.env.GITHUB_SHA = 'd3c98d2f50ab48322994ad6f80e460bde166b32f';

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags).toContain('no-jira-number-d3c98d2');
    expect(tags.length).toEqual(1);
  });

  test('Create from feature branch with capital letters', () => {
    process.env.GITHUB_REF = 'refs/heads/SOME-mixed-CASE-Branch';
    process.env.GITHUB_SHA = '152568521eb446d7b331a4e7c1215d29605bf884';

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags).toContain('some-mixed-case-branch-1525685');
    expect(tags.length).toEqual(1);
  });

  test('Create from pull request', () => {
    process.env.GITHUB_REF = 'refs/pull/1/merge';
    process.env.GITHUB_SHA = '89977b79ba5102dab6f3687e6c3b9c1cda878d0a';

    const tags = docker.createTags(addLatest, false);

    expect(tags.length).toEqual(1);
    expect(tags[0]).toBe('pr-1-89977b7');
  });

  test('Create from pull request with timestamp', () => {
    process.env.GITHUB_REF = 'refs/pull/1/merge';
    process.env.GITHUB_SHA = '89977b79ba5102dab6f3687e6c3b9c1cda878d0a';

    const tags = docker.createTags(addLatest, true);

    expect(tags.length).toEqual(1);
    expect(tags[0]).toBe('pr-1-89977b7-2023-06-13.000600');
  });

  test('Create from unknown event (not supported)', () => {
    process.env.GITHUB_REF = 'refs/unknown/';
    process.env.GITHUB_SHA = '89977b79ba5102dab6f3687e6c3b9c1cda878d0a';

    const tags = docker.createTags(addLatest, addTimestamp);

    expect(tags.length).toEqual(0);
    expect(core.setFailed).toHaveBeenCalledWith(
      'Unsupported GitHub event - only supports push https://help.github.com/en/articles/events-that-trigger-workflows#push or pull https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request'
    );
  });
});

describe('Docker build, login & push commands', () => {
  cp.execSync = jest.fn();
  fs.existsSync = jest.fn();

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
      fs.existsSync.mockReturnValueOnce(false);

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

    test('Build with cache from and cache to', () => {
      const image = 'docker.io/this-project/that-image';
      buildOpts.tags = ['latest'];
      buildOpts.cacheFrom = ['type=gha'];
      buildOpts.cacheTo = ['type=gha,mode=max'];

      docker.build(image, dockerfile, buildOpts);
      expect(fs.existsSync).toHaveBeenCalledWith('Dockerfile');
      expect(cp.execSync).toHaveBeenCalledWith(
        `docker build -f Dockerfile -t ${image}:${buildOpts.tags} --cache-from type=gha --cache-to type=gha,mode=max .`,
        cpOptions
      );
    });

    test('Build with only cache from', () => {
      const image = 'docker.io/this-project/that-image';
      buildOpts.tags = ['latest'];
      buildOpts.cacheFrom = ['type=registry,ref=myimage:cache'];

      docker.build(image, dockerfile, buildOpts);
      expect(fs.existsSync).toHaveBeenCalledWith('Dockerfile');
      expect(cp.execSync).toHaveBeenCalledWith(
        `docker build -f Dockerfile -t ${image}:${buildOpts.tags} --cache-from type=registry,ref=myimage:cache .`,
        cpOptions
      );
    });

    test('Build with only cache to', () => {
      const image = 'docker.io/this-project/that-image';
      buildOpts.tags = ['latest'];
      buildOpts.cacheTo = ['type=gha,mode=max'];

      docker.build(image, dockerfile, buildOpts);
      expect(fs.existsSync).toHaveBeenCalledWith('Dockerfile');
      expect(cp.execSync).toHaveBeenCalledWith(
        `docker build -f Dockerfile -t ${image}:${buildOpts.tags} --cache-to type=gha,mode=max .`,
        cpOptions
      );
    });

    test('Build with multiple cache from sources', () => {
      const image = 'docker.io/this-project/that-image';
      buildOpts.tags = ['latest'];
      buildOpts.cacheFrom = ['type=registry,ref=img:PR-1-buildcache', 'type=registry,ref=img:buildcache'];

      docker.build(image, dockerfile, buildOpts);
      expect(fs.existsSync).toHaveBeenCalledWith('Dockerfile');
      expect(cp.execSync).toHaveBeenCalledWith(
        `docker build -f Dockerfile -t ${image}:${buildOpts.tags} --cache-from type=registry,ref=img:PR-1-buildcache --cache-from type=registry,ref=img:buildcache .`,
        cpOptions
      );
    });

    test('Build with multiple cache to destinations', () => {
      const image = 'docker.io/this-project/that-image';
      buildOpts.tags = ['latest'];
      buildOpts.cacheTo = ['type=gha,mode=max', 'type=registry,ref=img:buildcache,mode=max'];

      docker.build(image, dockerfile, buildOpts);
      expect(fs.existsSync).toHaveBeenCalledWith('Dockerfile');
      expect(cp.execSync).toHaveBeenCalledWith(
        `docker build -f Dockerfile -t ${image}:${buildOpts.tags} --cache-to type=gha,mode=max --cache-to type=registry,ref=img:buildcache,mode=max .`,
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
    test('Docker Hub push with single tag', () => {
      const imageName = 'gcr.io/my-project/image';
      const tags = ['v1'];

      docker.push(imageName, tags);

      expect(cp.execSync).toHaveBeenCalledWith(`docker push ${imageName}:v1`, cpOptions);
    });

    test('Docker Hub push with multiple tags', () => {
      const imageName = 'gcr.io/my-project/image';
      const tags = ['v1', 'latest'];

      docker.push(imageName, tags);

      expect(cp.execSync).toHaveBeenCalledWith(`docker push ${imageName}:v1`, cpOptions);
      expect(cp.execSync).toHaveBeenCalledWith(`docker push ${imageName}:latest`, cpOptions);
    });

    test('Skip push command if skipPush is set to true', () => {
      const buildOpts = {
        skipPush: true
      };
      docker.push('my-org/my-image', ['latest'], buildOpts);

      expect(cp.execSync.mock.calls.length).toEqual(0);
    });

    test('Skip push command if multiPlatform is set to true', () => {
      const buildOpts = {
        multiPlatform: true
      };
      docker.push('my-org/my-image', ['latest'], buildOpts);

      expect(cp.execSync.mock.calls.length).toEqual(0);
    });
  });
});
