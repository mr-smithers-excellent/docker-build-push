jest.mock('@actions/core');

const { context } = require('@actions/github');
const core = require('@actions/core');
const cp = require('child_process');
const fs = require('fs');
const docker = require('../src/docker');
const cpOptions = require('../src/settings');

describe('Create Docker image tag from git ref', () => {
  beforeEach(() => {
    // core.getInput.mockReturnValueOnce('false');
    // core.getInput.mockReturnValueOnce('false');
  });

  test('Create from tag push', () => {
    context.ref = 'refs/tags/v1.0';
    context.sha = '8d93430eddafb926c668181c71f579556f68668c';
    core.getInput.mockReturnValueOnce('false');

    const tags = docker.createTags();

    expect(tags).toContain('v1.0');
    expect(tags.length).toEqual(1);
  });

  test('Create from tag push with addLatest', () => {
    context.ref = 'refs/tags/v1.0';
    context.sha = '8d93430eddafb926c668181c71f579556f68668c';
    core.getInput.mockReturnValueOnce('true');

    const tags = docker.createTags();

    expect(tags).toContain('v1.0');
    expect(tags).toContain('latest');
    expect(tags.length).toEqual(2);
  });

  test('Create from tag push with addTimestamp', () => {
    context.ref = 'refs/tags/v1.0';
    context.sha = '8d93430eddafb926c668181c71f579556f68668c';
    core.getInput.mockReturnValueOnce('true');

    const tags = docker.createTags();

    expect(tags).toContain('v1.0');
    expect(tags).toContain('latest');
    expect(tags.length).toEqual(2);
  });

  test('Create from tag push with capital letters', () => {
    context.ref = 'refs/tags/V1.0';
    context.sha = '60336540c3df28b52b1e364a65ff5b8f6ec135b8';
    core.getInput.mockReturnValueOnce('foo');

    const tags = docker.createTags();

    expect(tags).toContain('v1.0');
    expect(tags.length).toEqual(1);
  });

  test('Create from master branch push', () => {
    context.ref = 'refs/heads/master';
    context.sha = '79d9bbba94cdbe372703f184e82c102107c71264';

    const tags = docker.createTags();

    expect(tags).toContain('master-79d9bbb');
    expect(tags.length).toEqual(1);
  });

  test('Create from dev branch push with addLatest', () => {
    context.ref = 'refs/heads/dev';
    context.sha = '79d9bbba94cdbe372703f184e82c102107c71264';
    core.getInput.mockReturnValueOnce('true');

    const tags = docker.createTags();

    expect(tags).toContain('dev-79d9bbb');
    expect(tags).toContain('latest');
    expect(tags.length).toEqual(2);
  });

  

  test('Create from dev branch push with addTimestamp', () => {
    context.ref = 'refs/heads/dev';
    context.sha = '79d9bbba94cdbe372703f184e82c102107c71264';
    core.getInput.mockReturnValueOnce('false');
    core.getInput.mockReturnValueOnce('true');

    const tags = docker.createTags();

    expect(tags.length).toEqual(1);
    const tag = tags[0];

    const baseTag = tag.substring(0, 11);
    expect(baseTag).toEqual('dev-79d9bbb');

    const timestamp = tag.substring(12, tag.length);
    expect(timestamp).toMatch(/^[0-9]{4}-[0-9]{2}-[0-9]{2}\.[0-9]+$/);
  });

  test('Create from dev branch push with addTimestamp and numericTimestamp', () => {
    context.ref = 'refs/heads/dev';
    context.sha = '79d9bbba94cdbe372703f184e82c102107c71264';
    core.getInput.mockReturnValueOnce('false');
    core.getInput.mockReturnValueOnce('true');
    core.getInput.mockReturnValueOnce('true');

    const tags = docker.createTags();

    expect(tags.length).toEqual(1);
    const tag = tags[0];

    const baseTag = tag.substring(0, 11);
    expect(baseTag).toEqual('dev-79d9bbb');

    const timestamp = tag.substring(12, tag.length);
    expect(timestamp).toMatch(/^\d+$/);
  });

  test('Create from feature branch pre-pended with Jira ticket number', () => {
    context.ref = 'refs/heads/jira-123/feature/some-cool-feature';
    context.sha = 'f427b0b731ed7664ce4a9fba291ab25fa2e57bd3';

    const tags = docker.createTags();

    expect(tags).toContain('jira-123-feature-some-cool-feature-f427b0b');
    expect(tags.length).toEqual(1);
  });

  test('Create from feature branch without Jira number', () => {
    context.ref = 'refs/heads/no-jira-number';
    context.sha = 'd3c98d2f50ab48322994ad6f80e460bde166b32f';

    const tags = docker.createTags();

    expect(tags).toContain('no-jira-number-d3c98d2');
    expect(tags.length).toEqual(1);
  });

  test('Create from feature branch with capital letters', () => {
    context.ref = 'refs/heads/SOME-mixed-CASE-Branch';
    context.sha = '152568521eb446d7b331a4e7c1215d29605bf884';

    const tags = docker.createTags();

    expect(tags).toContain('some-mixed-case-branch-1525685');
    expect(tags.length).toEqual(1);
  });

  test('Create from pull request push (not supported)', () => {
    context.ref = 'refs/pull/1';
    context.sha = '89977b79ba5102dab6f3687e6c3b9c1cda878d0a';
    core.setFailed = jest.fn();

    const tags = docker.createTags();

    expect(tags.length).toEqual(0);
    expect(core.setFailed).toHaveBeenCalledWith(
      'Unsupported GitHub event - only supports push https://help.github.com/en/articles/events-that-trigger-workflows#push-event-push'
    );
  });
});

describe('core and cp methods', () => {
  core.getInput = jest.fn();
  core.setFailed = jest.fn();
  cp.execSync = jest.fn();
  fs.existsSync = jest.fn();

  afterEach(() => {
    core.getInput.mockReset();
    core.setFailed.mockReset();
    cp.execSync.mockReset();
    fs.existsSync.mockReset();
  });

  afterAll(() => {
    core.getInput.mockRestore();
    core.setFailed.mockRestore();
    cp.execSync.mockRestore();
    fs.existsSync.mockRestore();
  });

  describe('Build image', () => {
    test('No Dockerfile', () => {
      const dockerfile = 'Dockerfile.nonexistent';
      core.getInput.mockReturnValueOnce(dockerfile);
      fs.existsSync.mockReturnValueOnce(false);

      docker.build('gcr.io/some-project/image', ['v1']);
      expect(fs.existsSync).toHaveBeenCalledWith(dockerfile);
      expect(core.setFailed).toHaveBeenCalledWith(`Dockerfile does not exist in location ${dockerfile}`);
    });

    test('Dockerfile exists', () => {
      core.getInput.mockReturnValueOnce('Dockerfile');
      fs.existsSync.mockReturnValueOnce(true);
      const image = 'gcr.io/some-project/image';
      const tag = 'v1';

      docker.build(image, [tag]);
      expect(fs.existsSync).toHaveBeenCalledWith('Dockerfile');
      expect(cp.execSync).toHaveBeenCalledWith(`docker build -f Dockerfile -t ${image}:${tag} .`, cpOptions);
    });

    test('Build with build args', () => {
      core.getInput.mockReturnValueOnce('Dockerfile');
      core.getInput.mockReturnValueOnce('.');
      fs.existsSync.mockReturnValueOnce(true);
      const image = 'docker.io/this-project/that-image';
      const tag = 'latest';
      const buildArgs = ['VERSION=latest', 'BUILD_DATE=2020-01-14'];

      docker.build(image, [tag], buildArgs);
      expect(fs.existsSync).toHaveBeenCalledWith('Dockerfile');
      expect(cp.execSync).toHaveBeenCalledWith(
        `docker build -f Dockerfile -t ${image}:${tag} --build-arg VERSION=latest --build-arg BUILD_DATE=2020-01-14 .`,
        cpOptions
      );
    });

    test('Build with labels and target', () => {
      core.getInput.mockReturnValueOnce('Dockerfile');
      core.getInput.mockReturnValueOnce('.');
      fs.existsSync.mockReturnValueOnce(true);
      const image = 'docker.io/this-project/that-image';
      const tag = 'latest';
      const labels = ['version=1.0', 'maintainer=mr-smithers-excellent'];
      const target = 'builder';

      docker.build(image, [tag], null, labels, target);
      expect(fs.existsSync).toHaveBeenCalledWith('Dockerfile');
      expect(cp.execSync).toHaveBeenCalledWith(
        `docker build -f Dockerfile -t ${image}:${tag} --label version=1.0 --label maintainer=mr-smithers-excellent --target builder .`,
        cpOptions
      );
    });

    test('Build in different directory', () => {
      core.getInput.mockReturnValueOnce('Dockerfile');
      const directory = 'working-dir';
      core.getInput.mockReturnValueOnce(directory);
      fs.existsSync.mockReturnValueOnce(true);
      const image = 'gcr.io/some-project/image';
      const tag = 'v1';

      docker.build(image, [tag]);
      expect(fs.existsSync).toHaveBeenCalledWith('Dockerfile');
      expect(cp.execSync).toHaveBeenCalledWith(`docker build -f Dockerfile -t ${image}:${tag} ${directory}`, cpOptions);
    });
  });

  describe('Registry login', () => {
    test('Docker Hub login', () => {
      const registry = 'docker.io';
      const username = 'mrsmithers';
      const password = 'areallysecurepassword';

      core.getInput.mockReturnValueOnce(registry).mockReturnValueOnce(username).mockReturnValueOnce(password);

      docker.login();

      expect(cp.execSync).toHaveBeenCalledWith(`docker login -u ${username} --password-stdin ${registry}`, {
        input: password
      });
    });

    test('ECR login', () => {
      const registry = '123456789123.dkr.ecr.us-east-1.amazonaws.com';

      core.getInput.mockReturnValueOnce(registry).mockReturnValueOnce('').mockReturnValueOnce('');

      docker.login();

      expect(cp.execSync).toHaveBeenCalledWith(
        `aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${registry}`
      );
    });

    test('ECR Windows login', () => {
      process.env.RUNNER_OS = 'Windows';
      const registry = '123456789123.dkr.ecr.us-east-1.amazonaws.com';

      core.getInput.mockReturnValueOnce(registry).mockReturnValueOnce('').mockReturnValueOnce('');

      docker.login();

      expect(cp.execSync).toHaveBeenCalledWith(
        `aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ${registry}`
      );
    });

    test("returns undefined if empty login and doesn't execute command", () => {
      core.getInput.mockReturnValueOnce('').mockReturnValueOnce('').mockReturnValueOnce('');

      docker.login();

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
  });
});
