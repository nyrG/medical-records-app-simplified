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
    const formatsToTry = [ 'DD MMM YYYY', 'MMMM DD, YYYY', 'YYYY-MM-DD', 'M/D/YYYY', 'MM/DD/YYYY', 'MM/DD/YY', 'D-MMM-YY', 'DD-MMM-YY' ];
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
    }
    return data;
  }
  private sanitizeJsonString(str: string): string {
    return str.replace(/\\n/g, "\\n").replace(/\\'/g, "\\'").replace(/\\"/g, '\\"').replace(/\\&/g, "\\&").replace(/\\r/g, "\\r").replace(/\\t/g, "\\t").replace(/\\b/g, "\\b").replace(/\\f/g, "\\f").replace(/[\u0000-\u001F]+/g,"");
  }
  
  async extractDataFromPdf(file: Express.Multer.File): Promise<any> {
    const schema = { "patient_info": { "patient_record_number": null, "full_name": { "first_name": null, "middle_initial": null, "last_name": null }, "date_of_birth": null, "sex": null, "address": null, "category": null }, "guardian_info": { "guardian_name": { "rank": null, "first_name": null, "last_name": null }, "afpsn": null, "branch_of_service": null, "unit_assignment": null }, "medical_encounters": { "consultations": [{ "consultation_date": null, "age_at_visit": null, "vitals": { "weight_kg": null, "temperature_c": null }, "chief_complaint": null, "diagnosis": null, "notes": null, "treatment_plan": null, "attending_physician": null }], "lab_results": [{ "test_type": null, "date_performed": null, "results": [{ "test_name": null, "value": null, "reference_range": null, "unit": null }], "medical_technologist": null, "pathologist": null }], "radiology_reports": [{ "examination": null, "date_performed": null, "findings": null, "impression": null, "radiologist": null }] } };
    
    const prompt = `
      You are an expert AI medical data processor. Your task is to analyze the provided medical PDF document and convert its content into a single, comprehensive JSON object. The document contains both typed and handwritten text; you must interpret both.
      **CRITICAL INSTRUCTIONS:**
      1.  **Adhere to the Schema**: The output MUST strictly follow this JSON schema. If a field is not present, its value MUST be null.
      2.  **Format All Dates**: All dates in the final JSON MUST be in "YYYY-MM-DD" format.
      3.  **Handle Nested Arrays**: For lab results, you MUST parse the tables. Each row in a lab result table corresponds to one object inside the "results" array of that lab report.
      4.  **No Extra Text**: Your final output must only be the raw JSON object.

      **JSON SCHEMA TO FOLLOW:**
      ${JSON.stringify(schema, null, 2)}
    `;

    const model = this.genAI.getGenerativeModel({
        model: 'gemini-1.5-flash',
        safetySettings: [{ category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }]
    });

    // --- **CORRECTED** File Data Object ---
    // This creates the correct object structure for an "InlineDataPart"
    const fileDataPart = {
        inlineData: {
            data: file.buffer.toString("base64"),
            mimeType: file.mimetype,
        },
    };

    // The prompt and the file data part are sent as separate elements in the array
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