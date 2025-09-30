# Boveda Patient Records Module: User Guide

Welcome to the Boveda Patient Records Module! This guide will walk you through the features of the application, from logging in and creating new patient records to managing and editing data.

---

## 1. Getting Started: Logging In

To begin, you must log in to the application using the provided credentials.

1.  Navigate to the application's web address.
2.  Enter your **Username** (`afp_boveda`) and **Password** (`afp_demo`) into the respective fields.
3.  Click the **Sign In** button.

_[SCREENSHOT: A clear image of the login screen with the username and password fields highlighted.]_

---

## 2. The Dashboard: Your Home Base

After logging in, you will land on the main dashboard. This is your central hub for managing all patient records.

!Dashboard Overview
_[SCREENSHOT: An overview of the main dashboard, showing the stats panels, search/filter controls, and the patient list.]_

### Key Areas of the Dashboard:

- **Overview Stats**: At the top, you'll find quick statistics, including the total number of patients and how many records were recently updated. You can switch between tabs to see top diagnoses and records by category.
- **Patient List**: The main section of the dashboard displays a paginated list of all patient records.
- **List Controls**: Above the patient list, you have several tools to manage the view:
  - **Search**: Quickly find a patient by typing their name.
  - **Filter**: Narrow down the list by patient category.
  - **Sort**: Organize the list by different criteria, such as Patient Name, Record #, or Date Created.

---

## 3. Creating a New Patient from a PDF

The core feature of this module is its ability to extract patient data directly from a PDF file using AI.

1.  From the main dashboard, click the **Create from PDF** button in the top-right corner.
2.  This will open the **Create New Patient Record** modal, which will guide you through a 3-step process.

### Step 1: Upload Document

In this step, you will select the PDF file and configure the upload.

1.  **Select Document**: You can either drag and drop your PDF file into the designated area or click the **Browse File** button to select it from your computer.
2.  **Upload Settings**: Choose the document type that best describes the record. This helps the AI process the information more accurately.
    - **Military Personnel**: Select this if the patient is the service member.
    - **Sponsored Dependent**: Select this if the patient is a civilian or dependent of a service member.
3.  Click the **Upload & Process** button to proceed.

_[SCREENSHOT: The "Upload" step of the modal, with the file drop zone and document type options visible.]_

### Step 2: Process Document

The application will now securely upload the document to the server, where the AI will begin extracting the data. This may take a moment. A countdown timer is displayed to indicate when you can cancel the operation if needed.

_[SCREENSHOT: The "Process" step of the modal, showing the spinning icon and "Processing Document..." text.]_

### Step 3: Review

Once the AI has finished, you will see a confirmation message.

1.  Click the **Review & Create Patient** button.
2.  This will close the modal and take you to the Patient Detail View, where the newly extracted data is populated in an editable form, ready for your review.

---

## 4. Managing the Patient List

The patient list is designed for efficient navigation and management.

- **Searching**: Use the search bar to instantly filter the list by patient name.
- **Sorting**: Click the sort dropdown to organize the list by name, record number, date of birth, and more. Click the arrow button next to it to toggle between ascending and descending order.
- **Filtering**: Use the category filter to view only patients belonging to a specific category (e.g., "ACTIVE MILITARY").
- **Pagination**: Use the "Prev" and "Next" buttons or click a page number at the bottom to navigate through the records. You can also change the number of rows displayed per page.
- **Bulk Deleting**:
  1.  Click the checkbox next to one or more patient names.
  2.  A **Delete Selected** button will appear.
  3.  Click this button and confirm the action to delete multiple records at once.

_[SCREENSHOT: The patient list with several patients selected, highlighting the "Delete Selected" button.]_

---

## 5. Viewing and Editing Patient Details

Clicking on any patient in the list will take you to their detailed record view. This view is organized into a sidebar with key demographic information and a main content area with tabbed medical encounter details.

_[SCREENSHOT: The patient detail view, showing the sidebar on the left and the tabbed content area on the right.]_

### Editing Data

1.  Click the **Edit Data** button in the top-right corner to enter edit mode.
2.  All fields will become editable inputs and text areas.
3.  Make any necessary corrections or additions to the data.

### Using the Grammar & Spelling Review

For long-text fields like "Notes" or "Findings," you can use the built-in review tool.

1.  In edit mode, a small **Check** button appears inside the text area.
2.  Click this button to open the **Grammar & Spelling Review** modal.
3.  Inside the modal:
    - The left side contains the editable text. Any detected errors will be highlighted.
    - The right side lists suggestions for each error.
    - Clicking a suggestion will highlight the corresponding text on the left.
4.  Make your edits directly in the text area.
5.  Click **Apply & Close** to save the changes back to the main form.

_[SCREENSHOT: The Grammar & Spelling Review modal, showing highlighted text on the left and a list of suggestions on the right.]_

### Saving Your Work

- **For a new record**: After reviewing the extracted data, click the **Create Patient** button. The record will be saved to the database, and you will be viewing the permanent record.
- **For an existing record**: After making edits, click the **Save Changes** button.

---

## 6. Deleting a Patient

To delete a single patient record:

1.  Navigate to the patient's detail view.
2.  Ensure you are not in edit mode.
3.  Click the **Delete** button in the top-right corner.
4.  A confirmation prompt will appear. Confirm the action to permanently delete the record.

---

## 7. Logging Out

When you are finished with your session, click the **Logout** button in the header to securely sign out of the application.

---
