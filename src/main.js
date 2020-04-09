const run = require('./docker-build-push');

if (require.main === module) {
  run();
}
