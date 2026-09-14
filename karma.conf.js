// The project builds tests with `@angular/build:karma`, which supplies its own
// framework and plugins. This file exists only to add a launcher that runs
// without a sandbox, which a CI container cannot provide.
module.exports = function (config) {
  config.set({
    // `config.set` resets anything it does not name, so the framework the
    // builder relies on has to be restated here.
    frameworks: ['jasmine'],
    customLaunchers: {
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
      },
    },
  });
};
