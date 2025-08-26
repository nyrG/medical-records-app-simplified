document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let allPatients = [];
    let selectedPatient = null;
    let isEditMode = false;
    let currentPage = 1;
    let totalPatients = 0;
    let rowsPerPage = 10;

    // --- DOM Elements ---
    const patientListContainer = document.getElementById('patientListContainer');
    const recordContainer = document.getElementById('recordContainer');
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
    const mainContent = document.querySelector('.main-content');
    const patientDetailContainer = document.getElementById('patientDetailContainer');
    const backToListBtn = document.getElementById('backToListBtn');
    const recordCount = document.getElementById('recordCount');

    // --- API Functions ---
    const API = {
        async getPatients(page, limit) { const r = await fetch(`/api/patients?page=${page}&limit=${limit}`); if (!r.ok) throw new Error('Failed to fetch patients'); return r.json(); },
        async createPatient(data) { const r = await fetch('/api/patients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!r.ok) throw new Error('Failed to create patient'); return r.json(); },
        async updatePatient(id, data) {
            const r = await fetch(`/api/patients/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!r.ok) {
                // Create a custom error that includes the response
                const error = new Error('Failed to update patient');
                error.response = r; // Attach the original response object
                throw error;
            }
            return r.json();
        },
        async deletePatient(id) { const r = await fetch(`/api/patients/${id}`, { method: 'DELETE' }); if (!r.ok) throw new Error('Failed to delete patient'); },
        async processPdf(formData) { const r = await fetch('/api/extraction/upload', { method: 'POST', body: formData }); if (!r.ok) { const e = await r.json(); throw new Error(e.message || 'Failed to process PDF'); } return r.json(); }
    };

    // --- Initialization & Data Fetching ---
    async function fetchAndDisplayPatients(page = 1) {
        try {
            const { data, total } = await API.getPatients(page, rowsPerPage);
            allPatients = data; totalPatients = total; currentPage = page;
            renderPatientList();
        } catch (error) { patientListContainer.innerHTML = `<p class="text-red-500 text-center py-8">Error loading patient data.</p>`; }
    }

    // --- Event Listeners ---
    newPatientBtn.addEventListener('click', () => uploadModal.classList.remove('hidden'));
    closeModalBtn.addEventListener('click', () => { uploadModal.classList.add('hidden'); pdfFileInput.value = ''; fileError.textContent = ''; });
    processPdfBtn.addEventListener('click', handlePdfUpload);
    editBtn.addEventListener('click', toggleEditMode);
    saveBtn.addEventListener('click', handleSaveChanges);
    deleteBtn.addEventListener('click', handleDeletePatient);
    backToListBtn.addEventListener('click', () => fetchAndDisplayPatients(currentPage));
    recordContainer.addEventListener('click', function (e) {
        if (isEditMode && e.target?.id === 'addConsultationBtn') {
            if (!selectedPatient.medical_encounters.consultations) selectedPatient.medical_encounters.consultations = [];
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
            selectPatient(null); // Switch to detail view for the new patient
            currentPatientName.textContent = 'Review & Create New Patient';
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

            await fetchAndDisplayPatients(currentPage);
            selectPatient(savedPatient.id);
        } catch (error) {
            console.error('Failed to save patient:', error);
            let detailedError = 'Could not save patient data.';
            // This check will now work if error.response exists
            if (error.response) {
                try {
                    const responseBody = await error.response.json();
                    if (responseBody.message) {
                        detailedError = Array.isArray(responseBody.message) ? responseBody.message.join(', ') : responseBody.message;
                    }
                } catch (e) { /* Fallback if JSON parsing fails */ }
            }
            alert(`Error: ${detailedError}`);
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
            await fetchAndDisplayPatients(1); // Go back to the first page after deletion
        } catch (error) {
            console.error('Failed to delete patient:', error);
            alert('Error: Could not delete patient.');
        }
    }
    // Add collapsed functions for brevity
    Object.assign(window, { handlePdfUpload: async function () { const file = pdfFileInput.files[0]; fileError.textContent = ''; if (!file || file.type !== 'application/pdf') { fileError.textContent = 'Please select a valid PDF file.'; return; } const formData = new FormData(); formData.append('file', file); loadingOverlay.classList.remove('hidden'); uploadModal.classList.add('hidden'); try { selectedPatient = await API.processPdf(formData); isEditMode = true; selectPatient(null); currentPatientName.textContent = 'Review & Create New Patient'; saveBtn.textContent = 'Create Patient'; } catch (error) { alert(`Error processing PDF: ${error.message}`); } finally { loadingOverlay.classList.add('hidden'); pdfFileInput.value = ''; } }, handleSaveChanges: async function () { const updatedData = {}; document.querySelectorAll('[data-path]').forEach(input => { const path = input.dataset.path; let value = input.value; if (input.type === 'number' && value) { value = parseFloat(value); } else if (!value.trim()) { value = null; } setValueByPath(updatedData, path, value); }); try { const savedPatient = selectedPatient.id ? await API.updatePatient(selectedPatient.id, updatedData) : await API.createPatient(updatedData); await fetchAndDisplayPatients(currentPage); selectPatient(savedPatient.id); } catch (error) { alert('Error: Could not save patient data.'); } }, handleDeletePatient: async function () { if (!selectedPatient?.id || !confirm(`Are you sure you want to delete patient ${selectedPatient.name}? This cannot be undone.`)) { return; } try { await API.deletePatient(selectedPatient.id); selectedPatient = null; isEditMode = false; await fetchAndDisplayPatients(1); } catch (error) { alert('Error: Could not delete patient.'); } } });

    // --- UI State & Rendering Functions ---
    function toggleEditMode() {
        if (!selectedPatient) return;
        // If canceling the creation of a new patient, go back to the list
        if (!selectedPatient.id && isEditMode) {
            fetchAndDisplayPatients(currentPage);
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

        const editBtnText = document.getElementById('editBtnText');
        const editIcon = document.getElementById('editIcon');
        const cancelIcon = document.getElementById('cancelIcon');

        if (isEditMode) {
            editBtnText.textContent = 'Cancel';
            editIcon.classList.add('hidden');
            cancelIcon.classList.remove('hidden');
            editBtn.classList.replace('btn-primary', 'btn-secondary');
            saveBtn.classList.remove('hidden');
            deleteBtn.classList.add('hidden');
        } else {
            editBtnText.textContent = 'Edit Data';
            editIcon.classList.remove('hidden');
            cancelIcon.classList.add('hidden');
            editBtn.classList.replace('btn-secondary', 'btn-primary');
            saveBtn.classList.add('hidden');
            deleteBtn.classList.remove('hidden');
        }
    }

    function renderPatientList() {
        mainContent.classList.remove('hidden');
        patientDetailContainer.classList.add('hidden');
        recordCount.textContent = `${totalPatients} Records`;
        patientListContainer.innerHTML = '';
        if (allPatients.length === 0) {
            patientListContainer.innerHTML = `<p class="text-gray-500 py-8 text-center">No patients found.</p>`;
            document.getElementById('paginationContainer').innerHTML = '';
            return;
        }
        const table = document.createElement('table');
        table.className = 'min-w-full';
        table.innerHTML = `<thead><tr><th class="w-12"><input type="checkbox" class="h-4 w-4 rounded border-gray-300"></th><th>Patient Name</th><th>Record #</th><th>Date of Birth</th><th>Category</th></tr></thead><tbody class="bg-white"></tbody>`;
        const tbody = table.querySelector('tbody');
        allPatients.forEach(patient => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td><input type="checkbox" class="h-4 w-4 rounded border-gray-300"></td><td>${patient.name || 'N/A'}</td><td>${patient.patient_info?.patient_record_number || 'N/A'}</td><td>${patient.patient_info?.date_of_birth || 'N/A'}</td><td>${patient.patient_info?.category || 'N/A'}</td>`;
            tr.addEventListener('click', () => selectPatient(patient.id));
            tbody.appendChild(tr);
        });
        patientListContainer.appendChild(table);
        renderPagination();
    }

    function renderPagination() {
        const paginationContainer = document.getElementById('paginationContainer');
        paginationContainer.innerHTML = '';
        const totalPages = Math.ceil(totalPatients / rowsPerPage);

        // This check is removed, so the controls will always render.
        // if (totalPages <= 1) return; 
        const startRecord = totalPatients > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0;
        const endRecord = Math.min(currentPage * rowsPerPage, totalPatients);

        let paginationHTML = `
        <div class="pagination-controls">
            <span class="text-sm text-slate-600">Rows per page:</span>
            <select id="rowsPerPageSelect" class="rows-per-page-select">
                <option value="10" ${rowsPerPage === 10 ? 'selected' : ''}>10</option>
                <option value="25" ${rowsPerPage === 25 ? 'selected' : ''}>25</option>
                <option value="50" ${rowsPerPage === 50 ? 'selected' : ''}>50</option>
            </select>
            <span class="text-sm text-slate-600">${startRecord}-${endRecord} of ${totalPatients}</span>
        </div>
        <nav class="flex items-center justify-between">`;

        paginationHTML += '<div class="flex items-center gap-2">';
        // Disable 'Prev' if on the first page
        paginationHTML += `<button class="pagination-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">Prev</button>`;

        // Only show page numbers if there are pages to show
        if (totalPages > 0) {
            for (let i = 1; i <= totalPages; i++) {
                paginationHTML += `<button class="pagination-page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
            }
        }

        // Disable 'Next' if on the last page
        paginationHTML += `<button class="pagination-btn" ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Next</button>`;
        paginationHTML += '</div></nav>';
        paginationContainer.innerHTML = paginationHTML;

        // Re-attach the event listener for the dropdown
        document.getElementById('rowsPerPageSelect').addEventListener('change', (e) => {
            rowsPerPage = parseInt(e.target.value, 10);
            fetchAndDisplayPatients(1); // Reset to page 1 when changing rows per page
        });
    }

    window.changePage = (page) => { if (page > 0 && page <= Math.ceil(totalPatients / rowsPerPage)) fetchAndDisplayPatients(page); };

    function selectPatient(id) {
        mainContent.classList.add('hidden');
        patientDetailContainer.classList.remove('hidden'); // <-- THIS WAS THE BUG. Changed .add() to .remove()

        if (id) {
            selectedPatient = allPatients.find(p => p.id === id);
            isEditMode = false;
        }

        renderPatientDetails();
        updateButtonState();
    }

    function renderPatientDetails() {
        if (!selectedPatient) {
            fetchAndDisplayPatients(currentPage); // Go back to list if no patient is selected
            return;
        }
        const { patient_info, guardian_info, medical_encounters } = selectedPatient;
        currentPatientName.textContent = `Viewing: ${selectedPatient.name || 'New Patient'}`;
        recordContainer.innerHTML = `<section id="patientInfo" class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"></section><section id="medicalEncounters"><h2 class="text-2xl font-bold text-gray-800 border-b pb-2 mb-6">Medical Encounters</h2><div id="consultations" class="mb-8"></div><div id="labResults" class="mb-8"></div><div id="radiologyReports"></div></section>`;
        if (patient_info) renderPatientInfo(patient_info, 'patient_info');
        if (guardian_info) renderGuardianInfo(guardian_info, 'guardian_info');
        if (medical_encounters?.consultations) renderConsultations(medical_encounters.consultations);
        if (medical_encounters?.lab_results) renderLabResults(medical_encounters.lab_results);
        if (medical_encounters?.radiology_reports) renderRadiologyReports(medical_encounters.radiology_reports);
    }

    // --- Helper Functions ---
    function createInfoItem(label, value) { return value ? `<div class="py-2"><dt class="font-medium text-gray-500">${label}</dt><dd class="text-gray-900">${value}</dd></div>` : '' }
    function createEditItem(label, value, path) { const isTextArea = ['notes', 'findings', 'treatment plan', 'impression'].includes(label.toLowerCase()); const inputType = (label.toLowerCase().includes('date')) ? 'date' : 'text'; if (isTextArea) return `<div class="py-2"><label class="font-medium text-gray-500">${label}</label><textarea data-path="${path}" class="edit-textarea">${value || ''}</textarea></div>`; return `<div class="py-2 grid grid-cols-1 sm:grid-cols-3 items-center"><label class="font-medium text-gray-500 sm:col-span-1">${label}</label><input type="${inputType}" data-path="${path}" value="${value || ''}" class="edit-input sm:col-span-2"></div>`; }
    function renderPatientInfo(info, basePath) {
        const container = document.getElementById('patientInfo');
        const fullName = [info.full_name?.first_name, info.full_name?.middle_initial, info.full_name?.last_name].filter(Boolean).join(' ');

        let content = '';

        if (isEditMode) {
            // --- EDIT MODE ---
            content = `
        <div class="detail-card">
            <div class="detail-card-header">
                <i class="fa-solid fa-user-circle text-slate-500"></i>
                Patient Demographics
            </div>
            <div class="detail-card-body">
                ${createEditItem('First Name', info.full_name?.first_name, `${basePath}.full_name.first_name`)}
                ${createEditItem('Last Name', info.full_name?.last_name, `${basePath}.full_name.last_name`)}
                ${createEditItem('Record #', info.patient_record_number, `${basePath}.patient_record_number`)}
                ${createEditItem('Date of Birth', info.date_of_birth, `${basePath}.date_of_birth`)}
                ${createEditItem('Category', info.category, `${basePath}.category`)}
                ${createEditItem('Address', info.address, `${basePath}.address`)}
            </div>
        </div>`;
        } else {
            // --- VIEW MODE ---
            content = `
        <div class="detail-card">
            <div class="detail-card-header">
                <i class="fa-solid fa-user-circle text-slate-500"></i>
                Patient Demographics
            </div>
            <div class="detail-card-body">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div><strong>Name:</strong> ${fullName}</div>
                    <div><strong>Record #:</strong> ${info.patient_record_number || 'N/A'}</div>
                    <div><strong>Date of Birth:</strong> ${info.date_of_birth || 'N/A'}</div>
                    <div><strong>Category:</strong> ${info.category || 'N/A'}</div>
                    <div class="md:col-span-2"><strong>Address:</strong> ${info.address || 'N/A'}</div>
                </div>
            </div>
        </div>`;
        }
        container.innerHTML += content;
    }
    function renderGuardianInfo(info, basePath) {
        const container = document.getElementById('patientInfo');
        const guardianName = [info.guardian_name?.rank, info.guardian_name?.first_name, info.guardian_name?.last_name].filter(Boolean).join(' ');
        let content = `
        <div class="detail-card">
            <div class="detail-card-header">
                <i class="fa-solid fa-shield-halved text-slate-500"></i>
                Guardian Information
            </div>
            <div class="detail-card-body">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div><strong>Name:</strong> ${guardianName}</div>
                    <div><strong>AFPSN:</strong> ${info.afpsn || 'N/A'}</div>
                    <div><strong>Branch of Service:</strong> ${info.branch_of_service || 'N/A'}</div>
                    <div><strong>Unit Assignment:</strong> ${info.unit_assignment || 'N/A'}</div>
                </div>
            </div>
        </div>`;
        container.innerHTML += content;
    }
    function renderConsultations(consultations) {
        const container = document.getElementById('consultations');
        if (!consultations || consultations.length === 0) return;

        let header = `<div class="flex justify-between items-center mb-4">
                      <h3 class="text-xl font-semibold text-gray-700 flex items-center gap-2">
                          <i class="fa-solid fa-stethoscope text-slate-500"></i>Consultations
                      </h3>`;
        if (isEditMode) {
            header += `<button id="addConsultationBtn" class="btn btn-secondary !py-1 !px-3 text-sm">
                       <i class="fa-solid fa-plus"></i> Add
                   </button>`;
        }
        header += `</div>`;

        let content = `<div class="space-y-4">`;

        (consultations).forEach(item => {
            // Helper to only render a section if the value exists
            const renderDetail = (label, value) => {
                if (!value) return '';
                return `<div>
                        <strong class="text-slate-600">${label}:</strong>
                        <p class="whitespace-pre-wrap">${value}</p>
                    </div>`;
            };

            content += `
            <div class="detail-card">
                <div class="detail-card-header flex justify-between items-center">
                    <span>
                        <i class="fa-solid fa-calendar-alt mr-2 text-slate-400"></i>
                        <strong>Date:</strong> ${item.consultation_date || 'N/A'}
                    </span>
                    ${item.age_at_visit ? `<span class="text-sm bg-blue-100 text-blue-800 font-medium px-2 py-0.5 rounded-full">Age: ${item.age_at_visit}</span>` : ''}
                </div>
                <div class="detail-card-body grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    ${renderDetail('Chief Complaint', item.chief_complaint)}
                    ${renderDetail('Diagnosis / Assessment', item.diagnosis)}
                    ${renderDetail('Notes / HPI', item.notes)}
                    ${renderDetail('Treatment Plan', item.treatment_plan)}
                    ${renderDetail('Attending Physician', item.attending_physician)}
                </div>
            </div>`;
        });

        content += `</div>`;
        container.innerHTML = header + content;
    }
    function renderLabResults(labs) {
        const container = document.getElementById('labResults');
        if (!labs || labs.length === 0) return;
        let content = '';
        (labs).forEach(lab => {
            content += `
        <div class="detail-card">
            <div class="detail-card-header">
                <i class="fa-solid fa-vial text-slate-500"></i>
                ${lab.test_type || 'Lab Report'} - <span class="font-normal text-base ml-1">${lab.date_performed || ''}</span>
            </div>
            <div class="detail-card-body">
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-50">
                        <tr>
                            <th class="px-4 py-2 text-left font-medium text-slate-600">Test</th>
                            <th class="px-4 py-2 text-left font-medium text-slate-600">Result</th>
                            <th class="px-4 py-2 text-left font-medium text-slate-600">Reference Range</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-200">
                        ${(lab.results || []).map(res => `
                            <tr>
                                <td class="px-4 py-2 font-medium text-slate-800">${res.test_name || ''}</td>
                                <td class="px-4 py-2">${res.value || ''} ${res.unit || ''}</td>
                                <td class="px-4 py-2 text-slate-500">${res.reference_range || ''}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
        });
        container.innerHTML = content;
    }
    function renderRadiologyReports(reports) {
        const container = document.getElementById('radiologyReports');
        if (!reports || reports.length === 0) return;
        let content = '';
        (reports).forEach(report => {
            content += `
        <div class="detail-card">
            <div class="detail-card-header">
                <i class="fa-solid fa-x-ray text-slate-500"></i>
                ${report.examination || 'Radiology Report'} - <span class="font-normal text-base ml-1">${report.date_performed || ''}</span>
            </div>
            <div class="detail-card-body">
                <div class="space-y-2">
                    <div>
                        <h4 class="font-semibold text-slate-700">Findings:</h4>
                        <p class="text-slate-600 whitespace-pre-wrap">${report.findings || 'N/A'}</p>
                    </div>
                    <div>
                        <h4 class="font-semibold text-slate-700">Impression:</h4>
                        <p class="font-medium text-slate-800 whitespace-pre-wrap">${report.impression || 'N/A'}</p>
                    </div>
                </div>
            </div>
        </div>`;
        });
        container.innerHTML = content;
    }
    function setValueByPath(obj, path, value) { const keys = path.split('.'); let current = obj; for (let i = 0; i < keys.length - 1; i++) { const key = keys[i]; if (current[key] === undefined || current[key] === null) { current[key] = !isNaN(keys[i + 1]) ? [] : {}; } current = current[key]; } current[keys[keys.length - 1]] = value; }

    // Start the application
    fetchAndDisplayPatients(1);
});