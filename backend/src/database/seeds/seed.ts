import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { Patient } from '../../patients/entities/patient.entity';
import { AppDataSource } from '../data-source';

const seedPatients = async (dataSource: DataSource) => {
    const patientRepository = dataSource.getRepository(Patient);

    console.log('🌱 Seeding 20 dummy patient records...');

    for (let i = 0; i < 20; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const patient = new Patient();

        patient.name = `${firstName} ${lastName}`;
        // REMOVED: patient.status = PatientStatus.ACTIVE;

        patient.patient_info = {
            full_name: {
                first_name: firstName,
                middle_initial: faker.string.alpha(1).toUpperCase(),
                last_name: lastName,
            },
            date_of_birth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }).toISOString().split('T')[0],
            patient_record_number: faker.string.numeric(6),
            category: 'Dummy Data', // As requested
            address: `${faker.location.streetAddress()}, ${faker.location.city()}`,
        };

        patient.guardian_info = {
            guardian_name: {
                first_name: faker.person.firstName(),
                last_name: lastName,
            },
            afpsn: faker.string.numeric(7),
            branch_of_service: 'N/A',
            unit_assignment: 'N/A',
        };

        patient.medical_encounters = {
            consultations: [{
                consultation_date: faker.date.recent({ days: 365 }).toISOString().split('T')[0],
                chief_complaint: faker.lorem.sentence(),
                diagnosis: faker.lorem.words(3),
                attending_physician: `Dr. ${faker.person.lastName()}`,
            }],
        };
        
        await patientRepository.save(patient);
    }

    console.log('✅ Seeding complete!');
};

// Connect to the database and run the seeder
AppDataSource.initialize()
    .then(async () => {
        await seedPatients(AppDataSource);
        await AppDataSource.destroy();
    })
    .catch((error) => console.error('Error seeding database:', error));