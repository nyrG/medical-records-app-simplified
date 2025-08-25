# Editable Medical Record Viewer

This project is a simple, full-stack web application for uploading, viewing, editing, and saving patient medical records. It features a plain HTML/CSS/JS frontend and a robust backend built with NestJS, connected to a PostgreSQL database running in Docker.

## Tech Stack

  * **Frontend**:
      * HTML
      * [Tailwind CSS](https://tailwindcss.com/) (for styling)
      * JavaScript (for client-side logic and API calls)
  * **Backend**:
      * [NestJS](https://nestjs.com/) (a progressive Node.js framework using TypeScript)
      * [TypeORM](https://typeorm.io/) (for interacting with the database)
      * PostgreSQL
  * **Development Environment**:
      * [Docker](https://www.docker.com/) & Docker Compose (for running the PostgreSQL database)
      * Node.js & npm

## Getting Started

Follow these steps to set up and run the project on your local machine.

### Prerequisites

  * [Node.js](https://nodejs.org/) (v18 or higher recommended)
  * [Docker](https://www.docker.com/products/docker-desktop/)

### 1\. Clone the Repository

First, clone this repository to your local machine.

### 2\. Create Environment File

The application requires a `.env` file in the root directory to configure the database connection.

1.  Create a new file named `.env` in the `medical-records-app-simplified/` folder.

2.  Add the following content to the file:

    ```env
    # PostgreSQL Database Credentials
    POSTGRES_USER=myuser
    POSTGRES_PASSWORD=mypassword
    POSTGRES_DB=medical_records
    ```

### 3\. Install Dependencies

Navigate into the backend directory and install the required npm packages.

```bash
cd medical-records-app-simplified/backend
npm install
```

### 4\. Start the Database

From the **root** directory (`medical-records-app-simplified/`), start the PostgreSQL database using Docker Compose.

```bash
docker-compose up -d
```

This will start a PostgreSQL container in the background.

### 5\. Run the Application

Now, you can start the NestJS backend server. Make sure you are still in the `backend` directory.

```bash
# To run in development mode with auto-reloading
npm run start:dev
```

The application will be available at [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000).

## API Endpoints

The backend provides the following RESTful API endpoints for managing patient data:

  * **`GET /api/patients`**: Retrieve a list of all patients.
  * **`GET /api/patients/:id`**: Retrieve a single patient by their ID.
  * **`POST /api/patients`**: Create a new patient record.
  * **`PATCH /api/patients/:id`**: Update an existing patient record.
  * **`DELETE /api/patients/:id`**: Delete a patient record.
