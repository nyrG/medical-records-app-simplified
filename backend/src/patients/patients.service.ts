// backend/src/patients/patients.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private patientsRepository: Repository<Patient>,
  ) {}

  create(createPatientDto: CreatePatientDto): Promise<Patient> {
    const patient = this.patientsRepository.create(createPatientDto);
    // Extract the full name for the top-level 'name' column for easier querying
    const info = createPatientDto.patient_info as any;
    patient.name = [info.full_name.first_name, info.full_name.last_name]
      .filter(Boolean)
      .join(' ');
    return this.patientsRepository.save(patient);
  }

  findAll(): Promise<Patient[]> {
    return this.patientsRepository.find();
  }

  async findOne(id: number): Promise<Patient> {
    const patient = await this.patientsRepository.findOneBy({ id });
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
    return patient;
  }

  async update(id: number, updatePatientDto: UpdatePatientDto): Promise<Patient> {
    const patient = await this.findOne(id); // Use findOne to ensure it exists
    
    // Update the name field if it has changed in the patient_info
    if (updatePatientDto.patient_info) {
      const info = updatePatientDto.patient_info as any;
      if (info.full_name) {
        patient.name = [info.full_name.first_name, info.full_name.last_name]
          .filter(Boolean)
          .join(' ');
      }
    }

    // Merge the new data into the existing patient object
    const updatedPatient = this.patientsRepository.merge(patient, updatePatientDto);
    
    return this.patientsRepository.save(updatedPatient);
  }

  async remove(id: number): Promise<void> {
    const result = await this.patientsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
  }
}