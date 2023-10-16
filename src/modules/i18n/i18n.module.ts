import { Global } from '@nestjs/common';
import { Module } from '@nestjs/common';
import { i18nProvider } from './i18n.provider';

@Global()
@Module({
  providers: [i18nProvider],
  exports: [i18nProvider],
})
export class I18nModule {}
