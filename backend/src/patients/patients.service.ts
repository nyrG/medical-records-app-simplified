// backend/src/patients/patients.service.ts

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, MoreThan } from 'typeorm';
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
    patient.sponsor_info = createPatientDto.sponsor_info ?? null;
    patient.medical_encounters = createPatientDto.medical_encounters ?? null;
    patient.summary = createPatientDto.summary ?? null;

    return this.patientsRepository.save(patient);
  }

  async findAll(page: number, limit: number, search?: string, sortBy: string = 'updated_at', sortOrder: 'ASC' | 'DESC' = 'DESC', category?: string) {
    const skip = (page - 1) * limit;

    const queryBuilder = this.patientsRepository.createQueryBuilder('patient');

    if (search) {
      queryBuilder.where('patient.name ILIKE :search', { search: `%${search}%` });
    }

    if (category) {
      // This query specifically targets the 'category' key within the 'patient_info' JSONB column
      queryBuilder.andWhere("patient.patient_info ->> 'category' = :category", { category });
    }
    // --- START: NEW SORTING LOGIC ---
    // Whitelist of allowed columns to sort by to prevent SQL injection
    const allowedSortBy = [
      'name',
      'patient_info.patient_record_number',
      'summary.final_diagnosis',
      'patient_info.category',
      'created_at',
      'updated_at'
    ];

    if (allowedSortBy.includes(sortBy)) {
      if (sortBy.includes('.')) {
        // Handle sorting for nested JSONB properties
        const [relation, property] = sortBy.split('.');
        // Note: This syntax is specific to PostgreSQL's JSONB querying
        // It extracts the property as text ('->>') for sorting
        queryBuilder.orderBy(`patient.${relation} ->> '${property}'`, sortOrder);
      } else {
        // Handle sorting for top-level properties
        queryBuilder.orderBy(`patient.${sortBy}`, sortOrder);
      }
    } else {
      // Default sort if an invalid column is provided
      queryBuilder.orderBy('patient.name', 'ASC');
    }
    // --- END: NEW SORTING LOGIC ---

    const [data, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { data, total };
  }

  async findOne(id: number): Promise<Patient> {
    const patient = await this.patientsRepository.findOneBy({ id });
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
    return patient;
  }

  async getStats() {
    const totalPatients = await this.patientsRepository.count();

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentlyUpdated = await this.patientsRepository.count({
      where: { updated_at: MoreThan(oneDayAgo) },
    });

    const categories = await this.patientsRepository
      .createQueryBuilder('patient')
      .select("patient.patient_info ->> 'category'", 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy("patient.patient_info ->> 'category'")
      .orderBy('count', 'DESC')
      .getRawMany();

    const topDiagnoses = await this.patientsRepository.query(`
        SELECT diagnosis, COUNT(diagnosis) as count
        FROM patient, jsonb_array_elements_text(summary->'final_diagnosis') AS diagnosis
        WHERE jsonb_typeof(summary->'final_diagnosis') = 'array' AND deleted_at IS NULL
        GROUP BY diagnosis
        ORDER BY count DESC
        LIMIT 5;
    `);

    // MODIFIED: Added "WHERE deleted_at IS NULL" to the query
    const avgAgeResult = await this.patientsRepository.query(
      `SELECT AVG(EXTRACT(YEAR FROM AGE(NOW(), (patient_info->>'date_of_birth')::date))) as "avgAge" FROM patient WHERE deleted_at IS NULL`
    );
    const averageAge = avgAgeResult[0]?.avgAge ? parseFloat(avgAgeResult[0].avgAge).toFixed(1) : 'N/A';

    return { totalPatients, recentlyUpdated, categories, topDiagnoses, averageAge };
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