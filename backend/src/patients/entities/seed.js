'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const faker_1 = require('@faker-js/faker');
const patient_entity_1 = require('../../patients/entities/patient.entity');
const data_source_1 = require('../data-source');
const seedPatients = async (dataSource) => {
  const patientRepository = dataSource.getRepository(patient_entity_1.Patient);
  console.log('🗑️  Deleting all existing patient records...');
  await patientRepository.clear();
  console.log('✅  All records deleted.');
  const diagnoses = [
    'Acute Bronchitis',
    'Type 2 Diabetes',
    'Hypertension',
    'Gastroenteritis',
    'Migraine',
    'Allergic Rhinitis',
  ];
  const complaints = [
    'Persistent cough and chest congestion.',
    'Increased thirst and frequent urination.',
    'High blood pressure readings at home.',
    'Nausea, vomiting, and diarrhea.',
    'Severe recurring headaches.',
    'Nasal congestion and sneezing.',
  ];
  const findings = [
    'Lungs clear, no signs of pneumonia.',
    'Elevated HbA1c levels.',
    'BP consistently above 140/90 mmHg.',
    'Dehydration and abdominal tenderness.',
    'Normal neurological exam.',
    'Inflamed nasal passages.',
  ];
  const medications = [
    ['Albuterol Inhaler', 'Guaifenesin'],
    ['Metformin', 'Glipizide'],
    ['Lisinopril', 'Amlodipine'],
    ['Ondansetron'],
    ['Sumatriptan'],
    ['Loratadine', 'Fluticasone Spray'],
  ];
  const allergies = [
    ['None'],
    ['Penicillin'],
    ['Sulfa drugs'],
    ['None'],
    ['Aspirin'],
    ['Pollen', 'Dust Mites'],
  ];
  console.log('🌱 Seeding 20 dummy patient records...');
  for (let i = 0; i < 20; i++) {
    const firstName = faker_1.faker.person.firstName();
    const lastName = faker_1.faker.person.lastName();
    const patient = new patient_entity_1.Patient();
    patient.name = `${firstName} ${lastName}`;
    patient.patient_info = {
      full_name: {
        first_name: firstName,
        middle_initial: faker_1.faker.string.alpha(1).toUpperCase(),
        last_name: lastName,
      },
      date_of_birth: faker_1.faker.date
        .birthdate({ min: 18, max: 65, mode: 'age' })
        .toISOString()
        .split('T')[0],
      patient_record_number: faker_1.faker.string.numeric(6),
      category: 'ACTIVE MILITARY',
      address: {
        house_no_street: faker_1.faker.location.streetAddress(),
        barangay: 'Villamor Air Base',
        city_municipality: faker_1.faker.location.city(),
        province: faker_1.faker.location.state(),
        zip_code: faker_1.faker.location.zipCode(),
      },
      rank: faker_1.faker.helpers.arrayElement(['PVT', 'CPL', 'SGT', 'LTO']),
      afpsn: faker_1.faker.string.numeric(7),
      branch_of_service: faker_1.faker.helpers.arrayElement(['PA', 'PN', 'PAF']),
      unit_assignment: faker_1.faker.company.name(),
    };
    patient.sponsor_info = {
      sponsor_name: {
        first_name: faker_1.faker.person.firstName(),
        last_name: lastName,
      },
      afpsn: faker_1.faker.string.numeric(7),
      branch_of_service: 'N/A',
      unit_assignment: 'N/A',
    };
    patient.medical_encounters = {
      consultations: [
        {
          consultation_date: faker_1.faker.date.recent({ days: 365 }).toISOString().split('T')[0],
          chief_complaint: {
            value: faker_1.faker.lorem.sentence(),
            confidence_score: faker_1.faker.number.float({ min: 0.7, max: 1, precision: 0.01 }),
          },
          diagnosis: {
            value: faker_1.faker.lorem.words(3),
            confidence_score: faker_1.faker.number.float({ min: 0.7, max: 1, precision: 0.01 }),
          },
          notes: {
            value: faker_1.faker.lorem.paragraph(),
            confidence_score: faker_1.faker.number.float({ min: 0.7, max: 1, precision: 0.01 }),
          },
          attending_physician: `Dr. ${faker_1.faker.person.lastName()}`,
          treatment_plan: {
            value: `Prescribed ${faker_1.faker.commerce.productName()}`,
            confidence_score: faker_1.faker.number.float({ min: 0.7, max: 1, precision: 0.01 }),
          },
        },
      ],
    };
    const randomIndex = faker_1.faker.number.int({ min: 0, max: diagnoses.length - 1 });
    patient.summary = {
      final_diagnosis: [faker_1.faker.helpers.arrayElement(diagnoses)],
      primary_complaint: {
        value: faker_1.faker.helpers.arrayElement(complaints),
        confidence_score: faker_1.faker.number.float({ min: 0.7, max: 1, precision: 0.01 }),
      },
      key_findings: {
        value: faker_1.faker.helpers.arrayElement(findings),
        confidence_score: faker_1.faker.number.float({ min: 0.7, max: 1, precision: 0.01 }),
      },
      medications_taken: faker_1.faker.helpers.arrayElement(medications),
      allergies: faker_1.faker.helpers.arrayElement(allergies),
    };
    await patientRepository.save(patient);
  }
  console.log('✅ Seeding complete!');
};
data_source_1.AppDataSource.initialize()
  .then(async () => {
    await seedPatients(data_source_1.AppDataSource);
    await data_source_1.AppDataSource.destroy();
  })
  .catch((error) => console.error('Error seeding database:', error));
//# sourceMappingURL=seed.js.map
