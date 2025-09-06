// backend/src/patients/dto/create-patient.dto.ts
import { IsObject, IsOptional } from 'class-validator';

export class CreatePatientDto {
  @IsObject()
  patient_info: object;

  @IsObject()
  @IsOptional()
  guardian_info?: object;

  @IsObject()
  @IsOptional()
  medical_encounters?: object;

  @IsObject()
  @IsOptional()
  summary?: object;
}