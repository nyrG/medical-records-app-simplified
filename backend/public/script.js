// backend/public/script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let allPatients = [];
    let selectedPatient = null;
    let isEditMode = false;

    // --- DOM Elements ---
    const patientListContainer = document.getElementById('patientListContainer');
    const recordContainer = document.getElementById('recordContainer');
    const placeholder = document.getElementById('placeholder');
    const controlsContainer = document.getElementById('controlsContainer');
    const currentPatientName = document.getElementById('currentPatientName');
    const newPatientBtn = document.getElementById('newPatientBtn');
    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const uploadModal = document.getElementById('uploadModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const processPdfBtn = document.getElementById('processPdfBtn');
    const pdfFileInput = document.getElementById('pdfFile');
    const fileError = document.getElementById('fileError');
    const loadingOverlay = document.getElementById('loadingOverlay');

    const dummyDataBtn = document.getElementById('dummyDataBtn');

    // --- API Functions ---
    const API = {
        async getPatients() {
            const response = await fetch('/api/patients');
            if (!response.ok) throw new Error('Failed to fetch patients');
            return response.json();
        },
        async createPatient(data) {
            const response = await fetch('/api/patients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to create patient');
            return response.json();
        },
        async updatePatient(id, data) {
            const response = await fetch(`/api/patients/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error('Failed to update patient');
            return response.json();
        },
        async deletePatient(id) {
            const response = await fetch(`/api/patients/${id}`, {
                method: 'DELETE',
            });
            if (!response.ok) throw new Error('Failed to delete patient');
        },
        async processPdf(formData) {
            const response = await fetch('/api/extraction/upload', {
                method: 'POST',
                body: formData,
            });
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Failed to process PDF');
            }
            return response.json();
        }
    };

    // --- Initialization ---
    async function initializeApp() {
        try {
            allPatients = await API.getPatients();
            renderPatientList();
        } catch (error) {
            console.error(error);
            patientListContainer.innerHTML = `<p class="text-red-500">Error loading patient data.</p>`;
        }
    }

    // --- Event Listeners ---
    newPatientBtn.addEventListener('click', () => uploadModal.classList.remove('hidden'));

    const dummyPatientData = {
        "patient_info": { "sex": "M", "address": "123 Debug Lane, Testville", "category": "Test", "full_name": { "last_name": "Doe", "first_name": "John", "middle_initial": "D" }, "date_of_birth": "1980-01-15", "patient_record_number": "DUMMY-001" },
        "guardian_info": { "afpsn": "G-12345", "guardian_name": { "rank": "Spouse", "last_name": "Doe", "first_name": "Jane" }, "unit_assignment": "N/A", "branch_of_service": "N/A" },
        "medical_encounters": {
            "consultations": [{ "notes": "Patient presented with a minor code bug.", "vitals": { "weight_kg": 75, "temperature_c": 37 }, "diagnosis": "Acute Syntactic Error", "age_at_visit": "45", "treatment_plan": "Refactor and re-test.", "chief_complaint": "Function not responding", "consultation_date": "2025-08-26", "attending_physician": "Dr. Dev" }],
            "lab_results": [{
                "test_type": "Urinalysis", "pathologist": "Dr. Unit Test", "date_performed": "2025-08-26", "medical_technologist": "CI/CD Pipeline", "results": [
                    { "test_name": "WBC", "value": "5-10", "reference_range": "0-2/hpf", "unit": "/hpf" },
                    { "test_name": "RBC", "value": "0-1", "reference_range": "0-1/hpf", "unit": "/hpf" },
                    { "test_name": "BACTERIA", "value": "NONE", "reference_range": "NONE", "unit": "" }
                ]
            }],
            "radiology_reports": [{ "findings": "No anomalies detected in the code structure.", "impression": "Code is clean.", "examination": "Code Review (X-Ray)", "radiologist": "Dr. Peer Review", "date_performed": "2025-08-26" }]
        }
    };

    function handleDummyData() {
        // Use a deep copy to prevent modifying the original object
        selectedPatient = JSON.parse(JSON.stringify(dummyPatientData));
        isEditMode = true;

        renderPatientDetails();
        updateButtonState();

        currentPatientName.textContent = 'Review & Create Dummy Patient';
        placeholder.classList.add('hidden');
        controlsContainer.classList.remove('hidden');
        recordContainer.classList.remove('hidden');
        saveBtn.textContent = 'Create Patient';
        recordContainer.scrollIntoView({ behavior: 'smooth' });
    }

    dummyDataBtn.addEventListener('click', handleDummyData);


    closeModalBtn.addEventListener('click', () => {
        uploadModal.classList.add('hidden');
        pdfFileInput.value = '';
        fileError.textContent = '';
    });
    processPdfBtn.addEventListener('click', handlePdfUpload);
    editBtn.addEventListener('click', toggleEditMode);
    saveBtn.addEventListener('click', handleSaveChanges);
    deleteBtn.addEventListener('click', handleDeletePatient);
    recordContainer.addEventListener('click', function (e) {
        if (!isEditMode || !e.target) return;
        if (e.target.id === 'addConsultationBtn') {
            if (!selectedPatient.medical_encounters.consultations) {
                selectedPatient.medical_encounters.consultations = [];
            }
            selectedPatient.medical_encounters.consultations.push({ vitals: {} });
            renderPatientDetails();
        }
    });

    // --- Handler Functions ---
    async function handlePdfUpload() {
        const file = pdfFileInput.files[0];
        fileError.textContent = '';
        if (!file || file.type !== 'application/pdf') {
            fileError.textContent = 'Please select a valid PDF file.';
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        loadingOverlay.classList.remove('hidden');
        uploadModal.classList.add('hidden');

        try {
            selectedPatient = await API.processPdf(formData);
            isEditMode = true;
            renderPatientDetails();
            updateButtonState();
            currentPatientName.textContent = 'Review & Create New Patient';
            placeholder.classList.add('hidden');
            controlsContainer.classList.remove('hidden');
            recordContainer.classList.remove('hidden');
            saveBtn.textContent = 'Create Patient';
        } catch (error) {
            alert(`Error processing PDF: ${error.message}`);
        } finally {
            loadingOverlay.classList.add('hidden');
            pdfFileInput.value = '';
        }
    }

    async function handleSaveChanges() {
        const updatedData = {};
        document.querySelectorAll('[data-path]').forEach(input => {
            const path = input.dataset.path;
            let value = input.value;
            if (input.type === 'number' && value) {
                value = parseFloat(value);
            } else if (!value.trim()) {
                value = null;
            }
            setValueByPath(updatedData, path, value);
        });

        try {
            const savedPatient = selectedPatient.id
                ? await API.updatePatient(selectedPatient.id, updatedData)
                : await API.createPatient(updatedData);
            await initializeApp();
            selectPatient(savedPatient.id);
        } catch (error) {
            console.error('Failed to save patient:', error);
            alert('Error: Could not save patient data.');
        }
    }

    async function handleDeletePatient() {
        if (!selectedPatient?.id || !confirm(`Are you sure you want to delete patient ${selectedPatient.name}? This cannot be undone.`)) {
            return;
        }
        try {
            await API.deletePatient(selectedPatient.id);
            selectedPatient = null;
            isEditMode = false;
            await initializeApp();
            renderPatientDetails();
            updateButtonState();
        } catch (error) {
            alert('Error: Could not delete patient.');
        }
    }

    // --- UI State & Rendering ---
    function toggleEditMode() {
        if (!selectedPatient) return;
        if (!selectedPatient.id && isEditMode) {
            selectedPatient = null;
            renderPatientDetails();
        } else {
            isEditMode = !isEditMode;
            renderPatientDetails();
        }
        updateButtonState();
    }

    function updateButtonState() {
        if (!selectedPatient) {
            controlsContainer.classList.add('hidden');
            return;
        }
        editBtn.textContent = isEditMode ? 'Cancel' : 'Edit Data';
        editBtn.classList.toggle('bg-gray-500', isEditMode);
        editBtn.classList.toggle('bg-blue-600', !isEditMode);
        saveBtn.classList.toggle('hidden', !isEditMode);
        deleteBtn.classList.toggle('hidden', isEditMode);
        saveBtn.textContent = selectedPatient.id ? 'Save Changes' : 'Create Patient';
    }

    function renderPatientList() {
        patientListContainer.innerHTML = '';
        if (allPatients.length === 0) {
            patientListContainer.innerHTML = `<p class="text-gray-500 py-4 text-center">No patients found in the database.</p>`;
            return;
        }

        const table = document.createElement('table');
        table.className = 'min-w-full'; // Simplified classes

        table.innerHTML = `
        <thead class="bg-transparent"> <tr>
                <th scope="col">Patient Name</th>
                <th scope="col">Record #</th>
                <th scope="col">Date of Birth</th>
                <th scope="col">Category</th>
            </tr>
        </thead>
        <tbody class="bg-white">
            </tbody>
    `;

        const tbody = table.querySelector('tbody');

        allPatients.forEach(patient => {
            const tr = document.createElement('tr');

            tr.innerHTML = `
            <td>${patient.name || 'N/A'}</td>
            <td>${patient.patient_info?.patient_record_number || 'N/A'}</td>
            <td>${patient.patient_info?.date_of_birth || 'N/A'}</td>
            <td>${patient.patient_info?.category || 'N/A'}</td>
        `;

            // **CRITICAL CHANGE**: Add the click event to the entire row (tr)
            tr.addEventListener('click', () => selectPatient(patient.id));

            tbody.appendChild(tr);
        });

        patientListContainer.appendChild(table);
    }

    function selectPatient(id) {
        selectedPatient = allPatients.find(p => p.id === id);
        isEditMode = false;
        renderPatientDetails();
        updateButtonState();
        placeholder.classList.add('hidden');
        controlsContainer.classList.remove('hidden');
        recordContainer.classList.remove('hidden');
        recordContainer.scrollIntoView({ behavior: 'smooth' });
    }

    function renderPatientDetails() {
        if (!selectedPatient) {
            recordContainer.innerHTML = '';
            controlsContainer.classList.add('hidden');
            placeholder.classList.remove('hidden');
            return;
        }

        const { patient_info, guardian_info, medical_encounters } = selectedPatient;
        currentPatientName.textContent = `Viewing: ${selectedPatient.name || 'New Patient'}`;

        recordContainer.innerHTML = `
            <section id="patientInfo" class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"></section>
            <section id="medicalEncounters">
                <h2 class="text-2xl font-bold text-gray-800 border-b-2 border-gray-200 pb-2 mb-6">Medical Encounters</h2>
                <div id="consultations" class="mb-8"></div>
                <div id="labResults" class="mb-8"></div>
                <div id="radiologyReports"></div>
            </section>
        `;

        // This is the critical part that was missing/corrupted
        if (patient_info) renderPatientInfo(patient_info, 'patient_info');
        if (guardian_info) renderGuardianInfo(guardian_info, 'guardian_info');

        if (medical_encounters?.consultations) renderConsultations(medical_encounters.consultations);
        if (medical_encounters?.lab_results) renderLabResults(medical_encounters.lab_results);
        if (medical_encounters?.radiology_reports) renderRadiologyReports(medical_encounters.radiology_reports);
    }

    // --- Helper Functions ---
    function createInfoItem(label, value) { return value ? `<div class="py-2"><dt class="font-medium text-gray-500">${label}</dt><dd class="text-gray-900">${value}</dd></div>` : '' }
    function createEditItem(label, value, path) { const isTextArea = ['notes', 'findings', 'treatment plan', 'impression'].includes(label.toLowerCase()); const inputType = (label.toLowerCase().includes('date')) ? 'date' : 'text'; if (isTextArea) return `<div class="py-2"><label class="font-medium text-gray-500">${label}</label><textarea data-path="${path}" class="edit-textarea">${value || ''}</textarea></div>`; return `<div class="py-2 grid grid-cols-1 sm:grid-cols-3 items-center"><label class="font-medium text-gray-500 sm:col-span-1">${label}</label><input type="${inputType}" data-path="${path}" value="${value || ''}" class="edit-input sm:col-span-2"></div>`; }
    function renderPatientInfo(info, basePath) { const container = document.getElementById('patientInfo'); const fullName = [info.full_name?.first_name, info.full_name?.middle_initial, info.full_name?.last_name].filter(Boolean).join(' '); let content = `<div class="bg-white p-6 rounded-lg shadow-md card"><h3 class="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Patient Information</h3>${isEditMode ? `<div class="space-y-2">${createEditItem("Record Number", info.patient_record_number, `${basePath}.patient_record_number`)}${createEditItem("First Name", info.full_name?.first_name, `${basePath}.full_name.first_name`)}${createEditItem("Middle Initial", info.full_name?.middle_initial, `${basePath}.full_name.middle_initial`)}${createEditItem("Last Name", info.full_name?.last_name, `${basePath}.full_name.last_name`)}${createEditItem("Date of Birth", info.date_of_birth, `${basePath}.date_of_birth`)}${createEditItem("Sex", info.sex, `${basePath}.sex`)}${createEditItem("Address", info.address, `${basePath}.address`)}${createEditItem("Category", info.category, `${basePath}.category`)}</div>` : `<dl class="divide-y divide-gray-200">${createInfoItem("Record Number", info.patient_record_number)}${createInfoItem("Full Name", fullName)}${createInfoItem("Date of Birth", info.date_of_birth)}${createInfoItem("Sex", info.sex)}${createInfoItem("Address", info.address)}${createInfoItem("Category", info.category)}</dl>`}</div>`; container.innerHTML += content; }
    function renderGuardianInfo(info, basePath) { const container = document.getElementById('patientInfo'); const guardianName = [info.guardian_name?.rank, info.guardian_name?.first_name, info.guardian_name?.last_name].filter(Boolean).join(' '); let content = `<div class="bg-white p-6 rounded-lg shadow-md card" style="animation-delay: 0.1s;"><h3 class="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Guardian Information</h3>${isEditMode ? `<div class="space-y-2">${createEditItem("Rank", info.guardian_name?.rank, `${basePath}.guardian_name.rank`)}${createEditItem("First Name", info.guardian_name?.first_name, `${basePath}.guardian_name.first_name`)}${createEditItem("Last Name", info.guardian_name?.last_name, `${basePath}.guardian_name.last_name`)}${createEditItem("AFPSN", info.afpsn, `${basePath}.afpsn`)}${createEditItem("Branch of Service", info.branch_of_service, `${basePath}.branch_of_service`)}${createEditItem("Unit Assignment", info.unit_assignment, `${basePath}.unit_assignment`)}</div>` : `<dl class="divide-y divide-gray-200">${createInfoItem("Full Name", guardianName)}${createInfoItem("AFPSN", info.afpsn)}${createInfoItem("Branch of Service", info.branch_of_service)}${createInfoItem("Unit Assignment", info.unit_assignment)}</dl>`}</div>`; container.innerHTML += content; }
    function renderConsultations(consultations) { const container = document.getElementById('consultations'); let header = `<div class="flex justify-between items-center mb-4"><h3 class="text-xl font-semibold text-gray-700">Consultations</h3>`; if (isEditMode) header += `<button id="addConsultationBtn" class="bg-blue-500 text-white text-sm font-bold py-1 px-3 rounded-lg hover:bg-blue-600 transition-colors">+ Add</button>`; header += `</div>`; let content = `<div class="space-y-6">`; (consultations || []).forEach((item, index) => { const basePath = `medical_encounters.consultations.${index}`; const vitals = item.vitals || {}; content += `<div class="bg-white p-6 rounded-lg shadow-md card" style="animation-delay: ${0.2 + index * 0.1}s;"><div class="flex justify-between items-start mb-4"><h4 class="text-lg font-semibold text-blue-600">Consultation #${index + 1}</h4>${isEditMode ? createEditItem("Date", item.consultation_date, `${basePath}.consultation_date`).replace('sm:grid-cols-3', '').replace('sm:col-span-1', '').replace('sm:col-span-2', 'w-48') : `<span class="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">${item.consultation_date || 'N/A'}</span>`}</div>${isEditMode ? `<div class="space-y-2">${createEditItem("Age at Visit", item.age_at_visit, `${basePath}.age_at_visit`)}${createEditItem("Weight (kg)", vitals.weight_kg, `${basePath}.vitals.weight_kg`)}${createEditItem("Temperature (°C)", vitals.temperature_c, `${basePath}.vitals.temperature_c`)}${createEditItem("Attending Physician", item.attending_physician, `${basePath}.attending_physician`)}${createEditItem("Chief Complaint", item.chief_complaint, `${basePath}.chief_complaint`)}${createEditItem("Diagnosis", item.diagnosis, `${basePath}.diagnosis`)}${createEditItem("Notes", item.notes, `${basePath}.notes`)}${createEditItem("Treatment Plan", item.treatment_plan, `${basePath}.treatment_plan`)}</div>` : `<dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">${createInfoItem("Age at Visit", item.age_at_visit)}${createInfoItem("Weight (kg)", vitals.weight_kg)}${createInfoItem("Temperature (°C)", vitals.temperature_c)}${createInfoItem("Attending Physician", item.attending_physician)}</dl><div class="mt-4 pt-4 border-t">${createInfoItem("Chief Complaint", `<p class="text-red-700 font-semibold">${item.chief_complaint || 'N/A'}</p>`)}${createInfoItem("Diagnosis", `<p class="font-semibold">${item.diagnosis || 'N/A'}</p>`)}${createInfoItem("Notes", `<p class="text-sm text-gray-600">${item.notes || 'N/A'}</p>`)}${createInfoItem("Treatment Plan", `<p class="text-sm text-gray-600">${item.treatment_plan || 'N/A'}</p>`)}</div>`}</div>`; }); content += `</div>`; container.innerHTML = header + content; }
    function renderRadiologyReports(reports) { const container = document.getElementById('radiologyReports'); let content = `<h3 class="text-xl font-semibold text-gray-700 mb-4">Radiology Reports</h3><div class="space-y-6">`; (reports || []).forEach((report, index) => { const basePath = `medical_encounters.radiology_reports.${index}`; content += `<div class="bg-white p-6 rounded-lg shadow-md card" style="animation-delay: ${0.4 + index * 0.1}s;"><div class="flex justify-between items-start mb-4"><h4 class="text-lg font-semibold text-purple-600">${isEditMode ? createEditItem("Examination", report.examination, `${basePath}.examination`).replace('sm:grid-cols-3', '').replace('sm:col-span-1', '') : (report.examination || 'Radiology Report')}</h4>${isEditMode ? createEditItem("Date", report.date_performed, `${basePath}.date_performed`).replace('sm:grid-cols-3', '').replace('sm:col-span-1', '').replace('sm:col-span-2', 'w-48') : `<span class="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">${report.date_performed || 'N/A'}</span>`}</div>`; if (isEditMode) { content += `<div class="space-y-2">${createEditItem("Findings", report.findings, `${basePath}.findings`)}${createEditItem("Impression", report.impression, `${basePath}.impression`)}${createEditItem("Radiologist", report.radiologist, `${basePath}.radiologist`)}</div>`; } else { content += `<div class="mt-4 space-y-3">${createInfoItem("Findings", `<p class="text-sm text-gray-600">${report.findings || 'N/A'}</p>`)}${createInfoItem("Impression", `<p class="font-semibold">${report.impression || 'N/A'}</p>`)}${createInfoItem("Radiologist", report.radiologist)}</div>`; } content += '</div>'; }); content += `</div>`; container.innerHTML = content; }
    function setValueByPath(obj, path, value) { const keys = path.split('.'); let current = obj; for (let i = 0; i < keys.length - 1; i++) { const key = keys[i]; if (current[key] === undefined || current[key] === null) { current[key] = !isNaN(keys[i + 1]) ? [] : {}; } current = current[key]; } current[keys[keys.length - 1]] = value; }

    function renderLabResults(labs) {
        const container = document.getElementById('labResults');
        let content = `<h3 class="text-xl font-semibold text-gray-700 mb-4">Laboratory Results</h3><div class="space-y-6">`;

        (labs || []).forEach((lab, index) => {
            const basePath = `medical_encounters.lab_results.${index}`;
            content += `<div class="bg-white p-6 rounded-lg shadow-md card" style="animation-delay: ${0.3 + index * 0.1}s;">
                <div class="flex justify-between items-start mb-4">
                    <h4 class="text-lg font-semibold text-green-600">${isEditMode ? createEditItem("Test Type", lab.test_type, `${basePath}.test_type`).replace('sm:grid-cols-3', '').replace('sm:col-span-1', '') : (lab.test_type || 'Lab Report')}</h4>
                    ${isEditMode ? createEditItem("Date", lab.date_performed, `${basePath}.date_performed`).replace('sm:grid-cols-3', '').replace('sm:col-span-1', '').replace('sm:col-span-2', 'w-48') : `<span class="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">${lab.date_performed || 'N/A'}</span>`}
                </div>`;

            if (isEditMode) {
                // --- START: NEW EDIT MODE LOGIC FOR LAB RESULTS ---
                content += `
                    <table class="w-full text-sm text-left text-gray-500 mt-4">
                        <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" class="px-4 py-2">Test Name</th>
                                <th scope="col" class="px-4 py-2">Value</th>
                                <th scope="col" class="px-4 py-2">Reference Range</th>
                                <th scope="col" class="px-4 py-2">Unit</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${(lab.results || []).map((res, resultIndex) => {
                    const resultBasePath = `${basePath}.results.${resultIndex}`;
                    return `
                                <tr class="bg-white border-b">
                                    <td class="px-2 py-1"><input type="text" class="edit-input" data-path="${resultBasePath}.test_name" value="${res.test_name || ''}"></td>
                                    <td class="px-2 py-1"><input type="text" class="edit-input" data-path="${resultBasePath}.value" value="${res.value || ''}"></td>
                                    <td class="px-2 py-1"><input type="text" class="edit-input" data-path="${resultBasePath}.reference_range" value="${res.reference_range || ''}"></td>
                                    <td class="px-2 py-1"><input type="text" class="edit-input" data-path="${resultBasePath}.unit" value="${res.unit || ''}"></td>
                                </tr>`;
                }).join('')}
                        </tbody>
                    </table>
                    <div class="mt-4 pt-4 border-t space-y-2">
                        ${createEditItem("Medical Technologist", lab.medical_technologist, `${basePath}.medical_technologist`)}
                        ${createEditItem("Pathologist", lab.pathologist, `${basePath}.pathologist`)}
                    </div>
                 `;
                // --- END: NEW EDIT MODE LOGIC FOR LAB RESULTS ---
            } else {
                content += `<table class="w-full text-sm text-left text-gray-500 mt-4"><thead class="text-xs text-gray-700 uppercase bg-gray-50"><tr><th scope="col" class="px-4 py-2">Test Name</th><th scope="col" class="px-4 py-2">Value</th><th scope="col" class="px-4 py-2">Reference Range</th><th scope="col" class="px-4 py-2">Unit</th></tr></thead><tbody>${(lab.results || []).map(res => `<tr class="bg-white border-b"><td class="px-4 py-2 font-medium text-gray-900">${res.test_name || ''}</td><td class="px-4 py-2">${res.value || ''}</td><td class="px-4 py-2">${res.reference_range || ''}</td><td class="px-4 py-2">${res.unit || ''}</td></tr>`).join('')}</tbody></table><div class="mt-4 pt-4 border-t text-sm text-gray-600">${createInfoItem("Medical Technologist", lab.medical_technologist)}${createInfoItem("Pathologist", lab.pathologist)}</div>`;
            }
            content += '</div>';
        });
        content += `</div>`;
        container.innerHTML = content;
    }

    initializeApp();
});