// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientsModule } from './patients/patients.module';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule
import { ExtractionModule } from './extraction/extraction.module';

@Module({
  imports: [
    // This will load the .env file from the root directory
    ConfigModule.forRoot({
      isGlobal: true, // Make the config service available globally
      envFilePath: join(__dirname, '..', '..', '.env'),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.NODE_ENV === 'production' ? 'postgres' : 'localhost',
      port: process.env.NODE_ENV === 'production' ? 5432 : 5312,
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,
    }),
    PatientsModule,
    ExtractionModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}