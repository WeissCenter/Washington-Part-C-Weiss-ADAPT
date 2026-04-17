import { NgxLoggerLevel } from 'ngx-logger';

export const environment = {
  // NgxLoggerLevels: TRACE|DEBUG|INFO|LOG|WARN|ERROR|FATAL|OFF
  logLevel: NgxLoggerLevel.OFF,
  API_URL: '', //TODO: 
  VAPID_KEY: 'BIw-Au933HEBs8K8aTSSe15hztRM07WE-htpSG5eWnb-k2ilFGbeqlIGI7A3Xnl2lpJmaLgN-xjjsDr4oeWmLsk',
  cognitoRegion: 'us-east-1',
  cognitoDomainName: 'wac-prod-adaptadmin',
  s3PublicAssetsDomainName: 'wac-prod-adaptpublicassetsbucket',
  clientId: '6013sjr30onj14vf8vcfmt7dou',
  contentRoot: 'assets/text',
  contentFileName: 'admin-content-text.json',
  appDomain: 'dcyf-wa-admin.adaptdata.org',
  enforceLogin: true,
  envLabel: 'Prod',
  enforceRole: true,
  callbackUrl: 'https://dcyf-wa-admin.adaptdata.org/auth/redirect',
  Cognito: {
    userPoolId: 'us-east-1_WdruM7RlQ',
    userPoolClientId: '6013sjr30onj14vf8vcfmt7dou',
  },
  loginContent: 'assets/content-labels.json',
  pagesContent: 'assets/text/admin-content-text.json',
  organizationName: 'Department of Children, Youth, and Families (DCYF)',
  logoPath: 'assets/shared/logos/states/wa',
  logoExtension: 'png',
  logoStyleClass: 'width-card',
  copyrightText: 'The State of Washington.',
};
