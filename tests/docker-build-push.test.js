jest.mock('@actions/core');

const core = require('@actions/core');
const docker = require('../src/docker');
const run = require('../src/docker-build-push');

beforeAll(() => {
  docker.build = jest.fn();
  docker.push = jest.fn();
});

describe('Create & push Docker image', () => {
  test('Valid Docker inputs', () => {
    const image = 'gcp-project/image';
    const registry = 'gcr.io';
    const tag = 'dev-1234567';

    docker.login = jest.fn();
    docker.createTag = jest.fn().mockReturnValueOnce(tag);
    core.getInput = jest
      .fn()
      .mockReturnValueOnce(image)
      .mockReturnValueOnce(registry)
      .mockReturnValueOnce(null);
    core.setOutput = jest.fn().mockReturnValueOnce(`${registry}/${image}:${tag}`);

    run();

    expect(docker.createTag).toHaveBeenCalledTimes(1);
    expect(core.getInput).toHaveBeenCalledTimes(3);
    expect(core.setOutput).toHaveBeenCalledWith(`${registry}/${image}:${tag}`);
  });
});

describe('Create Docker image causing an error', () => {
  test('Docker login error', () => {
    docker.createTag = jest.fn().mockRejectedValue('some-tag');
    const error = 'Error: Cannot perform an interactive login from a non TTY device';
    docker.login = jest.fn().mockImplementation(() => {
      throw new Error(error);
    });
    core.setFailed = jest.fn();

    run();

    expect(docker.createTag).toHaveBeenCalledTimes(1);
    expect(core.setFailed).toHaveBeenCalledWith(error);
  });
});
