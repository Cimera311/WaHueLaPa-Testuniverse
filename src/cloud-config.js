// TEST environment only. Set an isolated Supabase project before enabling.
// Never put service-role or other private keys in frontend files.
export const CLOUD_CONFIG = {
  enabled: false,
  commandFunction: 'swift-handler',
  url: '',
  publishableKey: '',
  redirectUrl: 'https://cimera311.github.io/WaHueLaPa-Testuniverse/'
};
