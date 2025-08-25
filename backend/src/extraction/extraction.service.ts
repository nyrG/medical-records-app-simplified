// backend/src/extraction/extraction.service.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pdf from 'pdf-parse';
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

  // --- 1. Final, Most Robust Date Formatting ---
  private formatDate(dateString: string | null): string | null {
    if (!dateString || typeof dateString !== 'string') return null;

    // Expanded formats to handle all variations from the PDF and AI output
    const formatsToTry = [
      'DD MMM YYYY',   // 02 MAY 2022
      'DD-MMM-YYYY',   // 04-JUL-2024
      'D-MMM-YY',      // 22-May-72
      'MMMM DD, YYYY', // August 22, 2023
      'YYYY-MM-DD',
      'M/D/YYYY',      // 4/27/2022
      'MM/DD/YYYY',
      'MM/DD/YY',
    ];

    for (const fmt of formatsToTry) {
      // Use trim() and provide English locale for month names
      const d = dayjs(dateString.trim(), fmt, 'en', true);
      if (d.isValid()) {
        let year = d.year();
        // Correctly handle two-digit years, assuming they are in the past
        if (fmt.toLowerCase().includes('yy') && !fmt.toLowerCase().includes('yyyy')) {
            year = year > dayjs().year() % 100 ? 1900 + year : 2000 + year;
        }
        return d.year(year).format('YYYY-MM-DD');
      }
    }
    console.warn(`Warning: Could not parse date '${dateString}'. Returning null.`);
    return null; // Return null if format is unknown
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

  async extractDataFromPdf(fileBuffer: Buffer): Promise<any> {
    const pdfData = await pdf(fileBuffer);
    const textContent = pdfData.text;

    const schema = { "patient_info": { "patient_record_number": null, "full_name": { "first_name": null, "middle_initial": null, "last_name": null }, "date_of_birth": null, "sex": null, "address": null, "category": null }, "guardian_info": { "guardian_name": { "rank": null, "first_name": null, "last_name": null }, "afpsn": null, "branch_of_service": null, "unit_assignment": null }, "medical_encounters": { "consultations": [{ "consultation_date": null, "age_at_visit": null, "vitals": { "weight_kg": null, "temperature_c": null }, "chief_complaint": null, "diagnosis": null, "notes": null, "treatment_plan": null, "attending_physician": null }], "lab_results": [{ "test_type": null, "date_performed": null, "results": [{ "test_name": null, "value": null, "reference_range": null, "unit": null }], "medical_technologist": null, "pathologist": null }], "radiology_reports": [{ "examination": null, "date_performed": null, "findings": null, "impression": null, "radiologist": null }] } };

    // --- 2. Final, Highly-Detailed AI Prompt ---
    const prompt = `
      You are an expert AI medical data processor. Your task is to analyze the provided medical text from a PDF and convert it into a single, comprehensive JSON object.

      **CRITICAL INSTRUCTIONS:**
      1.  **Adhere to the Schema**: The output MUST strictly follow the JSON schema provided below. If a field is not present in the source text, its value MUST be null.
      2.  **Date Formatting**: All dates in the final JSON MUST be in "YYYY-MM-DD" format.
      3.  **Synthesize Information**: The document contains multiple pages. Combine all information for the one patient into a single JSON object.
      4.  **Handle Nested Arrays**: For array properties such as consultations, lab_results, and radiology_reports, create a new object in the array for each distinct record found in the document.
      5.  **No Extra Text**: Your final output must only be the raw JSON object. Do not include markdown, explanations, or any other text.

      **JSON SCHEMA TO FOLLOW:**
      ${JSON.stringify(schema, null, 2)}

      **DETAILED EXTRACTION GUIDE:**
      -   **patient_info**: Find the main patient demographics (name, DOB, etc.). The record number is often labeled 'CP#'.
      -   **consultations**: Each distinct doctor's visit, identified by a unique date (e.g., "DATE: 02 MAY 2022" or "Date: 05 Jan. 2024") and is often under the "Physicians Section" header, is a new object in the 'consultations' array. Consultations are often handwritten, so pay close attention and analyze the text. For each consultation, extract the surrounding text to find the 'chief_complaint', 'diagnosis' (sometimes labeled 'Assessment'), 'vitals' (Wt, Temp), 'notes' (often labeled 'HPI' or 'S'), 'treatment_plan' (often labeled 'Plan'), and the 'attending_physician'.
      -   **lab_results**: Each report (e.g., 'URINALYSIS', 'HEMATOLOGY') is a new object. Inside that object, you MUST populate the 'results' array. To do this, create a new object for EACH row in that report's table, extracting 'test_name', 'value', 'reference_range', and 'unit'.
      -   **radiology_reports**: Each 'ULTRASOUND REPORT' is a new object. Extract 'examination', 'findings', and 'impression'.

      **DOCUMENT TO PROCESS:**
      ---
      ${textContent}
    `;

    const model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.error('No valid JSON object found in Gemini response:', responseText);
      throw new Error('Could not find a valid JSON object in the extracted data.');
    }
    
    const jsonResponseText = jsonMatch[0];
    try {
      console.log("--- RAW AI JSON OUTPUT ---");
      console.log(jsonResponseText);

      const parsedData = JSON.parse(jsonResponseText);
      return this.cleanData(parsedData);
    } catch (error) {
      console.error('Failed to parse JSON from Gemini:', error, 'Raw Text:', jsonResponseText);
      throw new Error('Could not parse the extracted data.');
    }
  }
}