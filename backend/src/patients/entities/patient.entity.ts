// backend/src/patients/entities/patient.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, AfterLoad } from 'typeorm';

type PatientInfo = {
  date_of_birth?: string;
  age?: number | null;
  documented_age?: number | null; 
  address?: {
    house_no_street?: string;
    barangay?: string;
    city_municipality?: string;
    province?: string;
    zip_code?: string;
  } | null;
  rank?: string | null;
  afpsn?: string | null;
  branch_of_service?: string | null;
  unit_assignment?: string | null;
  [key: string]: any;
};

// Define a type for a single consultation
type Consultation = {
  consultation_date?: string;
  age_at_visit?: number | null;
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
  sponsor_info: object | null;

  @Column('jsonb', { nullable: true })
  medical_encounters: {
    consultations?: Consultation[];
    [key: string]: any;
  } | null;

  @Column('jsonb', { nullable: true })
  summary: object | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn()
  deleted_at: Date;

  @AfterLoad()
  calculateAges() {
    if (this.patient_info && this.patient_info.date_of_birth) {
      const birthDate = new Date(this.patient_info.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      this.patient_info.age = age;

      // Now, calculate age_at_visit for each consultation
      if (this.medical_encounters?.consultations) {
        this.medical_encounters.consultations.forEach(consultation => {
          if (consultation.consultation_date) {
            const consultationDate = new Date(consultation.consultation_date);
            let visitAge = consultationDate.getFullYear() - birthDate.getFullYear();
            const monthDiff = consultationDate.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && consultationDate.getDate() < birthDate.getDate())) {
              visitAge--;
            }
            consultation.age_at_visit = visitAge;
          } else {
            consultation.age_at_visit = null;
          }
        });
      }

    } else {
      this.patient_info.age = null;
    }
  }
}