// backend/src/extraction/extraction.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, FileDataPart } from '@google/generative-ai';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

@Injectable()
export class ExtractionService {
  private genAI: GoogleGenerativeAI;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new InternalServerErrorException('GEMINI_API_KEY is not configured in the .env file.');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  // --- Date Formatting and Cleaning (No changes needed) ---
  private formatDate(dateString: string | null): string | null {
    if (!dateString || typeof dateString !== 'string') return null;
    const formatsToTry = ['DD MMM YYYY', 'MMMM DD, YYYY', 'YYYY-MM-DD', 'M/D/YYYY', 'MM/DD/YYYY', 'MM/DD/YY', 'D-MMM-YY', 'DD-MMM-YY'];
    for (const fmt of formatsToTry) {
      const d = dayjs(dateString.trim(), fmt, 'en', true);
      if (d.isValid()) {
        let year = d.year();
        if (fmt.toLowerCase().includes('yy') && !fmt.toLowerCase().includes('yyyy')) {
          year = year > dayjs().year() % 100 ? 1900 + year : 2000 + year;
        }
        return d.year(year).format('YYYY-MM-DD');
      }
    }
    console.warn(`Warning: Could not parse date '${dateString}'. Returning null.`);
    return null;
  }

  private cleanData(data: any): any {
    if (typeof data === 'string') return data.trim();
    if (Array.isArray(data)) return data.map(item => this.cleanData(item));
    if (typeof data === 'object' && data !== null) {
      for (const key in data) {
        if (key.toLowerCase().includes('date')) {
          data[key] = this.formatDate(data[key]);
        } else {
          data[key] = this.cleanData(data[key]);
        }
      }

      if (data.full_name && data.full_name.middle_initial) {
        let mi = data.full_name.middle_initial.trim().charAt(0).toUpperCase();
        if (mi) {
          mi += '.';
        }
        data.full_name.middle_initial = mi;
      }
    }
    return data;
  }

  private sanitizeJsonString(str: string): string {
    return str.replace(/\\n/g, "\\n").replace(/\\'/g, "\\'").replace(/\\"/g, '\\"').replace(/\\&/g, "\\&").replace(/\\r/g, "\\r").replace(/\\t/g, "\\t").replace(/\\b/g, "\\b").replace(/\\f/g, "\\f").replace(/[\u0000-\u001F]+/g, "");
  }

  async extractDataFromPdf(file: Express.Multer.File): Promise<any> {
    const schema = {
      "patient_info": { "patient_record_number": null, "full_name": { "first_name": null, "middle_initial": null, "last_name": null }, "date_of_birth": null, "age": null, "sex": null, "address": null, "category": null },
      "guardian_info": { "guardian_name": { "rank": null, "first_name": null, "last_name": null }, "afpsn": null, "branch_of_service": null, "unit_assignment": null },
      "medical_encounters": { "consultations": [{ "consultation_date": null, "age_at_visit": null, "vitals": { "weight_kg": null, "temperature_c": null }, "chief_complaint": null, "diagnosis": null, "notes": null, "treatment_plan": null, "attending_physician": null }], "lab_results": [{ "test_type": null, "date_performed": null, "results": [{ "test_name": null, "value": null, "reference_range": null, "unit": null }], "medical_technologist": null, "pathologist": null }], "radiology_reports": [{ "examination": null, "date_performed": null, "findings": null, "impression": null, "radiologist": null }] },
      "summary": {
        "final_diagnosis": [],
        "primary_complaint": null,
        "key_findings": null,
        "medications_taken": [],
        "allergies": []
      }
    };

    const diagnosisList = [
      // Cardiovascular
      "Hypertension", "Coronary Artery Disease", "Atrial Fibrillation", "Heart Failure", "Hyperlipidemia",
      // Endocrine
      "Type 2 Diabetes", "Type 1 Diabetes", "Hypothyroidism", "Hyperthyroidism", "Polycystic Ovary Syndrome (PCOS)",
      // Respiratory
      "Asthma", "COPD (Chronic Obstructive Pulmonary Disease)", "Pneumonia", "Acute Bronchitis", "Allergic Rhinitis", "Sleep Apnea",
      // Gastrointestinal
      "Gastroesophageal Reflux Disease (GERD)", "Gastroenteritis", "Irritable Bowel Syndrome (IBS)", "Peptic Ulcer Disease",
      // Neurological
      "Migraine", "Tension Headache", "Epilepsy", "Cerebrovascular Accident (Stroke)", "Dementia",
      // Musculoskeletal
      "Osteoarthritis", "Rheumatoid Arthritis", "Low Back Pain", "Fibromyalgia", "Gout",
      // Genitourinary / Women's Health
      "Urinary Tract Infection (UTI)", "Benign Prostatic Hyperplasia (BPH)", "Abnormal Uterine Bleeding (AUB-O)", "Endometriosis",
      // Mental Health
      "Depression", "Anxiety Disorder", "Bipolar Disorder", "ADHD (Attention-Deficit/Hyperactivity Disorder)",
      // Other Common Conditions
      "Anemia", "Obesity", "Osteoporosis", "Chronic Kidney Disease", "Dermatitis"
    ];

    const categoryList = [
      "EDM", "EDS", "EDD", "EDF", "EDW", "ODW", "ODM", "ODF", "ODS", "ODD",
      "ACTIVE MILITARY", "RMP", "CAA", "CHR", "CIVILIAN", "CDT", "CS", "P2LT",
      "OCS", "RES", "ODH", "EDH"
    ];

    const prompt = `
      You are an expert AI medical data processor. Analyze the provided PDF, including all handwritten text, and convert it into a single, comprehensive JSON object.

      **PRIMARY RULES:**
      1.  **Strict Schema Adherence**: Your output MUST be ONLY the raw JSON object, strictly following the provided schema. If a value is not found or is illegible, it must be null.
      2.  **Data Quality and Coherence**: All extracted text must be proofread to correct OCR errors, ensure it is coherent, and written in English.
      3.  **Handle Document Layout**: Pay close attention to the document's layout. Often, the value for a field is written on the line ABOVE its corresponding label (e.g., the name "MEDINA" appears above the label "LAST NAME").
      4.  **No Extra Text**: Your final output must only be the raw JSON object.
      
      **FIELD-SPECIFIC INSTRUCTIONS:**
      - **summary.final_diagnosis**: First, try to match the condition to one or more items from the provided Diagnosis List. If no match is found, formulate a concise diagnosis based on the document's findings as a last resort. Return as a JSON array.
      - **summary.medications_taken**: Extract a list of medications from the most recent 'Treatment Plan'. Each item must be a string including the name, dosage, and frequency.
      - **patient_info.category**: You MUST select the most fitting category from the provided Category List.
      - **patient_info.full_name.first_name**: This field can contain multiple words (e.g., "AMGGYMEL VHANESA"). You must extract all parts of the first name into the single "first_name" property.
      - **dates**: All dates must be in "YYYY-MM-DD" format (e.g., "13-Oct-91" becomes "1991-10-13").
      - **Laboratory Results**: Extract each individual test from a lab report table. For each test, you must separate the numerical result from its unit. For example, for "75.20 µmol/L", the "value" should be "75.20" and the "unit" should be "µmol/L".
      
      **CONSULTATION FIELD DEFINITIONS:**
      - **chief_complaint**: The patient's primary reason for the visit, in their own words or as recorded by the physician.
      - **diagnosis**: The physician's assessment or diagnosis for that specific encounter.
      - **notes**: The detailed narrative of the patient's history for the current illness (History of Present Illness or HPI), physical exam findings, and other relevant details from the consultation.
      - **treatment_plan**: The specific actions, prescriptions, or advice given to the patient during that consultation.

      **REFERENCE LISTS:**
      - **Diagnosis List**: ${diagnosisList.join(', ')}
      - **Category List**: ${categoryList.join(', ')}

      **DATA QUALITY INSTRUCTIONS:**
      - **Decipher Handwriting**: Make your best effort to accurately interpret handwritten notes.
      - **Proofread All Consultation Fields**: For all free-text fields within the "consultations" object (like 'chief_complaint', 'diagnosis', 'notes', and 'treatment_plan'), you must first extract the raw text, then proofread and rewrite it into a coherent, clinical narrative. Correct all spelling and grammar mistakes from the OCR process.
      - **Ensure Coherence**: Proofread the extracted data to be legible and coherent. All output must be in English. If a value is illegible, set it to null.
      
      **JSON SCHEMA TO FOLLOW:**
      ${JSON.stringify(schema, null, 2)}
    `;

    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      safetySettings: [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }]
    });

    const fileDataPart = {
      inlineData: {
        data: file.buffer.toString("base64"),
        mimeType: file.mimetype,
      },
    };

    const result = await model.generateContent([prompt, fileDataPart]);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('No valid JSON object found in Gemini response:', responseText);
      throw new Error('Could not find a valid JSON object in the extracted data.');
    }

    const sanitizedJson = this.sanitizeJsonString(jsonMatch[0]);

    try {
      const parsedData = JSON.parse(sanitizedJson);
      return this.cleanData(parsedData);
    } catch (error) {
      console.error('Failed to parse JSON from Gemini:', error, 'Raw Text:', sanitizedJson);
      throw new Error('Could not parse the extracted data.');
    }
  }
}