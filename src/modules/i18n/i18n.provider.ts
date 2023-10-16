import { ConfigService } from '@nestjs/config';
import { I18nService } from './I18n.service';
import { I18N_PROVIDER_KEY } from './keys';

export const i18nProvider = {
  provide: I18N_PROVIDER_KEY,
  useFactory: async (config: ConfigService) => {
    const localizationService = new I18nService(config);
    await localizationService.init();
    return localizationService.i18n;
  },
  inject: [ConfigService],
};
