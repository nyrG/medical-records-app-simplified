// backend/src/patients/entities/patient.entity.ts

import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity() // This marks the class as a database table
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ name: 'date_of_birth' })
  dateOfBirth: Date;

  @Column('jsonb', { nullable: true })
  medicalData: object;
}