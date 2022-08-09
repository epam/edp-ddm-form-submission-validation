import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FormSubmissionsModule } from '#app/modules/form-submissions/form-submissions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    FormSubmissionsModule,
  ],
  providers: [],
  controllers: [],
})
export class AppModule {}
