jest.mock('@actions/core');

const core = require('@actions/core');
const docker = require('../src/docker');
const run = require('../src/docker-build-push');

describe('Create & push Docker image', () => {
  test('', async () => {
    const image = 'gcp-project/image';
    const registry = 'https://gcr.io';
    const tag = 'dev-1234567';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(image)
      .mockReturnValueOnce(registry)
      .mockReturnValueOnce(null);

    core.setOutput = jest
      .fn()
      .mockReturnValueOnce(`${registry}/${image}:${tag}`);

    docker.createTag = jest.fn().mockReturnValueOnce(tag);
    docker.build = jest.fn();
    docker.push = jest.fn();
    docker.login = jest.fn();

    await run();

    expect(docker.createTag).toHaveBeenCalledTimes(1);
    expect(core.getInput).toHaveBeenCalledTimes(3);
    expect(core.setOutput).toHaveBeenCalledWith(`${registry}/${image}:${tag}`);
  });
});
