// backend/src/app.module.ts

import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsModule } from './patients/patients.module';

@Module({
  imports: [
    // Serves the frontend files (HTML, CSS, JS)
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),

    // Configures the database connection
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost', // Or 'postgres' if running inside a Docker network
      port: 5432,
      username: 'myuser',
      password: 'mypassword',
      database: 'medical_records',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true, // DEV only: automatically creates DB schema. Don't use in prod.
    }),

    PatientsModule,
  ],
  // Controllers and providers will be empty for now
  controllers: [],
  providers: [],
})
export class AppModule {}