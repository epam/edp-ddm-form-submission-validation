import { EnvConfig } from '#app/types/env';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import i18next, { type i18n as I18n } from 'i18next';
import * as en from '#app/i18n/en.json';
import * as uk from '#app/i18n/uk.json';

@Injectable()
export class I18nService {
  public i18n: I18n;
  constructor(private readonly config: ConfigService<EnvConfig>) {}
  public async init() {
    const resources = {
      uk,
      en,
    };
    return i18next.use({ type: '3rdParty', init: this.setInstance }).init({
      resources,
      lng: this.config.get('LANGUAGE') || 'en',
      defaultNS: 'validations',
      keySeparator: '.',
      interpolation: {
        escapeValue: false,
      },
    });
  }
  private setInstance = (instance: I18n) => {
    this.i18n = instance;
  };
}
