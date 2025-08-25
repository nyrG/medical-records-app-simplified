// backend/src/patients/entities/patient.entity.ts

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  // We'll store the patient's name separately for easy searching/listing.
  @Column()
  name: string; 

  // The 'jsonb' type is perfect for storing complex, nested JSON data.
  // It allows us to store the entire record structure in a single column.
  @Column('jsonb')
  patient_info: object;

  @Column('jsonb', { nullable: true })
  guardian_info: object;

  @Column('jsonb', { nullable: true })
  medical_encounters: object;
}