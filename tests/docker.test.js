jest.mock('@actions/core');

const { context } = require('@actions/github');
const core = require('@actions/core');
const cp = require('child_process');
const fs = require('fs');
const docker = require('../src/docker.js');

describe('Create Docker image tag from git ref', () => {
  test('Create from tag push', () => {
    context.ref = 'refs/tags/v1.0';
    context.sha = '8d93430eddafb926c668181c71f579556f68668c';

    expect(docker.createTag()).toBe('v1.0');
  });

  test('Create from master branch push', () => {
    context.ref = 'refs/heads/master';
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

describe('Build image', () => {
  test('No Dockerfile', () => {
    const dockerfile = 'Dockerfile.nonexistent';
    core.getInput = jest.fn().mockReturnValue(dockerfile);
    fs.existsSync = jest.fn().mockReturnValueOnce(false);
    core.setFailed = jest.fn();
    cp.execSync = jest.fn();

    docker.build('gcr.io/some-project/image:v1');
    expect(fs.existsSync).toHaveBeenCalledWith(dockerfile);
    expect(core.setFailed).toHaveBeenCalledWith(`Dockerfile does not exist in location ${dockerfile}`);
  });

  test('Dockerfile exists', () => {
    core.getInput = jest.fn().mockReturnValue('Dockerfile');
    fs.existsSync = jest.fn().mockReturnValueOnce(true);
    cp.execSync = jest.fn();
    const image = 'gcr.io/some-project/image:v1';

    docker.build(image);
    expect(fs.existsSync).toHaveBeenCalledWith('Dockerfile');
    expect(cp.execSync).toHaveBeenCalledWith(`docker build -f Dockerfile -t ${image} .`);
  });
});

describe('Registry login', () => {
  test('Docker Hub login', () => {
    const registry = 'docker.io';
    const username = 'mrsmithers';
    const password = 'areallysecurepassword';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(registry)
      .mockReturnValueOnce(username)
      .mockReturnValueOnce(password);
    cp.execSync = jest.fn();

    docker.login();

    expect(cp.execSync).toHaveBeenCalledWith(`docker login -u ${username} --password-stdin ${registry}`, {
      input: password
    });
  });

  test('ECR login', () => {
    const registry = '123456789123.dkr.ecr.us-east-1.amazonaws.com';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(registry)
      .mockReturnValueOnce('')
      .mockReturnValueOnce('');

    cp.execSync = jest.fn();

    docker.login();

    expect(cp.execSync).toHaveBeenCalledWith(`$(aws ecr get-login --region us-east-1 --no-include-email)`);
  });
});

describe('Docker push', () => {
  test('Docker Hub push', () => {
    const imageName = 'gcr.io/my-project/image:v1';
    cp.execSync = jest.fn();

    docker.push(imageName);

    expect(cp.execSync).toHaveBeenCalledWith(`docker push ${imageName}`);
  });
});
