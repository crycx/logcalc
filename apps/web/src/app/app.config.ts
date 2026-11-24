import { registerLocaleData } from '@angular/common';
import localeEt from '@angular/common/locales/et';
import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';

registerLocaleData(localeEt);

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), { provide: LOCALE_ID, useValue: 'et' },
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline', subscriptSizing: 'dynamic' } },
  ],
};
