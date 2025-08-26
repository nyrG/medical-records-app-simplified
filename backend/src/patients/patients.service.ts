// backend/src/patients/patients.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
    
    // **Safety Check**: Ensure patient_info and full_name exist before creating the name
    const info = createPatientDto.patient_info as any;
    if (!info || !info.full_name) {
        throw new BadRequestException('Patient data is incomplete. Missing patient_info or full_name.');
    }

    patient.name = [info.full_name.first_name, info.full_name.last_name]
      .filter(Boolean)
      .join(' ');
      
    return this.patientsRepository.save(patient);
  }

  async findAll(page: number = 1, limit: number = 10): Promise<{ data: Patient[], total: number }> {
    const skip = (page - 1) * limit;

    const [data, total] = await this.patientsRepository.findAndCount({
      skip: skip,
      take: limit,
      order: {
        id: 'DESC' // Optional: order by newest first
      }
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
    
    // **Safety Check for Update**
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
    const result = await this.patientsRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
  }
}