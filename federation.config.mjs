import { withNativeFederation, share } from '@angular-architects/native-federation/config';

const sharedConfig = {
  singleton: true,
  strictVersion: true,
  requiredVersion: 'auto',
  build: 'package',
};

export default withNativeFederation({
  name: 'Drivoo',

  remotes: {
    // easyorders: 'http://localhost:4201/remoteEntry.json',
    easyorders: 'https://widget.drivoo.co/easyorders/remoteEntry.json',
  },

  shared: share({
    '@angular/core': { ...sharedConfig, includeSecondaries: { keepAll: true } },
    '@angular/common': { ...sharedConfig, includeSecondaries: { keepAll: true } },
    '@angular/animations': { ...sharedConfig, includeSecondaries: { keepAll: true } },
    '@angular/forms': { ...sharedConfig, includeSecondaries: { keepAll: true } },
    '@angular/router': { ...sharedConfig, includeSecondaries: { keepAll: true } },
    '@angular/platform-browser': { ...sharedConfig, includeSecondaries: { keepAll: true } },
    '@angular/material': {
      ...sharedConfig,
      includeSecondaries: { keepAll: true, skip: ['@angular/material/schematics'] },
    },
    '@angular/cdk': {
      ...sharedConfig,
      includeSecondaries: { keepAll: true, skip: ['@angular/cdk/schematics'] },
    },
    rxjs: sharedConfig,
    'rxjs/operators': sharedConfig,
    '@ngx-translate/core': sharedConfig,
    '@ngx-translate/http-loader': sharedConfig,
    'ngx-skeleton-loader': sharedConfig,
  }),

  sharedMappings: [],

  skip: [
    'rxjs/ajax',
    'rxjs/fetch',
    'rxjs/testing',
    'rxjs/webSocket',
    '@angular/cdk/schematics',
    '@angular/material/schematics',
    '@angular-devkit/core',
    '@angular-devkit/schematics',
    '@schematics/angular',
    'source-map-support',
    '@angular/compiler',
    '@angular/platform-browser-dynamic',
    '@angular-architects/native-federation',
    '@angular-architects/module-federation',
    (pkg) => pkg.includes('/schematics'),
    /^@angular-devkit\//,
    /^@schematics\//,
  ],

  features: {
    denseChunking: true,
    denseExternals: true,
    strictImports: false,
  },
});
