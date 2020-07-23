jest.mock('@actions/core');

const { context } = require('@actions/github');
const core = require('@actions/core');
const cp = require('child_process');
const fs = require('fs');
const docker = require('../src/docker.js');
const cpOptions = require('../src/settings');

describe('Create Docker image tag from git ref', () => {
  test('Create from tag push', () => {
    context.ref = 'refs/tags/v1.0';
    context.sha = '8d93430eddafb926c668181c71f579556f68668c';

    expect(docker.createTag()).toBe('v1.0');
  });

  test('Create from tag push with capital letters', () => {
    context.ref = 'refs/tags/V1.0';
    context.sha = '60336540c3df28b52b1e364a65ff5b8f6ec135b8';

    expect(docker.createTag()).toBe('v1.0');
  });

  test('Create from master branch push', () => {
    context.ref = 'refs/heads/master';
    context.sha = '79d9bbba94cdbe372703f184e82c102107c71264';

    expect(docker.createTag()).toBe('master-79d9bbb');
  });

  test('Create from dev branch push', () => {
    context.ref = 'refs/heads/dev';
    context.sha = '79d9bbba94cdbe372703f184e82c102107c71264';

    expect(docker.createTag()).toBe('dev-79d9bbb');
  });

  test('Create from feature branch pre-pended with Jira ticket number', () => {
    context.ref = 'refs/heads/jira-123/feature/some-cool-feature';
    context.sha = 'f427b0b731ed7664ce4a9fba291ab25fa2e57bd3';

    expect(docker.createTag()).toBe('jira-123-f427b0b');
  });

  test('Create from feature branch without Jira number', () => {
    context.ref = 'refs/heads/no-jira-number';
    context.sha = 'd3c98d2f50ab48322994ad6f80e460bde166b32f';

    expect(docker.createTag()).toBe('no-jira-number-d3c98d2');
  });

  test('Create from feature branch with capital letters', () => {
    context.ref = 'refs/heads/SOME-mixed-CASE-Branch';
    context.sha = '152568521eb446d7b331a4e7c1215d29605bf884';

    expect(docker.createTag()).toBe('some-mixed-case-branch-1525685');
  });

  test('Create from pull request push (not supported)', () => {
    context.ref = 'refs/pull/1';
    context.sha = '89977b79ba5102dab6f3687e6c3b9c1cda878d0a';
    core.setFailed = jest.fn();

    const tag = docker.createTag();

    expect(tag).toBeUndefined();
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
      core.getInput.mockReturnValue(dockerfile);
      fs.existsSync.mockReturnValueOnce(false);

      docker.build('gcr.io/some-project/image:v1');
      expect(fs.existsSync).toHaveBeenCalledWith(dockerfile);
      expect(core.setFailed).toHaveBeenCalledWith(`Dockerfile does not exist in location ${dockerfile}`);
    });

    test('Dockerfile exists', () => {
      core.getInput.mockReturnValueOnce('Dockerfile');
      fs.existsSync.mockReturnValueOnce(true);
      const image = 'gcr.io/some-project/image:v1';

      docker.build(image);
      expect(fs.existsSync).toHaveBeenCalledWith('Dockerfile');
      expect(cp.execSync).toHaveBeenCalledWith(`docker build -f Dockerfile -t ${image} .`, cpOptions);
    });

    test('Build with build args', () => {
      core.getInput.mockReturnValueOnce('Dockerfile');
      core.getInput.mockReturnValueOnce('.');
      fs.existsSync.mockReturnValueOnce(true);
      const image = 'docker.io/this-project/that-image:latest';
      const buildArgs = ['VERSION=latest', 'BUILD_DATE=2020-01-14'];

      docker.build(image, buildArgs);
      expect(fs.existsSync).toHaveBeenCalledWith('Dockerfile');
      expect(cp.execSync).toHaveBeenCalledWith(
        `docker build -f Dockerfile -t ${image} --build-arg VERSION=latest --build-arg BUILD_DATE=2020-01-14 .`,
        cpOptions
      );
    });

    test('Build in different directory', () => {
      core.getInput.mockReturnValueOnce('Dockerfile');
      const directory = 'working-dir';
      core.getInput.mockReturnValueOnce(directory);
      fs.existsSync.mockReturnValueOnce(true);
      const image = 'gcr.io/some-project/image:v1';

      docker.build(image);
      expect(fs.existsSync).toHaveBeenCalledWith('Dockerfile');
      expect(cp.execSync).toHaveBeenCalledWith(`docker build -f Dockerfile -t ${image} ${directory}`, cpOptions);
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

      expect(cp.execSync).toHaveBeenCalledWith(`$(aws ecr get-login --region us-east-1 --no-include-email)`);
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
      const imageName = 'gcr.io/my-project/image:v1';

      docker.push(imageName);

      expect(cp.execSync).toHaveBeenCalledWith(`docker push ${imageName}`, cpOptions);
    });
  });
});
