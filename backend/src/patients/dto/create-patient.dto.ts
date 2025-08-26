// backend/src/patients/dto/create-patient.dto.ts
import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// You might need to define the nested object structures for better validation,
// but for now, we'll keep them as generic objects.

export class CreatePatientDto {
  @IsObject()
  patient_info: object;

  @IsObject()
  @IsOptional()
  guardian_info?: object;

  @IsObject()
  @IsOptional()
  medical_encounters?: object;
}