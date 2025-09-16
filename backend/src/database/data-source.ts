import { DataSource } from 'typeorm';
import { Patient } from '../patients/entities/patient.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Configure dotenv to load the .env file from the project root
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

export const AppDataSource = new DataSource({
    type: 'postgres',
    // MODIFIED: Use the connection URL instead of separate fields
    url: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false, // Required for Neon's free tier
    },
    entities: [Patient],
    synchronize: true, // Keep this as true for now
    
    // Local development configuration
    /* type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    entities: [Patient],
    synchronize: true, */
});