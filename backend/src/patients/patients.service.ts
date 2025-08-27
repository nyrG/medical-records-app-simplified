// backend/src/patients/patients.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm'; 
import { Patient } from './entities/patient.entity';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(Patient)
    private patientsRepository: Repository<Patient>,
  ) { }

  create(createPatientDto: CreatePatientDto): Promise<Patient> {
    const patient = this.patientsRepository.create(createPatientDto);

    // **NEW**: Safety check to ensure critical data exists before saving
    const info = createPatientDto.patient_info as any;
    if (!info || !info.full_name || !info.full_name.first_name || !info.full_name.last_name) {
      throw new BadRequestException('Patient data is incomplete. A first and last name are required to save a new record.');
    }

    // This part remains the same
    patient.name = [info.full_name.first_name, info.full_name.last_name]
      .filter(Boolean)
      .join(' ');

    // Explicitly set to null if undefined to match the entity and database
    patient.guardian_info = createPatientDto.guardian_info ?? null;
    patient.medical_encounters = createPatientDto.medical_encounters ?? null;

    return this.patientsRepository.save(patient);
  }

  async findAll(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit;
    
    const whereCondition = search
      ? { name: ILike(`%${search}%`) } 
      : {};

    const [data, total] = await this.patientsRepository.findAndCount({
      where: whereCondition,
      take: limit,
      skip: skip,
      order: { name: 'ASC' },
    });

    return { data, total };
  }

  async findOne(id: number): Promise<Patient> {
    const patient = await this.patientsRepository.findOneBy({ id });
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
    return patient;
  }

  async update(id: number, updatePatientDto: UpdatePatientDto): Promise<Patient> {
    const patient = await this.findOne(id);

    if (updatePatientDto.patient_info) {
      const info = updatePatientDto.patient_info as any;
      if (info.full_name) {
        patient.name = [info.full_name.first_name, info.full_name.last_name]
          .filter(Boolean)
          .join(' ');
      }
    }

    const updatedPatient = this.patientsRepository.merge(patient, updatePatientDto);

    return this.patientsRepository.save(updatedPatient);
  }

  async remove(id: number): Promise<void> {
    const result = await this.patientsRepository.softDelete(id); 
    if (result.affected === 0) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
  }
}