import { DataSource } from 'typeorm';
import { Patient } from '../patients/entities/patient.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Configure dotenv to load the .env file from the project root
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

export const AppDataSource = new DataSource({
    type: 'postgres',
    host: 'localhost',
    port: 5312,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    entities: [Patient],
    synchronize: true,
});