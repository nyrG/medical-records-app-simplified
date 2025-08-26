// backend/src/patients/entities/patient.entity.ts

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity()
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; 

  @Column('jsonb')
  patient_info: object;

  // Change the type to allow null
  @Column('jsonb', { nullable: true })
  guardian_info: object | null;

  // Change the type to allow null
  @Column('jsonb', { nullable: true })
  medical_encounters: object | null;
}