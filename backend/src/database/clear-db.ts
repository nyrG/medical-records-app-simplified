// backend/src/database/clear-db.ts

import { DataSource } from 'typeorm';
import { Patient } from '../patients/entities/patient.entity';
import { AppDataSource } from './data-source';

const clearDatabase = async (dataSource: DataSource) => {
    const patientRepository = dataSource.getRepository(Patient);

    console.log('🗑️  Deleting all existing patient records...');
    await patientRepository.clear();
    console.log('✅  All records have been successfully deleted.');
};

// Connect to the database, run the clearing function, and then disconnect
AppDataSource.initialize()
    .then(async () => {
        await clearDatabase(AppDataSource);
        await AppDataSource.destroy();
        console.log('👋  Disconnected from the database.');
    })
    .catch((error) => console.error('Error clearing the database:', error));