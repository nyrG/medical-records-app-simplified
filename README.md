# Boveda: AI-Powered Patient Record Digitization Module

<p align="center">
<img src="./backend/public/logo.png" alt="Boveda Logo" width="120">
</p>

This Boveda module is a full-stack web application designed to streamline the digitization of patient medical records. It leverages the Google Gemini API to perform multimodal data extraction from PDF documents, including OCR for handwritten text. The extracted information is then populated into a user-friendly interface where it can be reviewed, edited, and saved to a PostgreSQL database.

 ## Key Features

  * **AI-Powered Data Extraction**: Upload a patient's medical PDF, and the application's backend uses the Google Gemini 1.5 Flash model to intelligently parse and structure the data into a JSON format.
  * **Comprehensive CRUD Functionality**: A robust and intuitive interface for Creating, Reading, Updating, and Deleting patient records.
  * **Interactive Patient List**: View all patients in a clean, paginated table with controls for adjusting rows per page.
  * **Detailed Patient View**: Click on any patient to see a detailed, card-based layout of their demographic, guardian, and medical encounter information.
  * **Full Edit Capability**: An "edit mode" allows for the correction and amendment of any data extracted by the AI before it's saved.
  * **Bulk Actions**: Select multiple patients from the list to perform bulk operations, such as deleting records.

## Technology Stack

  * **Frontend**:
      * HTML5 & CSS3
      * [Tailwind CSS](https://tailwindcss.com/) & [Font Awesome](https://fontawesome.com/) for modern styling.
      * Vanilla JavaScript for all client-side logic.
  * **Backend**:
      * [NestJS](https://nestjs.com/) (TypeScript) for a scalable and maintainable server-side architecture.
      * [TypeORM](https://typeorm.io/) for object-relational mapping with the database.
      * **AI**: Google Gemini API (`gemini-1.5-flash`) for data extraction.
  * **Database**:
      * PostgreSQL, running in a Docker container for consistency across environments.
  * **Development Environment**:
      * [Docker](https://www.docker.com/) & Docker Compose
      * Node.js & npm

## Getting Started

Follow these instructions to get the project running on your local machine for development and testing.

### Prerequisites

  * [Node.js](https://nodejs.org/) (v18 or higher)
  * [Docker Desktop](https://www.docker.com/products/docker-desktop/)
  * A Google Gemini API Key.

### 1\. Clone the Repository

```bash
git clone https://github.com/your-username/medical-records-app-simplified.git
cd medical-records-app-simplified
```

### 2\. Configure Environment Variables

1.  Create a new file named `.env` in the root directory of the project.

2.  Add the following configuration. Be sure to replace the placeholders with your actual credentials.

    ```env
    # PostgreSQL Database Credentials
    POSTGRES_USER=myuser
    POSTGRES_PASSWORD=mypassword
    POSTGRES_DB=medical_records

    # Google Gemini API Key
    GEMINI_API_KEY=your_google_gemini_api_key
    ```

### 3\. Install Dependencies

Navigate to the backend directory and install the necessary npm packages.

```bash
cd backend
npm install
```

### 4\. Start the Database

From the **root** directory of the project, start the PostgreSQL database container using Docker Compose. The `-d` flag will run it in the background.

```bash
docker-compose up -d
```

### 5\. Run the Application

Finally, start the NestJS backend server. Make sure you are still in the `backend` directory.

```bash
# Run in development mode with live reloading
npm run start:dev
```

The application will now be running and accessible at [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000).

## API Endpoints

The backend exposes the following RESTful API endpoints for managing patient records:

  * **`POST /api/extraction/upload`**: Uploads a PDF file for AI data extraction.
  * **`GET /api/patients`**: Retrieves a paginated list of all patients.
  * **`GET /api/patients/:id`**: Retrieves a single patient by their unique ID.
  * **`POST /api/patients`**: Creates a new patient record in the database.
  * **`PATCH /api/patients/:id`**: Updates an existing patient record.
  * **`DELETE /api/patients/:id`**: Deletes a patient record.
