import { initFederation } from '@angular-architects/native-federation';

initFederation({
  //'easyorders': 'http://localhost:4201/remoteEntry.json'
  'easyorders': 'https://widget.drivoo.co/easyorders/remoteEntry.json?v=1'
}, {
  hostRemoteEntry: { url: "./remoteEntry.json" }
})
  .catch(err => console.error(err))
  .then(_ => import('./bootstrap'))
  .catch(err => console.error(err));
