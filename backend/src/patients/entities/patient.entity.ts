// backend/src/patients/entities/patient.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn,  AfterLoad } from 'typeorm';

type PatientInfo = {
  date_of_birth?: string;
  age?: number | null; // Allow age to be number or null
  [key: string]: any; 
};

@Entity()
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string; 

  @Column('jsonb')
  patient_info: PatientInfo;

  @Column('jsonb', { nullable: true })
  guardian_info: object | null;

  @Column('jsonb', { nullable: true })
  medical_encounters: object | null;

  @Column('jsonb', { nullable: true })
  summary: object | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @AfterLoad()
  calculateAge() {
    if (this.patient_info && this.patient_info.date_of_birth) {
        const birthDate = new Date(this.patient_info.date_of_birth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        // Assign the calculated age to a property within patient_info
        this.patient_info.age = age;
    } else {
        this.patient_info.age = null;
    }
  }
}