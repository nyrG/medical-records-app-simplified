// backend/src/database/seeds/seed.ts

import { DataSource } from 'typeorm';
import { faker } from '@faker-js/faker';
import { Patient } from '../../patients/entities/patient.entity';
import { AppDataSource } from '../data-source';

const seedPatients = async (dataSource: DataSource) => {
    const patientRepository = dataSource.getRepository(Patient);

    // --- START: CORRECTED DATA CLEARING ---
    console.log('🗑️  Deleting all existing patient records...');
    await patientRepository.clear(); // Use .clear() instead of .delete({})
    console.log('✅  All records deleted.');
    // --- END: CORRECTED DATA CLEARING ---

    const diagnoses = ["Acute Bronchitis", "Type 2 Diabetes", "Hypertension", "Gastroenteritis", "Migraine", "Allergic Rhinitis"];
    const complaints = ["Persistent cough and chest congestion.", "Increased thirst and frequent urination.", "High blood pressure readings at home.", "Nausea, vomiting, and diarrhea.", "Severe recurring headaches.", "Nasal congestion and sneezing."];
    const findings = ["Lungs clear, no signs of pneumonia.", "Elevated HbA1c levels.", "BP consistently above 140/90 mmHg.", "Dehydration and abdominal tenderness.", "Normal neurological exam.", "Inflamed nasal passages."];
    const medications = [["Albuterol Inhaler", "Guaifenesin"], ["Metformin", "Glipizide"], ["Lisinopril", "Amlodipine"], ["Ondansetron"], ["Sumatriptan"], ["Loratadine", "Fluticasone Spray"]];
    const allergies = [["None"], ["Penicillin"], ["Sulfa drugs"], ["None"], ["Aspirin"], ["Pollen", "Dust Mites"]];

    console.log('🌱 Seeding 20 dummy patient records...');

    for (let i = 0; i < 20; i++) {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const patient = new Patient();

        patient.name = `${firstName} ${lastName}`;

        patient.patient_info = {
            full_name: {
                first_name: firstName,
                middle_initial: faker.string.alpha(1).toUpperCase(),
                last_name: lastName,
            },
            date_of_birth: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }).toISOString().split('T')[0],
            patient_record_number: faker.string.numeric(6),
            category: 'ACTIVE MILITARY', // Set a relevant category for seeded data
            address: {
                house_no_street: faker.location.streetAddress(),
                barangay: 'Villamor Air Base',
                city_municipality: faker.location.city(),
                province: faker.location.state(),
                zip_code: faker.location.zipCode(),
            },
            // START: Added military fields to patient_info
            rank: faker.helpers.arrayElement(['PVT', 'CPL', 'SGT', 'LTO']),
            afpsn: faker.string.numeric(7),
            branch_of_service: faker.helpers.arrayElement(['PA', 'PN', 'PAF']),
            unit_assignment: faker.company.name(),
            // END: Added military fields
        };

        patient.sponsor_info = {
            sponsor_name: {
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
                treatment_plan: `Prescribed ${faker.commerce.productName()}`
            }],
        };

        const randomIndex = faker.number.int({ min: 0, max: diagnoses.length - 1 });
        patient.summary = {
            // Wrap the selected diagnosis in an array
            final_diagnosis: [faker.helpers.arrayElement(diagnoses)],
            primary_complaint: faker.helpers.arrayElement(complaints),
            key_findings: faker.helpers.arrayElement(findings),
            medications_taken: faker.helpers.arrayElement(medications),
            allergies: faker.helpers.arrayElement(allergies)
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