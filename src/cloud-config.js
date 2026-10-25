// TEST has no hosted backend. Start with test-only/Start-Test.ps1 for local Docker.
// The local server supplies its public config in memory; never commit secret keys.
export const CLOUD_CONFIG={
 enabled:true,
 commandFunction:'swift-handler',
 url:'',
 publishableKey:'',
 redirectUrl:''
};
