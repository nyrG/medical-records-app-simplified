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
      // MODIFIED: Use the connection URL here as well
      url: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // Required for Neon
      },
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: true,

      // Local development configuration
      // type: 'postgres',
      // host: 'localhost',
      // port: 5432,
      // username: process.env.POSTGRES_USER,
      // password: process.env.POSTGRES_PASSWORD,
      // database: process.env.POSTGRES_DB,
      // entities: [__dirname + '/**/*.entity{.ts,.js}'],
      // synchronize: true,
    }),
    PatientsModule,
    ExtractionModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
