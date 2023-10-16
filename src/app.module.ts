import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FormSubmissionsModule } from '#app/modules/form-submissions/form-submissions.module';
import { I18nModule } from './modules/i18n/i18n.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    I18nModule,
    FormSubmissionsModule,
  ],
  providers: [],
  controllers: [],
})
export class AppModule {}
