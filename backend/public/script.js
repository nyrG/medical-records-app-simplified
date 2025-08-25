// backend/public/script.js
document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let allPatients = [];
    let selectedPatient = null;
    let isEditMode = false;
    const blankPatientRecord = {"patient_info":{"patient_record_number":null,"full_name":{"first_name":null,"middle_initial":null,"last_name":null},"date_of_birth":null,"sex":null,"address":null,"category":null},"guardian_info":{"guardian_name":{"rank":null,"first_name":null,"last_name":null},"afpsn":null,"branch_of_service":null,"unit_assignment":null},"medical_encounters":{"consultations":[],"lab_results":[],"radiology_reports":[]}};

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
    newPatientBtn.addEventListener('click', handleNewPatient);
    editBtn.addEventListener('click', toggleEditMode);
    saveBtn.addEventListener('click', handleSaveChanges);
    deleteBtn.addEventListener('click', handleDeletePatient);
    
    // --- Rendering Functions ---
    function renderPatientList() {
        patientListContainer.innerHTML = '';
        if (allPatients.length === 0) {
            patientListContainer.innerHTML = `<p class="text-gray-500">No patients found in the database.</p>`;
            return;
        }
        const list = document.createElement('div');
        list.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4';
        allPatients.forEach(patient => {
            const card = document.createElement('button');
            card.className = 'p-4 border rounded-lg text-left hover:bg-blue-50 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500';
            card.innerHTML = `
                <p class="font-bold text-gray-800">${patient.name}</p>
                <p class="text-sm text-gray-500">ID: ${patient.id}</p>
            `;
            card.onclick = () => selectPatient(patient.id);
            list.appendChild(card);
        });
        patientListContainer.appendChild(list);
    }

    function selectPatient(id) {
        selectedPatient = allPatients.find(p => p.id === id);
        isEditMode = false;
        renderPatientDetails();
        updateButtonState();
        placeholder.classList.add('hidden');
        controlsContainer.classList.remove('hidden');
        recordContainer.classList.remove('hidden');
        document.querySelector(`[id="controlsContainer"]`).scrollIntoView({ behavior: 'smooth' });
    }

    function renderPatientDetails() {
        if (!selectedPatient) {
            recordContainer.innerHTML = '';
            controlsContainer.classList.add('hidden');
            placeholder.classList.remove('hidden');
            return;
        };

        const { patient_info, guardian_info, medical_encounters } = selectedPatient;
        currentPatientName.textContent = `Viewing: ${selectedPatient.name}`;
        
        // The rendering logic from your original file is used here, with minor tweaks
        recordContainer.innerHTML = `
            <section id="patientInfo" class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"></section>
            <section id="medicalEncounters">
                <h2 class="text-2xl font-bold text-gray-800 border-b-2 border-gray-200 pb-2 mb-6">Medical Encounters</h2>
                <div id="consultations" class="mb-8"></div><div id="labResults" class="mb-8"></div><div id="radiologyReports"></div>
            </section>
        `;
        
        renderPatientInfo(patient_info, 'patient_info');
        if (guardian_info) renderGuardianInfo(guardian_info, 'guardian_info');
        if (medical_encounters?.consultations) renderConsultations(medical_encounters.consultations);
        if (medical_encounters?.lab_results) renderLabResults(medical_encounters.lab_results);
        if (medical_encounters?.radiology_reports) renderRadiologyReports(medical_encounters.radiology_reports);
    }
    
    // --- Handler Functions ---
    function handleNewPatient() {
        // Use a deep copy of the blank record structure
        selectedPatient = JSON.parse(JSON.stringify(blankPatientRecord));
        isEditMode = true; // Start in edit mode for a new patient
        renderPatientDetails();
        updateButtonState();
        currentPatientName.textContent = 'Creating New Patient';
        placeholder.classList.add('hidden');
        controlsContainer.classList.remove('hidden');
        recordContainer.classList.remove('hidden');
        saveBtn.textContent = 'Create Patient';
    }

    async function handleSaveChanges() {
        const updatedData = {};
        document.querySelectorAll('[data-path]').forEach(input => {
            const path = input.dataset.path;
            let value = input.value;
            if (!isNaN(value) && value.trim() !== '') {
                const num = parseFloat(value);
                if (String(num) === value) value = num;
            }
            setValueByPath(updatedData, path, value);
        });

        try {
            if (selectedPatient.id) { // If it has an ID, we're updating
                await API.updatePatient(selectedPatient.id, updatedData);
            } else { // No ID, so we're creating
                await API.createPatient(updatedData);
            }
            await initializeApp(); // Refresh the whole app state
            selectPatient(selectedPatient.id); // Re-select the patient to see changes
        } catch (error) {
            console.error('Failed to save patient:', error);
            alert('Error: Could not save patient data.');
        }
    }
    
    async function handleDeletePatient() {
        if (!selectedPatient || !selectedPatient.id) return;
        if (confirm(`Are you sure you want to delete patient ${selectedPatient.name}? This cannot be undone.`)) {
            try {
                await API.deletePatient(selectedPatient.id);
                selectedPatient = null;
                isEditMode = false;
                await initializeApp();
                renderPatientDetails();
                updateButtonState();
            } catch (error) {
                console.error('Failed to delete patient:', error);
                alert('Error: Could not delete patient.');
            }
        }
    }

    function toggleEditMode() {
        if (!selectedPatient) return;
        // If we are creating a new patient, "Cancel" should clear the selection
        if (!selectedPatient.id && isEditMode) {
            selectedPatient = null;
            renderPatientDetails();
            updateButtonState();
            return;
        }
        isEditMode = !isEditMode;
        renderPatientDetails();
        updateButtonState();
    }

    function updateButtonState() {
        if (!selectedPatient) {
            controlsContainer.classList.add('hidden');
            return;
        }
        
        if (isEditMode) {
            editBtn.textContent = 'Cancel';
            editBtn.classList.replace('bg-blue-600', 'bg-gray-500');
            saveBtn.classList.remove('hidden');
            deleteBtn.classList.add('hidden');
            saveBtn.textContent = selectedPatient.id ? 'Save Changes' : 'Create Patient';
        } else {
            editBtn.textContent = 'Edit Data';
            editBtn.classList.replace('bg-gray-500', 'bg-blue-600');
            saveBtn.classList.add('hidden');
            deleteBtn.classList.remove('hidden');
        }
    }
    
    // --- Helper functions (mostly from your original file) ---
    function createInfoItem(label, value) { return value ? `<div class="py-2"><dt class="font-medium text-gray-500">${label}</dt><dd class="text-gray-900">${value}</dd></div>` : ''; }
    function createEditItem(label, value, path) {
        const isTextArea = ['notes', 'findings', 'treatment plan'].includes(label.toLowerCase());
        const inputType = (label.toLowerCase().includes('date')) ? 'date' : 'text';
        if (isTextArea) return `<div class="py-2"><label class="font-medium text-gray-500">${label}</label><textarea data-path="${path}" class="edit-textarea">${value || ''}</textarea></div>`;
        return `<div class="py-2 grid grid-cols-1 sm:grid-cols-3 items-center"><label class="font-medium text-gray-500 sm:col-span-1">${label}</label><input type="${inputType}" data-path="${path}" value="${value || ''}" class="edit-input sm:col-span-2"></div>`;
    }
    function renderPatientInfo(info, basePath) {
        const container = document.getElementById('patientInfo');
        const fullName = [info.full_name?.first_name, info.full_name?.middle_initial, info.full_name?.last_name].filter(Boolean).join(' ');
        let content = `<div class="bg-white p-6 rounded-lg shadow-md card"><h3 class="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Patient Information</h3>${isEditMode ? `<div class="space-y-2">${createEditItem('Record Number', info.patient_record_number, `${basePath}.patient_record_number`)}${createEditItem('First Name', info.full_name?.first_name, `${basePath}.full_name.first_name`)}${createEditItem('Middle Initial', info.full_name?.middle_initial, `${basePath}.full_name.middle_initial`)}${createEditItem('Last Name', info.full_name?.last_name, `${basePath}.full_name.last_name`)}${createEditItem('Date of Birth', info.date_of_birth, `${basePath}.date_of_birth`)}${createEditItem('Sex', info.sex, `${basePath}.sex`)}${createEditItem('Address', info.address, `${basePath}.address`)}${createEditItem('Category', info.category, `${basePath}.category`)}</div>` : `<dl class="divide-y divide-gray-200">${createInfoItem('Record Number', info.patient_record_number)}${createInfoItem('Full Name', fullName)}${createInfoItem('Date of Birth', info.date_of_birth)}${createInfoItem('Sex', info.sex)}${createInfoItem('Address', info.address)}${createInfoItem('Category', info.category)}</dl>`}</div>`;
        container.innerHTML += content;
    }
    function renderGuardianInfo(info, basePath) {
        const container = document.getElementById('patientInfo');
        const guardianName = [info.guardian_name?.rank, info.guardian_name?.first_name, info.guardian_name?.last_name].filter(Boolean).join(' ');
        let content = `<div class="bg-white p-6 rounded-lg shadow-md card" style="animation-delay: 0.1s;"><h3 class="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Guardian Information</h3>${isEditMode ? `<div class="space-y-2">${createEditItem('Rank', info.guardian_name?.rank, `${basePath}.guardian_name.rank`)}${createEditItem('First Name', info.guardian_name?.first_name, `${basePath}.guardian_name.first_name`)}${createEditItem('Last Name', info.guardian_name?.last_name, `${basePath}.guardian_name.last_name`)}${createEditItem('AFPSN', info.afpsn, `${basePath}.afpsn`)}${createEditItem('Branch of Service', info.branch_of_service, `${basePath}.branch_of_service`)}${createEditItem('Unit Assignment', info.unit_assignment, `${basePath}.unit_assignment`)}</div>` : `<dl class="divide-y divide-gray-200">${createInfoItem('Full Name', guardianName)}${createInfoItem('AFPSN', info.afpsn)}${createInfoItem('Branch of Service', info.branch_of_service)}${createInfoItem('Unit Assignment', info.unit_assignment)}</dl>`}</div>`;
        container.innerHTML += content;
    }
    function renderConsultations(consultations) {
        const container = document.getElementById('consultations');
        let content = `<h3 class="text-xl font-semibold text-gray-700 mb-4">Consultations</h3><div class="space-y-6">`;
        consultations?.forEach((item, index) => {
            const basePath = `medical_encounters.consultations.${index}`;
            const vitals = item.vitals || {};
            content += `<div class="bg-white p-6 rounded-lg shadow-md card" style="animation-delay: ${0.2 + index * 0.1}s;"><div class="flex justify-between items-start mb-4"><h4 class="text-lg font-semibold text-blue-600">Consultation</h4>${isEditMode ? createEditItem('Date', item.consultation_date, `${basePath}.consultation_date`).replace('sm:grid-cols-3', '').replace('sm:col-span-1', '').replace('sm:col-span-2', 'w-48') : `<span class="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">${item.consultation_date || 'N/A'}</span>`}</div>${isEditMode ? `<div class="space-y-2">${createEditItem('Age at Visit', item.age_at_visit, `${basePath}.age_at_visit`)}${createEditItem('Weight (kg)', vitals.weight_kg, `${basePath}.vitals.weight_kg`)}${createEditItem('Temperature (°C)', vitals.temperature_c, `${basePath}.vitals.temperature_c`)}${createEditItem('Attending Physician', item.attending_physician, `${basePath}.attending_physician`)}${createEditItem('Chief Complaint', item.chief_complaint, `${basePath}.chief_complaint`)}${createEditItem('Diagnosis', item.diagnosis, `${basePath}.diagnosis`)}${createEditItem('Notes', item.notes, `${basePath}.notes`)}${createEditItem('Treatment Plan', item.treatment_plan, `${basePath}.treatment_plan`)}</div>` : `<dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">${createInfoItem('Age at Visit', item.age_at_visit)}${createInfoItem('Weight (kg)', vitals.weight_kg)}${createInfoItem('Temperature (°C)', vitals.temperature_c)}${createInfoItem('Attending Physician', item.attending_physician)}</dl><div class="mt-4 pt-4 border-t">${createInfoItem('Chief Complaint', `<p class="text-red-700 font-semibold">${item.chief_complaint || 'N/A'}</p>`)}${createInfoItem('Diagnosis', `<p class="font-semibold">${item.diagnosis || 'N/A'}</p>`)}${createInfoItem('Notes', `<p class="text-sm text-gray-600">${item.notes || 'N/A'}</p>`)}${createInfoItem('Treatment Plan', `<p class="text-sm text-gray-600">${item.treatment_plan || 'N/A'}</p>`)}</div>`}</div>`;
        });
        content += `</div>`;
        container.innerHTML = content;
    }
    function renderLabResults(labs) {
        const container = document.getElementById('labResults');
        let content = `<h3 class="text-xl font-semibold text-gray-700 mb-4">Laboratory Results</h3><div class="space-y-6">`;
        labs?.forEach((lab, index) => {
            content += `<div class="bg-white p-6 rounded-lg shadow-md card" style="animation-delay: ${0.3 + index * 0.1}s;"><div class="flex justify-between items-start mb-4"><h4 class="text-lg font-semibold text-green-600">${lab.test_type || 'Lab Report'}</h4><span class="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">${lab.date_performed || 'N/A'}</span></div><table class="w-full text-sm text-left text-gray-500 mt-4"><thead class="text-xs text-gray-700 uppercase bg-gray-50"><tr><th scope="col" class="px-4 py-2">Test Name</th><th scope="col" class="px-4 py-2">Value</th><th scope="col" class="px-4 py-2">Reference Range</th><th scope="col" class="px-4 py-2">Unit</th></tr></thead><tbody>${lab.results?.map(res => `<tr class="bg-white border-b"><td class="px-4 py-2 font-medium text-gray-900">${res.test_name || ''}</td><td class="px-4 py-2">${res.value || ''}</td><td class="px-4 py-2">${res.reference_range || ''}</td><td class="px-4 py-2">${res.unit || ''}</td></tr>`).join('')}</tbody></table><div class="mt-4 pt-4 border-t text-sm text-gray-600">${createInfoItem('Medical Technologist', lab.medical_technologist)}${createInfoItem('Pathologist', lab.pathologist)}</div></div>`;
        });
        content += `</div>`;
        container.innerHTML = content;
    }
    function renderRadiologyReports(reports) {
        const container = document.getElementById('radiologyReports');
        let content = `<h3 class="text-xl font-semibold text-gray-700 mb-4">Radiology Reports</h3><div class="space-y-6">`;
        reports?.forEach((report, index) => {
            content += `<div class="bg-white p-6 rounded-lg shadow-md card" style="animation-delay: ${0.4 + index * 0.1}s;"><div class="flex justify-between items-start mb-4"><h4 class="text-lg font-semibold text-purple-600">${report.examination || 'Radiology Report'}</h4><span class="text-sm font-medium text-gray-500 bg-gray-100 px-3 py-1 rounded-full">${report.date_performed || 'N/A'}</span></div><div class="mt-4 space-y-3">${createInfoItem('Findings', `<p class="text-sm text-gray-600">${report.findings || 'N/A'}</p>`)}${createInfoItem('Impression', `<p class="font-semibold">${report.impression || 'N/A'}</p>`)}${createInfoItem('Radiologist', report.radiologist)}</div></div>`;
        });
        content += `</div>`;
        container.innerHTML = content;
    }
    function setValueByPath(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (current[key] === undefined || current[key] === null) {
                current[key] = !isNaN(keys[i+1]) ? [] : {};
            }
            current = current[key];
        }
        current[keys[keys.length - 1]] = value;
    }

    // --- Start the application ---
    initializeApp();
});