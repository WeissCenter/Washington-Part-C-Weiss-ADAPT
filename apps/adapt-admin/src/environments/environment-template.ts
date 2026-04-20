import { NgxLoggerLevel } from 'ngx-logger';

export const environment = {
  // NgxLoggerLevels: TRACE|DEBUG|INFO|LOG|WARN|ERROR|FATAL|OFF
  logLevel: NgxLoggerLevel.OFF,
  API_URL: '',
  VAPID_KEY: '',
  cognitoRegion: 'us-east-1',
  cognitoDomainName: '',
  s3PublicAssetsDomainName: '',
  clientId: '',
  contentRoot: 'assets/text',
  contentFileName: 'admin-content-text.json',
  appDomain: '',
  enforceLogin: true,
  envLabel: 'Prod',
  enforceRole: true,
  callbackUrl: '',
  Cognito: {
    userPoolId: '',
    userPoolClientId: '',
  },
  loginContent: 'assets/content-labels.json',
  pagesContent: 'assets/text/admin-content-text.json',
  organizationName: 'User Organization',
  logoPath: 'assets/shared/logos/generic',
  logoExtension: 'svg',
  logoStyleClass: 'width-card',
  copyrightText: 'AEM Corporation.',
};
