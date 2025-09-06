document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let allPatients = [];
    let selectedPatient = null;
    let isEditMode = false;
    let currentPage = 1;
    let totalPatients = 0;
    let rowsPerPage = 10;
    let selectedPatientIds = new Set();
    let sortBy = 'updated_at'; // Change from 'name'
    let sortOrder = 'DESC';   // Change from 'ASC'
    let filterCategory = '';

    // --- DOM Elements ---
    const patientListContainer = document.getElementById('patientListContainer');
    const recordContainer = document.getElementById('recordContainer');
    const controlsContainer = document.getElementById('controlsContainer');
    const currentPatientName = document.getElementById('currentPatientName');
    const newPatientBtn = document.getElementById('newPatientBtn');
    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');
    const saveIcon = document.getElementById('saveIcon');
    const saveBtnText = document.getElementById('saveBtnText');
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
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const deleteSelectedCount = document.getElementById('deleteSelectedCount');
    const searchInput = document.getElementById('searchInput');
    const sortOrderBtn = document.getElementById('sortOrderBtn');
    const sortOrderIcon = document.getElementById('sortOrderIcon');
    const sortDropdownBtn = document.getElementById('sortDropdownBtn');
    const sortByText = document.getElementById('sortByText');
    const sortDropdownMenu = document.getElementById('sortDropdownMenu');
    const listControls = document.getElementById('listControls');
    const categoryFilterBtn = document.getElementById('categoryFilterBtn');
    const categoryFilterText = document.getElementById('categoryFilterText');
    const categoryFilterMenu = document.getElementById('categoryFilterMenu');
    const dashboardContainer = document.getElementById('dashboardContainer');
    const dashboardTabs = document.getElementById('dashboardTabs');
    const dashboardStatsContainer = document.getElementById('dashboardStatsContainer');

    // --- API Functions ---
    const API = {
        async getPatients(page, limit) {
            const searchTerm = searchInput.value.trim();
            const searchQuery = searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : '';
            const sortQuery = `&sortBy=${sortBy}&sortOrder=${sortOrder}`;
            // Add the filter query
            const filterQuery = filterCategory ? `&category=${encodeURIComponent(filterCategory)}` : '';

            const r = await fetch(`/api/patients?page=${page}&limit=${limit}${searchQuery}${sortQuery}${filterQuery}`);
            if (!r.ok) throw new Error('Failed to fetch patients');
            return r.json();
        },
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
        async processPdf(formData) { const r = await fetch('/api/extraction/upload', { method: 'POST', body: formData }); if (!r.ok) { const e = await r.json(); throw new Error(e.message || 'Failed to process PDF'); } return r.json(); },
        async getStats() { const r = await fetch('/api/patients/stats'); if (!r.ok) throw new Error('Failed to fetch stats'); return r.json(); }
    };

    // --- Initialization & Data Fetching ---
    async function fetchAndDisplayPatients(page = 1) {
        history.pushState({ view: 'list', page: page }, '');

        mainContent.classList.remove('hidden');
        patientDetailContainer.classList.add('hidden');
        listControls.classList.remove('hidden');

        dashboardStatsContainer.classList.remove('hidden');
        try {
            const { data, total } = await API.getPatients(page, rowsPerPage);
            allPatients = data; totalPatients = total; currentPage = page;
            renderPatientList();
            populateCategoryFilter();
            fetchAndRenderDashboardStats(); // Refresh stats with the list
        } catch (error) {
            console.error("Error fetching patients:", error);
            patientListContainer.innerHTML = `<p class="text-red-500 text-center py-8">Error loading patient data.</p>`;
        }
    }

    async function fetchAndRenderDashboardStats() {
        try {
            const stats = await API.getStats();

            // Populate Overview Panel
            const overviewContainer = document.getElementById('overviewStats');
            overviewContainer.innerHTML = `
            <div><p class="text-sm text-slate-500">Total Patients</p><p class="text-2xl font-bold">${stats.totalPatients}</p></div>
            <div><p class="text-sm text-slate-500">Updated Today</p><p class="text-2xl font-bold">${stats.recentlyUpdated}</p></div>
            <div><p class="text-sm text-slate-500">Average Age</p><p class="text-2xl font-bold">${stats.averageAge}</p></div>
            `;

            // Populate Diagnoses Panel
            const diagnosesList = document.getElementById('topDiagnosesList');
            diagnosesList.innerHTML = stats.topDiagnoses.map(d =>
                `<li class="flex justify-between items-center"><span class="font-medium">${d.diagnosis}</span><span class="text-sm text-slate-500">${d.count} cases</span></li>`
            ).join('') || '<li>No diagnosis data available.</li>';

            const categoriesList = document.getElementById('categoriesList');
            categoriesList.innerHTML = stats.categories.map(c =>
                `<li class="flex justify-between items-center"><span class="font-medium">${c.category || 'Uncategorized'}</span><span class="text-sm text-slate-500">${c.count} cases</span></li>`
            ).join('') || '<li>No category data available.</li>';

        } catch (error) {
            console.error("Could not fetch dashboard stats:", error);
        }
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
    patientListContainer.addEventListener('change', handleCheckboxChange);
    deleteSelectedBtn.addEventListener('click', handleDeleteSelected);
    let debounceTimer;
    searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            fetchAndDisplayPatients(1); // Fetch from page 1 with the new search term
        }, 300); // Wait for 300ms of inactivity before searching
    });
    sortOrderBtn.addEventListener('click', handleSortOrderToggle);
    sortDropdownBtn.addEventListener('click', () => sortDropdownMenu.classList.toggle('hidden'));
    sortDropdownMenu.addEventListener('click', handleSortByChange);
    window.addEventListener('click', (e) => {
        if (!sortDropdownBtn.contains(e.target)) {
            sortDropdownMenu.classList.add('hidden');
        }
    });
    categoryFilterBtn.addEventListener('click', () => categoryFilterMenu.classList.toggle('hidden'));
    categoryFilterMenu.addEventListener('click', handleFilterChange);
    window.addEventListener('click', (e) => {
        if (!sortDropdownBtn.contains(e.target)) {
            sortDropdownMenu.classList.add('hidden');
        }
        // Add this new condition to hide the category menu as well
        if (!categoryFilterBtn.contains(e.target)) {
            categoryFilterMenu.classList.add('hidden');
        }
    });
    dashboardTabs.addEventListener('click', (e) => {
        if (e.target.matches('.dashboard-tab')) {
            // Remove active class from all tabs
            dashboardTabs.querySelectorAll('.dashboard-tab').forEach(tab => tab.classList.remove('active'));
            // Add active class to clicked tab
            e.target.classList.add('active');

            // Hide all panels
            document.querySelectorAll('.dashboard-panel').forEach(panel => panel.classList.add('hidden'));

            // Show the correct panel
            const tabId = e.target.dataset.tab;
            document.getElementById(`${tabId}Panel`).classList.remove('hidden');
        }
    });
    window.addEventListener('popstate', (event) => {
        if (event.state) {
            if (event.state.view === 'list') {
                // If the state is for the list view, show it
                fetchAndDisplayPatients(event.state.page || 1);
            } else if (event.state.view === 'detail') {
                // If the state is for a detail view, find and show the patient
                // This requires the patient to be in the `allPatients` array
                if (allPatients.some(p => p.id === event.state.patientId)) {
                    selectPatient(event.state.patientId);
                } else {
                    // Fallback if the patient isn't in the current list
                    fetchAndDisplayPatients(1);
                }
            }
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
        } catch (error) {
            alert(`Error processing PDF: ${error.message}`);
        } finally {
            loadingOverlay.classList.add('hidden');
            pdfFileInput.value = '';
        }
    }

    async function handleSaveChanges() {
        try {
            // --- UPDATE LOGIC ---
            if (selectedPatient.id) {
                const updatedData = {};
                document.querySelectorAll('[data-path]').forEach(input => {
                    const path = input.dataset.path;
                    let value = input.value;
                    if (input.type === 'number' && value) {
                        value = parseFloat(value);
                    } else if (value && !value.trim()) { // Handle empty strings
                        value = null;
                    }
                    setValueByPath(updatedData, path, value);
                });

                const savedPatient = await API.updatePatient(selectedPatient.id, updatedData);

                // Update the patient in our local array
                const index = allPatients.findIndex(p => p.id === savedPatient.id);
                if (index !== -1) {
                    allPatients[index] = savedPatient;
                }

                // Simply select the patient again to refresh the view correctly.
                // DO NOT call renderPatientList() here.
                selectPatient(savedPatient.id);

                // --- CREATE LOGIC ---
            } else {
                const newPatientData = JSON.parse(JSON.stringify(selectedPatient));
                document.querySelectorAll('[data-path]').forEach(input => {
                    const path = input.dataset.path;
                    let value = input.value;
                    if (input.type === 'number' && value) {
                        value = parseFloat(value);
                    } else if (value && !value.trim()) {
                        value = null;
                    }
                    setValueByPath(newPatientData, path, value);
                });

                const savedPatient = await API.createPatient(newPatientData);

                // Add the new patient to our local array and refresh the list
                allPatients.push(savedPatient);
                renderPatientList();
                selectPatient(savedPatient.id);
            }
        } catch (error) {
            console.error('Failed to save patient:', error);

            let detailedError = 'Could not save patient data.';
            if (error.response) {
                try {
                    const responseBody = await error.response.json();
                    if (responseBody.message) {
                        detailedError = Array.isArray(responseBody.message) ? responseBody.message.join(', ') : responseBody.message;
                    }
                } catch (e) { /* Fallback */ }
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
    function handleCheckboxChange(e) {
        const target = e.target;
        const patientCheckboxes = document.querySelectorAll('.patient-checkbox');
        const selectAllCheckbox = document.getElementById('selectAllCheckbox');

        if (target.id === 'selectAllCheckbox') {
            patientCheckboxes.forEach(checkbox => {
                checkbox.checked = target.checked;
                const id = parseInt(checkbox.dataset.id, 10);
                if (target.checked) {
                    selectedPatientIds.add(id);
                } else {
                    selectedPatientIds.delete(id);
                }
            });
        }

        if (target.classList.contains('patient-checkbox')) {
            const id = parseInt(target.dataset.id, 10);
            if (target.checked) {
                selectedPatientIds.add(id);
            } else {
                selectedPatientIds.delete(id);
            }
            // Update "Select All" checkbox state
            selectAllCheckbox.checked = patientCheckboxes.length === selectedPatientIds.size;
        }

        updateBulkActionUI();
    }

    async function handleDeleteSelected() {
        const selectedCount = selectedPatientIds.size;
        if (selectedCount === 0) return;

        if (confirm(`Are you sure you want to delete ${selectedCount} patient record(s)? This cannot be undone.`)) {
            try {
                // Create an array of delete promises
                const deletePromises = Array.from(selectedPatientIds).map(id => API.deletePatient(id));
                // Wait for all delete operations to complete
                await Promise.all(deletePromises);

                // Reset state and refresh the view
                selectedPatientIds.clear();
                updateBulkActionUI();
                await fetchAndDisplayPatients(1); // Go back to the first page

            } catch (error) {
                console.error('Failed to delete selected patients:', error);
                alert('An error occurred while deleting patient records.');
            }
        }
    }

    function handleSortOrderToggle() {
        sortOrder = sortOrder === 'ASC' ? 'DESC' : 'ASC';
        updateSortUI();
        fetchAndDisplayPatients(1);
    }

    function handleSortByChange(e) {
        e.preventDefault();
        const target = e.target.closest('.dropdown-item');
        if (!target) return;

        sortBy = target.dataset.sort;
        updateSortUI();
        fetchAndDisplayPatients(1);
        sortDropdownMenu.classList.add('hidden'); // Hide menu after selection
    }

    function handleFilterChange(e) {
        e.preventDefault();
        const target = e.target.closest('.dropdown-item');
        if (!target) return;

        filterCategory = target.dataset.value;
        categoryFilterText.textContent = target.textContent;
        categoryFilterMenu.classList.add('hidden');
        fetchAndDisplayPatients(1);
    }

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

            // This logic correctly sets the text and icon based on context
            if (selectedPatient.id) {
                saveBtnText.textContent = 'Save Changes';
                saveIcon.className = 'fa-solid fa-check'; // Check icon for saving
            } else {
                saveBtnText.textContent = 'Create Patient';
                saveIcon.className = 'fa-solid fa-plus'; // Plus icon for creating
            }
        } else {
            editBtnText.textContent = 'Edit Data';
            editIcon.classList.remove('hidden');
            cancelIcon.classList.add('hidden');
            editBtn.classList.replace('btn-secondary', 'btn-primary');
            saveBtn.classList.add('hidden');
            deleteBtn.classList.remove('hidden');
        }
    }

    function updateBulkActionUI() {
        const selectedCount = selectedPatientIds.size;
        if (selectedCount > 0) {
            deleteSelectedBtn.classList.remove('hidden');
            deleteSelectedCount.textContent = `Delete Selected (${selectedCount})`;
        } else {
            deleteSelectedBtn.classList.add('hidden');
        }
    }

    function updateSortUI() {
        // Update the sort direction icon
        sortOrderIcon.className = sortOrder === 'ASC' ? 'fa-solid fa-arrow-up-long' : 'fa-solid fa-arrow-down-long';

        // Update the sort by button text
        const selectedOption = document.querySelector(`.dropdown-item[data-sort="${sortBy}"]`);
        if (selectedOption) {
            sortByText.textContent = selectedOption.textContent;
        }
    }

    // Don't forget to call this once on startup
    updateSortUI();

    function renderPatientList() {
        mainContent.classList.remove('hidden');
        patientDetailContainer.classList.add('hidden');
        recordCount.textContent = `${totalPatients} Records`;
        patientListContainer.innerHTML = '';

        const paginationContainer = document.getElementById('paginationContainer');
        if (allPatients.length === 0) {
            patientListContainer.innerHTML = `<p class="text-gray-500 py-8 text-center">No patients found.</p>`;
            paginationContainer.classList.add('hidden');
            return;
        }
        paginationContainer.classList.remove('hidden');

        const table = document.createElement('table');
        table.className = 'min-w-full';

        table.innerHTML = `
        <thead>
            <tr>
                <th class="w-12 align-middle"><input type="checkbox" id="selectAllCheckbox" class="block h-4 w-4 rounded border-gray-300"></th>
                <th>Patient Name</th>
                <th>Record #</th>
                <th>Final Diagnosis</th>
                <th>Category</th>
            </tr>
        </thead>
        <tbody class="bg-white"></tbody>`;

        const tbody = table.querySelector('tbody');

        allPatients.forEach(patient => {
            const tr = document.createElement('tr');
            // Add a class and data-id to the row checkbox
            tr.innerHTML = `
            <td><input type="checkbox" class="patient-checkbox h-4 w-4 rounded border-gray-300" data-id="${patient.id}"></td>
            <td>${patient.name || 'N/A'}</td>
            <td>${patient.patient_info?.patient_record_number || 'N/A'}</td>
            <td class="truncate-cell">${patient.summary?.final_diagnosis || 'N/A'}</td>
            <td>${patient.patient_info?.category || 'N/A'}</td>`;
            // Add event listener to the row itself for navigation
            tr.addEventListener('click', (e) => {
                // Only navigate if the user didn't click the checkbox
                if (e.target.type !== 'checkbox') {
                    selectPatient(patient.id);
                }
            });
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
        if (id) {
            history.pushState({ view: 'detail', patientId: id }, '');
        }

        mainContent.classList.add('hidden');
        patientDetailContainer.classList.remove('hidden');
        listControls.classList.add('hidden');

        dashboardStatsContainer.classList.add('hidden');

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
        const { patient_info, guardian_info, medical_encounters, summary } = selectedPatient;
        currentPatientName.textContent = `Viewing: ${selectedPatient.name || 'New Patient'}`;

        renderDashboard(summary);

        recordContainer.innerHTML = `<section id="patientInfo" class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"></section><section id="medicalEncounters"><h2 class="text-2xl font-bold text-gray-800 border-b pb-2 mb-6">Medical Encounters</h2><div id="consultations" class="mb-8"></div><div id="labResults" class="mb-8"></div><div id="radiologyReports"></div></section>`;

        if (patient_info) renderPatientInfo(patient_info, 'patient_info');
        if (guardian_info) renderGuardianInfo(guardian_info, 'guardian_info');
        if (medical_encounters?.consultations) renderConsultations(medical_encounters.consultations);
        if (medical_encounters?.lab_results) renderLabResults(medical_encounters.lab_results);
        if (medical_encounters?.radiology_reports) renderRadiologyReports(medical_encounters.radiology_reports);
    }

    function renderDashboard(summary) {
        dashboardContainer.innerHTML = '';
        if (!summary) return;

        // A helper function to create either a view or an edit card
        const createCard = (icon, title, content, path) => {
            let bodyContent;

            if (isEditMode) {
                // In Edit Mode, use the existing createEditItem helper
                // We use a simplified version for the dashboard cards
                const isTextArea = ['key_findings', 'primary_complaint'].includes(path.split('.')[1]);
                if (isTextArea) {
                    bodyContent = `<textarea data-path="${path}" class="edit-textarea !min-h-[60px]">${Array.isArray(content) ? content.join(', ') : (content || '')}</textarea>`;
                } else {
                    bodyContent = `<input type="text" data-path="${path}" value="${Array.isArray(content) ? content.join(', ') : (content || '')}" class="edit-input">`;
                }
            } else {
                // In View Mode, display the content as before
                if (!content || (Array.isArray(content) && content.length === 0)) {
                    bodyContent = '<p class="text-slate-400">N/A</p>';
                } else if (Array.isArray(content)) {
                    bodyContent = `<ul>${content.map(item => `<li>${item}</li>`).join('')}</ul>`;
                } else {
                    bodyContent = `<p>${content}</p>`;
                }
            }

            return `
            <div class="dashboard-card">
                <div class="dashboard-card-header">
                    <i class="fa-solid ${icon} text-slate-500"></i>
                    <span>${title}</span>
                </div>
                <div class="dashboard-card-body">${bodyContent}</div>
            </div>
        `;
        };

        dashboardContainer.innerHTML += createCard('fa-flag-checkered', 'Final Diagnosis', summary.final_diagnosis, 'summary.final_diagnosis');
        dashboardContainer.innerHTML += createCard('fa-user-doctor', 'Primary Complaint', summary.primary_complaint, 'summary.primary_complaint');
        dashboardContainer.innerHTML += createCard('fa-magnifying-glass-plus', 'Key Findings', summary.key_findings, 'summary.key_findings');
        dashboardContainer.innerHTML += createCard('fa-pills', 'Current Medications', summary.current_medications, 'summary.current_medications');
        dashboardContainer.innerHTML += createCard('fa-allergies', 'Allergies', summary.allergies, 'summary.allergies');
    }

    // --- Helper Functions ---
    function createInfoItem(label, value) { return value ? `<div class="py-2"><dt class="font-medium text-gray-500">${label}</dt><dd class="text-gray-900">${value}</dd></div>` : '' }
    function createEditItem(label, value, path) {
        const isTextArea = ['notes', 'findings', 'treatment plan', 'impression'].includes(label.toLowerCase());
        // --- START: MODIFIED INPUT TYPE LOGIC ---
        let inputType = 'text';
        if (label.toLowerCase().includes('date')) {
            inputType = 'date';
        } else if (label.toLowerCase() === 'age') {
            inputType = 'number';
        }
        // --- END: MODIFIED INPUT TYPE LOGIC ---

        if (isTextArea) return `<div class="py-2"><label class="font-medium text-gray-500">${label}</label><textarea data-path="${path}" class="edit-textarea">${value || ''}</textarea></div>`;

        return `<div class="py-2 grid grid-cols-1 sm:grid-cols-3 items-center"><label class="font-medium text-gray-500 sm:col-span-1">${label}</label><input type="${inputType}" data-path="${path}" value="${value || ''}" class="edit-input sm:col-span-2"></div>`;
    }
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
                    ${createEditItem('Middle Initial', info.full_name?.middle_initial, `${basePath}.full_name.middle_initial`)}
                    ${createEditItem('Last Name', info.full_name?.last_name, `${basePath}.full_name.last_name`)}
                    ${createEditItem('Record #', info.patient_record_number, `${basePath}.patient_record_number`)}
                    ${createEditItem('Date of Birth', info.date_of_birth, `${basePath}.date_of_birth`)}
                    ${createEditItem('Age', info.age, `${basePath}.age`)} 
                    ${createEditItem('Category', info.category, `${basePath}.category`)}
                    ${createEditItem('Address', info.address, `${basePath}.address`)}
                </div>
            </div>`;
        } else {
            // --- VIEW MODE (No changes needed here) ---
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
                        <div><strong>Age:</strong> ${info.age || 'N/A'}</div>
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
        const guardianName = [info.guardian_name?.rank, info.guardian_name?.first_name, info.guardian_name?.middle_initial, info.guardian_name?.last_name].filter(Boolean).join(' ');

        let content = '';

        if (isEditMode) {
            // --- EDIT MODE ---
            content = `
        <div class="detail-card">
            <div class="detail-card-header">
                <i class="fa-solid fa-shield-halved text-slate-500"></i>
                Guardian Information
            </div>
            <div class="detail-card-body">
                ${createEditItem('Rank', info.guardian_name?.rank, `${basePath}.guardian_name.rank`)}
                ${createEditItem('First Name', info.guardian_name?.first_name, `${basePath}.guardian_name.first_name`)}
                ${createEditItem('Middle Initial', info.guardian_name?.middle_initial, `${basePath}.guardian_name.middle_initial`)}
                ${createEditItem('Last Name', info.guardian_name?.last_name, `${basePath}.guardian_name.last_name`)}
                ${createEditItem('AFPSN', info.afpsn, `${basePath}.afpsn`)}
                ${createEditItem('Branch of Service', info.branch_of_service, `${basePath}.branch_of_service`)}
                ${createEditItem('Unit Assignment', info.unit_assignment, `${basePath}.unit_assignment`)}
            </div>
        </div>`;
        } else {
            // --- VIEW MODE (No changes needed here) ---
            content = `
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
        }
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

        consultations.forEach((item, index) => {
            const basePath = `medical_encounters.consultations.${index}`;
            const vitals = item.vitals || {};

            content += `<div class="detail-card">
            <div class="detail-card-header flex justify-between items-center">
                <span>
                    <i class="fa-solid fa-calendar-alt mr-2 text-slate-400"></i>
                    <strong>Date:</strong> ${isEditMode ? `<input type="date" data-path="${basePath}.consultation_date" value="${item.consultation_date || ''}" class="edit-input w-40 ml-2">` : (item.consultation_date || 'N/A')}
                </span>
                ${item.age_at_visit ? `<span class="text-sm bg-blue-100 text-blue-800 font-medium px-2 py-0.5 rounded-full">Age: ${item.age_at_visit}</span>` : ''}
            </div>
            <div class="detail-card-body">`;

            if (isEditMode) {
                content += `
                ${createEditItem("Chief Complaint", item.chief_complaint, `${basePath}.chief_complaint`)}
                ${createEditItem("Diagnosis", item.diagnosis, `${basePath}.diagnosis`)}
                ${createEditItem("Notes", item.notes, `${basePath}.notes`)}
                ${createEditItem("Treatment Plan", item.treatment_plan, `${basePath}.treatment_plan`)}
                ${createEditItem("Attending Physician", item.attending_physician, `${basePath}.attending_physician`)}
            `;
            } else {
                const renderDetail = (label, value) => value ? `<div><strong class="text-slate-600">${label}:</strong><p class="whitespace-pre-wrap">${value}</p></div>` : '';
                content += `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                    ${renderDetail('Chief Complaint', item.chief_complaint)}
                    ${renderDetail('Diagnosis / Assessment', item.diagnosis)}
                    ${renderDetail('Notes / HPI', item.notes)}
                    ${renderDetail('Treatment Plan', item.treatment_plan)}
                    ${renderDetail('Attending Physician', item.attending_physician)}
                </div>`;
            }

            content += `</div></div>`;
        });

        content += `</div>`;
        container.innerHTML = header + content;
    }
    function renderLabResults(labs) {
        const container = document.getElementById('labResults');
        if (!labs || labs.length === 0) return;

        let content = '<h3 class="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2"><i class="fa-solid fa-vial text-slate-500"></i>Laboratory Results</h3><div class="space-y-6">';

        (labs || []).forEach((lab, index) => {
            const basePath = `medical_encounters.lab_results.${index}`;
            content += `<div class="detail-card">
            <div class="detail-card-header flex justify-between items-center">
                <h4 class="text-lg font-semibold text-green-600">${lab.test_type || 'Lab Report'}</h4>
                <span class="text-sm font-medium text-gray-500">${lab.date_performed || 'N/A'}</span>
            </div>
            <div class="detail-card-body">`;

            if (isEditMode) {
                content += `
                <table class="min-w-full text-sm">
                    <thead class="bg-slate-50">
                        <tr>
                            <th class="px-4 py-2 text-left font-medium text-slate-600">Test</th>
                            <th class="px-4 py-2 text-left font-medium text-slate-600">Result</th>
                            <th class="px-4 py-2 text-left font-medium text-slate-600">Reference Range</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(lab.results || []).map((res, resultIndex) => {
                    const resultBasePath = `${basePath}.results.${resultIndex}`;
                    return `<tr>
                                <td class="px-2 py-1"><input type="text" class="edit-input" data-path="${resultBasePath}.test_name" value="${res.test_name || ''}"></td>
                                <td class="px-2 py-1"><input type="text" class="edit-input" data-path="${resultBasePath}.value" value="${res.value || ''} ${res.unit || ''}"></td>
                                <td class="px-2 py-1"><input type="text" class="edit-input" data-path="${resultBasePath}.reference_range" value="${res.reference_range || ''}"></td>
                            </tr>`;
                }).join('')}
                    </tbody>
                </table>
            `;
            } else {
                content += `
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
                </table>`;
            }
            content += '</div></div>';
        });
        content += `</div>`;
        container.innerHTML = content;
    }
    function renderRadiologyReports(reports) {
        const container = document.getElementById('radiologyReports');
        if (!reports || reports.length === 0) return;

        let content = '';

        (reports || []).forEach((report, index) => {
            const basePath = `medical_encounters.radiology_reports.${index}`;
            content += `<div class="detail-card">
            <div class="detail-card-header">
                <i class="fa-solid fa-x-ray text-slate-500"></i>
                ${report.examination || 'Radiology Report'} - <span class="font-normal text-base ml-1">${report.date_performed || ''}</span>
            </div>
            <div class="detail-card-body">`;

            if (isEditMode) {
                content += `
                ${createEditItem("Findings", report.findings, `${basePath}.findings`)}
                ${createEditItem("Impression", report.impression, `${basePath}.impression`)}
            `;
            } else {
                content += `
                <div class="space-y-2">
                    <div>
                        <h4 class="font-semibold text-slate-700">Findings:</h4>
                        <p class="text-slate-600 whitespace-pre-wrap">${report.findings || 'N/A'}</p>
                    </div>
                    <div>
                        <h4 class="font-semibold text-slate-700">Impression:</h4>
                        <p class="font-medium text-slate-800 whitespace-pre-wrap">${report.impression || 'N/A'}</p>
                    </div>
                </div>`;
            }
            content += '</div></div>';
        });
        container.innerHTML = content;
    }
    function setValueByPath(obj, path, value) { const keys = path.split('.'); let current = obj; for (let i = 0; i < keys.length - 1; i++) { const key = keys[i]; if (current[key] === undefined || current[key] === null) { current[key] = !isNaN(keys[i + 1]) ? [] : {}; } current = current[key]; } current[keys[keys.length - 1]] = value; }

    function populateCategoryFilter() {
        // This uses the "reverted" method of getting categories from the current list.
        const categories = [...new Set(allPatients
            .map(p => p.patient_info?.category)
            .filter(Boolean)
        )];

        // Clear existing options and add the "All" option first
        categoryFilterMenu.innerHTML = '<a href="#" class="dropdown-item" data-value="">All Categories</a>';

        // Add an item for each unique category
        categories.forEach(category => {
            const item = document.createElement('a');
            item.href = '#';
            item.className = 'dropdown-item';
            item.dataset.value = category;
            item.textContent = category;
            categoryFilterMenu.appendChild(item);
        });
    }

    // Start the application
    fetchAndDisplayPatients(1);
    fetchAndRenderDashboardStats();
});