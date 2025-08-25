// backend/public/script.js

document.addEventListener('DOMContentLoaded', () => {
  fetchPatientRecords();
});

async function fetchPatientRecords() {
  try {
    const response = await fetch('/api/patients'); // Fetch data from the API
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const patients = await response.json();
    console.log('Successfully fetched patients:', patients); // Check your browser's console
    displayRecords(patients); // We will create this function next
  } catch (error) {
    console.error('Could not fetch patient records:', error);
    const container = document.getElementById('records-container');
    container.innerHTML = '<p>Error loading records. Please try again later.</p>';
  }
}

// Add this function to backend/public/script.js

function displayRecords(patients) {
  const container = document.getElementById('records-container');
  container.innerHTML = ''; // Clear the "Loading..." message

  if (patients.length === 0) {
    container.innerHTML = '<p>No patient records found.</p>';
    return;
  }

  patients.forEach(patient => {
    const recordDiv = document.createElement('div');
    recordDiv.className = 'patient-record'; // For styling

    const nameHeader = document.createElement('h2');
    nameHeader.textContent = patient.name;

    const dobPara = document.createElement('p');
    const dob = new Date(patient.dateOfBirth).toLocaleDateString();
    dobPara.textContent = `Date of Birth: ${dob}`;

    // Display medical data as a formatted string
    const medicalDataPara = document.createElement('pre'); // <pre> preserves formatting
    medicalDataPara.textContent = JSON.stringify(patient.medicalData, null, 2);

    recordDiv.appendChild(nameHeader);
    recordDiv.appendChild(dobPara);
    recordDiv.appendChild(medicalDataPara);

    container.appendChild(recordDiv);
  });
}