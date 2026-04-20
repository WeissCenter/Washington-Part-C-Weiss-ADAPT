// old setup
/*
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { appConfig } from './app.config';

const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering()],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);



 */

// new setup
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { serverRoutes } from './app.routes.server';
import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { appConfig } from './app.config';

/**
 * Server-side configuration (Angular 19 SSR)
 * Combines browser config with server-specific providers.
 */
const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering(withRoutes(serverRoutes))],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);

// future setup
/*
import { ApplicationConfig, inject, mergeApplicationConfig, RESPONSE_INIT, InjectionToken } from '@angular/core';
import { provideServerRendering } from '@angular/platform-server';
import { provideServerRoutesConfig } from '@angular/ssr';
//import { SERVER_RESPONSE } from '@frontends/domain';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

export const SERVER_RESPONSE = new InjectionToken<ResponseInit>('SERVER_RESPONSE');

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(),
    provideServerRoutesConfig(serverRoutes),
    {
      provide: SERVER_RESPONSE,
      useFactory: () => {
        return inject(RESPONSE_INIT, { optional: true });
      },
    },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);

 */
