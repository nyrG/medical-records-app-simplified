// backend/src/patients/dto/create-patient.dto.ts
export class CreatePatientDto {
  patient_info: object;
  guardian_info?: object; // The '?' makes this property optional
  medical_encounters?: object;
}