import { API } from 'homebridge';

import { PLATFORM_NAME } from './settings';
import { EsjRPi } from './platform';

export = (api: API) => {
  api.registerPlatform(PLATFORM_NAME, EsjRPi);
};
