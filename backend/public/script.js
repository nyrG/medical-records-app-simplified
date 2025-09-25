document.addEventListener('DOMContentLoaded', () => {
    // --- State Variables ---
    let allPatients = [];
    let selectedPatient = null;
    let isEditMode = false;
    let currentPage = 1;
    let totalPatients = 0;
    let rowsPerPage = 10;
    let selectedPatientIds = new Set();
    let sortBy = 'updated_at';
    let sortOrder = 'DESC';
    let filterCategory = '';
    let modalCurrentStep = 1;
    const modalTotalSteps = 3; // Corrected total steps
    let cancelInterval = null;

    // --- DOM Elements ---
    const patientListContainer = document.getElementById('patientListContainer');
    const newPatientBtn = document.getElementById('newPatientBtn');
    const uploadModal = document.getElementById('uploadModal');
    const pdfFileInput = document.getElementById('pdfFile');
    const fileError = document.getElementById('fileError');
    const dropZone = document.getElementById('dropZone');
    const browseBtn = document.getElementById('browseBtn');
    const uploadPrompt = document.getElementById('uploadPrompt');
    const filePreview = document.getElementById('filePreview');
    const previewFileName = document.getElementById('previewFileName');
    const previewFileSize = document.getElementById('previewFileSize');
    const removeFileBtn = document.getElementById('removeFileBtn');
    const mainContent = document.querySelector('.main-content');
    const patientDetailContainer = document.getElementById('patientDetailContainer');
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
    const dashboardTabs = document.getElementById('dashboardTabs');
    const dashboardStatsContainer = document.getElementById('dashboardStatsContainer');
    const primaryBtn = document.getElementById('primaryBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const stepItems = document.querySelectorAll('.step-item');
    const backBtn = document.getElementById('backBtn');

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
    newPatientBtn.addEventListener('click', () => {
        modalCurrentStep = 1;
        updateModalUI();
        uploadModal.classList.remove('hidden');
        uploadModal.classList.add('modal-entering');
        uploadModal.classList.remove('modal-exiting');
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
    categoryFilterBtn.addEventListener('click', () => categoryFilterMenu.classList.toggle('hidden'));
    categoryFilterMenu.addEventListener('click', handleFilterChange);
    window.addEventListener('click', (e) => {
        if (!sortDropdownBtn.contains(e.target)) {
            sortDropdownMenu.classList.add('hidden');
        }
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
    patientDetailContainer.addEventListener('click', function (e) {
        const actionButton = e.target.closest('#actionButtons button');
        if (actionButton) {
            switch (actionButton.id) {
                case 'backToListBtn':
                    fetchAndDisplayPatients(currentPage);
                    return;
                case 'editBtn':
                    toggleEditMode();
                    return;
                case 'saveBtn':
                    handleSaveChanges();
                    return;
                case 'deleteBtn':
                    handleDeletePatient();
                    return;
            }
        }

        const activeTabId = document.querySelector('#detailTabs .dashboard-tab.active')?.dataset.tab || 'summary';

        // --- Handle Add Buttons ---
        const addBtn = e.target.closest('button[id^="add"]');
        if (isEditMode && addBtn) {
            if (!selectedPatient.medical_encounters) selectedPatient.medical_encounters = {};
            const addBtnId = addBtn.id;

            if (addBtnId === 'addConsultationBtn') {
                if (!selectedPatient.medical_encounters.consultations) selectedPatient.medical_encounters.consultations = [];
                selectedPatient.medical_encounters.consultations.push({ vitals: {} });
            } else if (addBtnId === 'addLabResultBtn') {
                if (!selectedPatient.medical_encounters.lab_results) selectedPatient.medical_encounters.lab_results = [];
                selectedPatient.medical_encounters.lab_results.push({ results: [] });
            } else if (addBtnId === 'addRadiologyReportBtn') {
                if (!selectedPatient.medical_encounters.radiology_reports) selectedPatient.medical_encounters.radiology_reports = [];
                selectedPatient.medical_encounters.radiology_reports.push({});
            }

            renderPatientDetails();
            setActiveTab(activeTabId);
        }

        // --- Handle Delete Buttons ---
        const deleteBtn = e.target.closest('.delete-btn-dynamic');
        if (isEditMode && deleteBtn) {
            const index = parseInt(deleteBtn.dataset.index, 10);
            const type = deleteBtn.dataset.type;

            if (!isNaN(index) && selectedPatient.medical_encounters) {
                if (type === 'consultation' && selectedPatient.medical_encounters.consultations) {
                    selectedPatient.medical_encounters.consultations.splice(index, 1);
                } else if (type === 'lab' && selectedPatient.medical_encounters.lab_results) {
                    selectedPatient.medical_encounters.lab_results.splice(index, 1);
                } else if (type === 'radiology' && selectedPatient.medical_encounters.radiology_reports) {
                    selectedPatient.medical_encounters.radiology_reports.splice(index, 1);
                }
                renderPatientDetails();
                setActiveTab(activeTabId);
            }
        }

        // --- Handle Quick Access Toggles ---
        const quickAccessToggle = e.target.closest('button[id^="quickAccessToggle"]');
        if (quickAccessToggle) {
            const wrapper = quickAccessToggle.nextElementSibling; // The content div is the next sibling
            const chevron = quickAccessToggle.querySelector('.quick-access-chevron');
            if (wrapper) {
                wrapper.classList.toggle('hidden');
                chevron.classList.toggle('rotate-180');
            }
        }

        // --- Handle Scrolling Logic ---
        const quickLink = e.target.closest('a.quick-link-chip');
        if (quickLink) {
            e.preventDefault();
            const targetId = quickLink.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            const scrollContainer = targetElement.closest('.tab-panel').parentElement;

            if (targetElement && scrollContainer) {
                const topPos = targetElement.offsetTop - scrollContainer.offsetTop;
                scrollContainer.scrollTo({ top: topPos, behavior: 'smooth' });
            }
        }

        const scrollTopBtn = e.target.closest('.scroll-to-top-fab');
        if (scrollTopBtn) {
            const panelId = scrollTopBtn.dataset.targetPanel;
            const scrollContainer = document.getElementById(panelId)?.parentElement;
            if (scrollContainer) {
                scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
        // END: New Scroll Logic

        // --- Handle Clear Sponsor Button ---
        if (isEditMode && e.target.closest('#clearSponsorBtn')) {
            const sponsorPanel = document.getElementById('sponsorPanel');
            if (sponsorPanel) {
                sponsorPanel.querySelectorAll('input, textarea').forEach(input => {
                    input.value = '';
                });
            }
        }
    });

    primaryBtn.addEventListener('click', () => {
        if (modalCurrentStep === 1) { // Move from Upload to Configure
            const file = pdfFileInput.files[0];
            if (!file) {
                fileError.textContent = 'Please select a file before proceeding.';
                return;
            }
            fileError.textContent = '';
            modalCurrentStep++;
            updateModalUI();
            handlePdfUploadAndProcess();
        } else if (modalCurrentStep === modalTotalSteps) { // From Review to finish
            uploadModal.classList.add('hidden');
            selectPatient(null);
            clearFile();
        }
    });

    cancelBtn.addEventListener('click', () => {
        // Stop the interval if cancel is clicked during processing
        if (cancelInterval) {
            clearInterval(cancelInterval);
            cancelInterval = null;
        }

        uploadModal.classList.add('modal-exiting');
        uploadModal.classList.remove('modal-entering');

        setTimeout(() => {
            uploadModal.classList.add('hidden');
            clearFile();
            modalCurrentStep = 1;
            updateModalUI();
        }, 200);
    });

    backBtn.addEventListener('click', () => {
        if (modalCurrentStep > 1) {
            modalCurrentStep--;
            updateModalUI();
        }
    });

    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const clearFile = () => {
        pdfFileInput.value = ''; // This is the crucial part that clears the file
        filePreview.classList.add('hidden');
        uploadPrompt.classList.remove('hidden');
        fileError.textContent = '';
    };

    const handleFile = (file) => {
        fileError.textContent = '';
        if (file && file.type === 'application/pdf') {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            pdfFileInput.files = dataTransfer.files;

            previewFileName.textContent = file.name;
            previewFileSize.textContent = formatBytes(file.size);

            uploadPrompt.classList.add('hidden');
            filePreview.classList.remove('hidden');
        } else {
            clearFile();
            fileError.textContent = 'Invalid file. Please select a PDF.';
        }
    };

    browseBtn.addEventListener('click', () => pdfFileInput.click());
    removeFileBtn.addEventListener('click', clearFile);

    pdfFileInput.addEventListener('change', () => {
        if (pdfFileInput.files.length > 0) handleFile(pdfFileInput.files[0]);
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-blue-500', 'bg-blue-50');
    });

    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-blue-500', 'bg-blue-50');
        if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
    });

    document.getElementById('homeLink').addEventListener('click', (e) => {
        e.preventDefault();
        fetchAndDisplayPatients(1);
    });

    const updateModalUI = () => {
        // Clear any existing timer when the UI updates
        if (cancelInterval) {
            clearInterval(cancelInterval);
            cancelInterval = null;
        }

        stepItems.forEach(item => {
            const step = parseInt(item.dataset.step, 10);
            const circle = item.querySelector('.step-circle');
            item.classList.remove('active', 'completed');

            if (step < modalCurrentStep) {
                item.classList.add('completed');
                circle.innerHTML = `<i class="fa-solid fa-check text-sm"></i>`;
            } else if (step === modalCurrentStep) {
                item.classList.add('active');
                circle.textContent = step;
            } else {
                circle.textContent = step;
            }
        });

        // Update content panels
        document.querySelectorAll('.modal-step').forEach(panel => panel.classList.remove('active'));
        const activePanel = document.getElementById(`step-${modalCurrentStep}`);
        if (activePanel) activePanel.classList.add('active');

        // --- MODIFIED: Button State Logic ---
        primaryBtn.disabled = false;
        primaryBtn.classList.remove('bg-slate-400', 'cursor-not-allowed');
        primaryBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');

        backBtn.classList.add('hidden'); // Back button is not used in this flow
        cancelBtn.classList.toggle('hidden', modalCurrentStep === 3);

        // Default state for cancel button - revert to original style
        cancelBtn.disabled = false;
        cancelBtn.textContent = 'Cancel'; // Reset text
        cancelBtn.classList.remove('bg-slate-300', 'text-slate-500', 'cursor-not-allowed');
        cancelBtn.classList.add('bg-slate-200', 'hover:bg-slate-300');

        switch (modalCurrentStep) {
            case 1:
                primaryBtn.textContent = 'Upload & Process';
                break;
            case 2:
                primaryBtn.textContent = 'Processing...';
                primaryBtn.disabled = true;
                primaryBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                primaryBtn.classList.add('bg-slate-400', 'cursor-not-allowed');

                const file = pdfFileInput.files[0];
                const docType = document.querySelector('input[name="documentType"]:checked').value;

                document.getElementById('summary-file-name').textContent = file ? file.name : 'N/A';
                document.getElementById('summary-doc-type').textContent = docType.charAt(0).toUpperCase() + docType.slice(1);
                document.getElementById('summary-ai-model').textContent = 'Fast'; // Hardcoded model label

                cancelBtn.disabled = true;
                cancelBtn.classList.add('bg-slate-300', 'text-slate-500', 'cursor-not-allowed');
                cancelBtn.classList.remove('bg-slate-200', 'hover:bg-slate-300');

                let countdown = 30;
                cancelBtn.textContent = `Cancel (${countdown}s)`;

                cancelInterval = setInterval(() => {
                    countdown--;
                    if (countdown > 0) {
                        cancelBtn.textContent = `Cancel (${countdown}s)`;
                    } else {
                        clearInterval(cancelInterval);
                        cancelInterval = null;
                        cancelBtn.disabled = false;
                        cancelBtn.textContent = 'Cancel';
                        cancelBtn.classList.remove('bg-slate-300', 'text-slate-500', 'cursor-not-allowed');
                        cancelBtn.classList.add('bg-slate-200', 'hover:bg-slate-300');
                    }
                }, 1000);
                break;
            case 3:
                primaryBtn.textContent = 'Review & Create Patient';
                break;
        }
    };

    // --- Handler Functions ---
    async function handlePdfUploadAndProcess() {
        const file = pdfFileInput.files[0];
        fileError.textContent = '';
        if (!file || file.type !== 'application/pdf') {
            fileError.textContent = 'Please select a valid PDF file.';
            modalCurrentStep = 1; // Go back to step 1 on error
            updateModalUI();
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        // Get the selected model and append it
        /* const selectedModelInput = document.querySelector('input[name="geminiModel"]:checked');
        const selectedModel = selectedModelInput.value;
        formData.append('model', selectedModel); */

        const selectedModel = 'gemini-2.5-flash-lite'; // Hardcoded model
        formData.append('model', selectedModel);

        // Get the selected document type and append it
        const selectedDocumentType = document.querySelector('input[name="documentType"]:checked').value;
        formData.append('documentType', selectedDocumentType);

        try {
            selectedPatient = await API.processPdf(formData);
            isEditMode = true;

            if (cancelInterval) { // Clear timer on success
                clearInterval(cancelInterval);
                cancelInterval = null;
            }

            modalCurrentStep++; // Move to step 3 (Review)
            updateModalUI();
            console.log(`[Extraction Log] File processed with '${selectedModel}' model.`);
        } catch (error) {
            alert(`Error processing PDF: ${error.message}`);
            uploadModal.classList.add('hidden');
            modalCurrentStep = 1;
            updateModalUI();
        }
    }

    async function handleSaveChanges() {
        const activeTabId = document.querySelector('#detailTabs .dashboard-tab.active')?.dataset.tab || 'summary';

        try {
            let savedPatient;
            if (selectedPatient.id) { // UPDATE
                const updatedData = {};
                document.querySelectorAll('[data-path]:not([type="radio"])').forEach(input => {
                    const path = input.dataset.path; let value = input.value;
                    const arrayFields = ['summary.final_diagnosis', 'summary.medications_taken', 'summary.allergies'];
                    if (arrayFields.includes(path)) value = value.split(',').map(item => item.trim()).filter(Boolean);
                    if (input.type === 'number' && value) value = parseFloat(value);
                    else if (typeof value === 'string' && !value.trim()) value = null;
                    setValueByPath(updatedData, path, value);
                });
                const checkedPatientSex = document.querySelector('input[data-path="patient_info.sex"]:checked');
                setValueByPath(updatedData, 'patient_info.sex', checkedPatientSex ? checkedPatientSex.value : null);
                const checkedSponsorSex = document.querySelector('input[data-path="sponsor_info.sex"]:checked');
                setValueByPath(updatedData, 'sponsor_info.sex', checkedSponsorSex ? checkedSponsorSex.value : null);

                savedPatient = await API.updatePatient(selectedPatient.id, updatedData);
                const index = allPatients.findIndex(p => p.id === savedPatient.id);
                if (index !== -1) allPatients[index] = savedPatient;
            } else { // CREATE
                const newPatientData = JSON.parse(JSON.stringify(selectedPatient));
                document.querySelectorAll('[data-path]:not([type="radio"])').forEach(input => {
                    const path = input.dataset.path; let value = input.value;
                    const arrayFields = ['summary.final_diagnosis', 'summary.medications_taken', 'summary.allergies'];
                    if (arrayFields.includes(path)) value = value.split(',').map(item => item.trim()).filter(Boolean);
                    if (input.type === 'number' && value) value = parseFloat(value);
                    else if (typeof value === 'string' && !value.trim()) value = null;
                    setValueByPath(newPatientData, path, value);
                });
                const checkedPatientSex = document.querySelector('input[data-path="patient_info.sex"]:checked');
                setValueByPath(newPatientData, 'patient_info.sex', checkedPatientSex ? checkedPatientSex.value : null);
                const checkedSponsorSex = document.querySelector('input[data-path="sponsor_info.sex"]:checked');
                setValueByPath(newPatientData, 'sponsor_info.sex', checkedSponsorSex ? checkedSponsorSex.value : null);

                savedPatient = await API.createPatient(newPatientData);
                allPatients.push(savedPatient);
                renderPatientList();
            }

            selectPatient(savedPatient.id);
            setActiveTab(activeTabId);
        } catch (error) {
            console.error('Failed to save patient:', error);
            let detailedError = 'Could not save patient data.';
            if (error.response) {
                try {
                    const responseBody = await error.response.json();
                    if (responseBody.message) detailedError = Array.isArray(responseBody.message) ? responseBody.message.join(', ') : responseBody.message;
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

        // Get the active tab ID before doing anything else
        const activeTabId = document.querySelector('#detailTabs .dashboard-tab.active')?.dataset.tab || 'summary';

        if (!selectedPatient.id && isEditMode) {
            fetchAndDisplayPatients(currentPage);
            return;
        }
        isEditMode = !isEditMode;
        renderPatientDetails();
        updateButtonState();

        // Restore the active tab after re-rendering
        setActiveTab(activeTabId);
    }

    function updateButtonState() {
        // This check is now more important
        if (!selectedPatient) {
            return;
        }

        // Get elements dynamically each time the function is called
        const editBtn = document.getElementById('editBtn');
        const saveBtn = document.getElementById('saveBtn');
        const deleteBtn = document.getElementById('deleteBtn');
        const editBtnText = document.getElementById('editBtnText');
        const editIcon = document.getElementById('editIcon');
        const cancelIcon = document.getElementById('cancelIcon');
        const saveIcon = document.getElementById('saveIcon');
        const saveBtnText = document.getElementById('saveBtnText');

        // Add a guard to ensure elements exist before trying to modify them
        if (!editBtn || !saveBtn || !deleteBtn || !editBtnText || !editIcon || !cancelIcon) {
            return;
        }

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
            const finalDiagnosisText = Array.isArray(patient.summary?.final_diagnosis)
                ? patient.summary.final_diagnosis.join(', ')
                : (patient.summary?.final_diagnosis || 'N/A');

            tr.innerHTML = `
            <td><input type="checkbox" class="patient-checkbox h-4 w-4 rounded border-gray-300" data-id="${patient.id}"></td>
            <td>${patient.name || 'N/A'}</td>
            <td>${patient.patient_info?.patient_record_number || 'N/A'}</td>
            <td class="truncate-cell">${finalDiagnosisText}</td>
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
            fetchAndDisplayPatients(currentPage);
            return;
        }

        // Get the new, dedicated container for our content
        const detailContentContainer = document.getElementById('patientDetailContent');

        // Build the new layout structure inside our dedicated container
        detailContentContainer.innerHTML = `
            <div id="newDetailView" class="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-4">
                <aside id="detailSidebar" class="lg:col-span-1 xl:col-span-1 lg:sticky lg:top-24 self-start space-y-4"></aside>
                <main id="detailMain" class="lg:col-span-2 xl:col-span-3"></main>
            </div>
        `;

        // Populate the new structure with data
        renderDetailSidebar(selectedPatient);
        renderDetailMainContent(selectedPatient);

        // Activate tab functionality
        setupDetailTabs();

        // Populate the tabs with encounter data
        const { medical_encounters } = selectedPatient;
        renderConsultations(medical_encounters?.consultations);
        renderLabResults(medical_encounters?.lab_results);
        renderRadiologyReports(medical_encounters?.radiology_reports);
    }

    function renderDetailSidebar(patient) {
        const sidebar = document.getElementById('detailSidebar');
        if (!sidebar) return;

        const { name, patient_info, summary } = patient;
        let demographicsHTML = '';
        let keyInfoHTML = '';

        // Helper to check if any service info exists for the patient
        const hasServiceInfo = patient_info.afpsn || patient_info.branch_of_service || patient_info.unit_assignment;

        if (isEditMode) {
            // Edit Mode remains the same
            const sexEditHTML = `
                <div class="py-2 grid grid-cols-3 items-center gap-4">
                    <label class="font-medium text-sm text-gray-600 col-span-1">Sex</label>
                    <div class="col-span-2 flex items-center gap-4">
                        <label class="flex items-center gap-2 text-sm"><input type="radio" name="sex-edit" value="M" data-path="patient_info.sex" ${patient_info.sex === 'M' ? 'checked' : ''}> Male</label>
                        <label class="flex items-center gap-2 text-sm"><input type="radio" name="sex-edit" value="F" data-path="patient_info.sex" ${patient_info.sex === 'F' ? 'checked' : ''}> Female</label>
                    </div>
                </div>
            `;
            const serviceInfoEditHTML = `
                <div>
                    <h4 class="text-base font-bold text-slate-800 my-4 border-b pb-2">Service Information</h4>
                    <div class="space-y-2 pt-2">
                        ${createEditItem('Rank', patient_info.rank, 'patient_info.rank')}
                        ${createEditItem('AFPSN', patient_info.afpsn, 'patient_info.afpsn')}
                        ${createEditItem('Branch of Service', patient_info.branch_of_service, 'patient_info.branch_of_service')}
                        ${createEditItem('Unit Assignment', patient_info.unit_assignment, 'patient_info.unit_assignment')}
                    </div>
                </div>`;
            demographicsHTML = `
                <div class="bg-white rounded-lg border border-slate-200 shadow-sm">
                    <div class="p-4 border-b border-slate-200"><h3 class="font-semibold text-slate-800">Patient Demographics</h3></div>
                    <div class="p-4 divide-y divide-slate-200">
                        ${createEditItem('First Name', patient_info.full_name?.first_name, 'patient_info.full_name.first_name')}
                        ${createEditItem('Middle Initial', patient_info.full_name?.middle_initial, 'patient_info.full_name.middle_initial')}
                        ${createEditItem('Last Name', patient_info.full_name?.last_name, 'patient_info.full_name.last_name')}
                        ${createEditItem('Record #', patient_info.patient_record_number, 'patient_info.patient_record_number')}
                        ${createEditItem('Date of Birth', patient_info.date_of_birth, 'patient_info.date_of_birth')}
                        ${createEditItem('Category', patient_info.category, 'patient_info.category')}
                        ${sexEditHTML}
                        <div class="py-2 space-y-2">
                            <label class="font-medium text-sm text-gray-600">Address</label>
                            ${createEditItem('House No./Street', patient_info.address?.house_no_street, 'patient_info.address.house_no_street')}
                            ${createEditItem('Barangay', patient_info.address?.barangay, 'patient_info.address.barangay')}
                            ${createEditItem('City/Municipality', patient_info.address?.city_municipality, 'patient_info.address.city_municipality')}
                            ${createEditItem('Province', patient_info.address?.province, 'patient_info.address.province')}
                            ${createEditItem('ZIP Code', patient_info.address?.zip_code, 'patient_info.address.zip_code')}
                        </div>
                        ${serviceInfoEditHTML}
                    </div>
                </div>`;
            keyInfoHTML = `
                <div class="bg-white rounded-lg border border-slate-200 shadow-sm">
                    <div class="p-4 border-b border-slate-200"><h3 class="font-semibold text-slate-800">Key Information</h3></div>
                    <div class="p-4 space-y-4">
                        ${createEditItem('Allergies', Array.isArray(summary?.allergies) ? summary.allergies.join(', ') : '', 'summary.allergies')}
                        ${createEditItem('Final Diagnoses', Array.isArray(summary?.final_diagnosis) ? summary.final_diagnosis.join(', ') : '', 'summary.final_diagnosis')}
                    </div>
                </div>`;
        } else {
            // --- VIEW MODE ---
            let dobDisplay = 'N/A';
            if (patient_info.date_of_birth) {
                const date = new Date(patient_info.date_of_birth + 'T00:00:00');
                const options = { year: 'numeric', month: 'long', day: 'numeric' };
                const formattedDate = date.toLocaleDateString('en-US', options);
                const age = patient_info.age ? `(${patient_info.age} yrs)` : '';
                dobDisplay = `${formattedDate} ${age}`;
            }

            let sexDisplay = 'N/A';
            if (patient_info.sex === 'M') sexDisplay = 'Male';
            else if (patient_info.sex === 'F') sexDisplay = 'Female';

            const patientMI = patient_info.full_name?.middle_initial ? `${patient_info.full_name.middle_initial}.` : '';
            const fullName = [patient_info.full_name?.first_name, patientMI, patient_info.full_name?.last_name].filter(Boolean).join(' ');

            const address = patient_info.address;
            const fullAddress = address ? [address.house_no_street, address.barangay, address.city_municipality, address.province, address.zip_code].filter(Boolean).join(', ') : 'N/A';

            let serviceInfoHTML = '';
            if (hasServiceInfo) {
                serviceInfoHTML = `
                    <div class="border-t border-slate-200 -mx-5 mt-4"></div>
                    <div class="pt-4">
                        <h4 class="font-bold text-lg text-slate-800 mb-3">Service Information</h4>
                        <dl class="space-y-4">
                            <div>
                                <dt class="text-sm text-slate-500">Rank</dt>
                                <dd class="font-medium text-slate-800">${patient_info.rank || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt class="text-sm text-slate-500">AFPSN</dt>
                                <dd class="font-medium text-slate-800">${patient_info.afpsn || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt class="text-sm text-slate-500">Branch of Service</dt>
                                <dd class="font-medium text-slate-800">${patient_info.branch_of_service || 'N/A'}</dd>
                            </div>
                            <div>
                                <dt class="text-sm text-slate-500">Unit Assignment</dt>
                                <dd class="font-medium text-slate-800">${patient_info.unit_assignment || 'N/A'}</dd>
                            </div>
                        </dl>
                    </div>`;
            }

            demographicsHTML = `
                <div class="bg-white rounded-lg border border-slate-200 shadow-sm">
                    <div class="p-5 border-b border-slate-200">
                        <h3 class="font-bold text-lg text-slate-800">${fullName}</h3>
                        <p class="text-slate-500">Record #: ${patient_info.patient_record_number || 'N/A'}</p>
                    </div>
                    <div class="p-5">
                        <dl class="space-y-4">
                            <div><dt class="text-sm text-slate-500">Date of Birth</dt><dd class="font-medium text-slate-800">${dobDisplay}</dd></div>
                            <div><dt class="text-sm text-slate-500">Category</dt><dd class="font-medium text-slate-800">${patient_info.category || 'N/A'}</dd></div>
                            <div><dt class="text-sm text-slate-500">Sex</dt><dd class="font-medium text-slate-800">${sexDisplay}</dd></div>
                            <div><dt class="text-sm text-slate-500">Address</dt><dd class="font-medium text-slate-800">${fullAddress}</dd></div>
                        </dl>
                        ${serviceInfoHTML}
                    </div>
                </div>`;

            // START: Updated logic for Key Information card
            let allergiesContent = '<span class="text-slate-500">N/A</span>';
            if (summary?.allergies?.length) {
                allergiesContent = `<ul class="list-disc list-inside">${summary.allergies.map(item => `<li>${item}</li>`).join('')}</ul>`;
            }
            let diagnosesContent = '<span class="text-slate-500">N/A</span>';
            if (summary?.final_diagnosis?.length) {
                diagnosesContent = `<ul class="list-disc list-inside">${summary.final_diagnosis.map(item => `<li>${item}</li>`).join('')}</ul>`;
            }

            keyInfoHTML = `
                <div class="bg-white rounded-lg border border-slate-200 shadow-sm">
                    <div class="p-5 border-b border-slate-200"><h3 class="font-bold text-lg text-slate-800">Key Information</h3></div>
                    <div class="p-5">
                        <dl class="space-y-4">
                            <div>
                                <dt class="text-sm text-red-600 font-semibold">Allergies</dt>
                                <dd class="font-medium text-red-700">${allergiesContent}</dd>
                            </div>
                            <div>
                                <dt class="text-sm text-slate-500">Final Diagnoses</dt>
                                <dd class="font-medium text-slate-800">${diagnosesContent}</dd>
                            </div>
                        </dl>
                    </div>
                </div>`;
            // END: Updated logic
        }
        sidebar.innerHTML = demographicsHTML + keyInfoHTML;
    }

    function renderDetailMainContent(patient) {
        const mainContent = document.getElementById('detailMain');
        if (!mainContent) return;

        const { summary, sponsor_info } = patient;
        let summaryHTML = '';
        let sponsorHTML = '';

        if (isEditMode) {
            summaryHTML = `<div class="space-y-4">
                                ${createEditItem('Key Findings', summary?.key_findings, 'summary.key_findings')}
                                ${createEditItem('Medications', Array.isArray(summary?.medications_taken) ? summary.medications_taken.join(', ') : '', 'summary.medications_taken')}
                            </div>`;
        } else {
            summaryHTML = `<div class="space-y-6">
                                 <div>
                                    <div class="flex items-center gap-3 text-lg font-semibold text-slate-700">
                                        <i class="fa-solid fa-magnifying-glass-plus w-4 text-center text-slate-500"></i>
                                        <span>Key Findings</span>
                                    </div>
                                    <p class="text-slate-700 mt-1 ml-7 leading-relaxed">${summary?.key_findings || 'N/A'}</p>
                                 </div>
                                 <div>
                                    <div class="flex items-center gap-3 text-lg font-semibold text-slate-700">
                                        <i class="fa-solid fa-pills w-4 text-center text-slate-500"></i>
                                        <span>Medications</span>
                                    </div>
                                    <ul class="text-slate-700 list-disc list-inside mt-1 ml-7">${summary?.medications_taken?.length ? summary.medications_taken.map(m => `<li>${m}</li>`).join('') : '<li>N/A</li>'}</ul>
                                 </div>
                            </div>`;
        }

        if (isEditMode) {
            const sponsorSexEditHTML = `
                <div class="py-2 grid grid-cols-3 items-center gap-4">
                    <label class="font-medium text-sm text-gray-600 col-span-1">Sex</label>
                    <div class="col-span-2 flex items-center gap-4">
                        <label class="flex items-center gap-2 text-sm"><input type="radio" name="sponsor-sex-edit" value="M" data-path="sponsor_info.sex" ${sponsor_info?.sex === 'M' ? 'checked' : ''}> Male</label>
                        <label class="flex items-center gap-2 text-sm"><input type="radio" name="sponsor-sex-edit" value="F" data-path="sponsor_info.sex" ${sponsor_info?.sex === 'F' ? 'checked' : ''}> Female</label>
                    </div>
                </div>`;
            sponsorHTML = `<div class="flex justify-between items-center mb-4">
                                <h3 class="text-xl font-semibold text-gray-700">Sponsor Information</h3>
                                <button id="clearSponsorBtn" class="btn btn-secondary !py-1 !px-3 text-sm">
                                    <i class="fa-solid fa-eraser"></i> Clear Fields
                                </button>
                            </div>
                            <div class="space-y-6">
                                <div>
                                    <h4 class="text-base font-bold text-slate-800 mb-2 border-b pb-2">Personal Information</h4>
                                    <div class="space-y-2 pt-2">
                                        ${createEditItem('First Name', sponsor_info?.sponsor_name?.first_name, 'sponsor_info.sponsor_name.first_name')}
                                        ${createEditItem('Middle Initial', sponsor_info?.sponsor_name?.middle_initial, 'sponsor_info.sponsor_name.middle_initial')}
                                        ${createEditItem('Last Name', sponsor_info?.sponsor_name?.last_name, 'sponsor_info.sponsor_name.last_name')}
                                        ${sponsorSexEditHTML}
                                    </div>
                                </div>
                                <div>
                                    <h4 class="text-base font-bold text-slate-800 mb-2 border-b pb-2">Service Information</h4>
                                    <div class="space-y-2 pt-2">
                                        ${createEditItem('Rank', sponsor_info?.sponsor_name?.rank, 'sponsor_info.sponsor_name.rank')}
                                        ${createEditItem('AFPSN', sponsor_info?.afpsn, 'sponsor_info.afpsn')}
                                        ${createEditItem('Branch of Service', sponsor_info?.branch_of_service, 'sponsor_info.branch_of_service')}
                                        ${createEditItem('Unit Assignment', sponsor_info?.unit_assignment, 'sponsor_info.unit_assignment')}
                                    </div>
                                </div>
                            </div>`;
        } else {
            const gn = sponsor_info?.sponsor_name;
            const sponsorMI = gn?.middle_initial ? `${gn.middle_initial}.` : '';
            const sponsorFullName = [gn?.first_name, sponsorMI, gn?.last_name].filter(Boolean).join(' ').trim();
            let sponsorSexDisplay = 'N/A';
            if (sponsor_info?.sex === 'M') sponsorSexDisplay = 'Male';
            else if (sponsor_info?.sex === 'F') sponsorSexDisplay = 'Female';

            if (sponsorFullName) {
                const createSponsorDetailItem = (icon, label, value) => `
                    <div>
                        <div class="flex items-center gap-2 text-sm font-semibold text-slate-600">
                            <i class="fa-solid ${icon} w-4 text-center"></i>
                            <span>${label}</span>
                        </div>
                        <p class="text-slate-800 mt-1 ml-6">${value || 'N/A'}</p>
                    </div>`;

                sponsorHTML = `<div class="space-y-8">
                                    <div>
                                        <h4 class="text-base font-bold text-slate-800 mb-4">Personal Information</h4>
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
                                            ${createSponsorDetailItem('fa-user', 'Name', sponsorFullName)}
                                            ${createSponsorDetailItem('fa-venus-mars', 'Sex', sponsorSexDisplay)}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 class="text-base font-bold text-slate-800 mb-4">Service Information</h4>
                                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-6">
                                            ${createSponsorDetailItem('fa-star', 'Rank', gn.rank)}
                                            ${createSponsorDetailItem('fa-id-card', 'AFPSN', sponsor_info.afpsn)}
                                            ${createSponsorDetailItem('fa-building-flag', 'Branch of Service', sponsor_info.branch_of_service)}
                                            <div class="sm:col-span-2">
                                                ${createSponsorDetailItem('fa-location-dot', 'Unit Assignment', sponsor_info.unit_assignment)}
                                            </div>
                                        </div>
                                    </div>
                                </div>`;
            } else {
                sponsorHTML = `<div class="text-center py-12 text-slate-400">
                                    <i class="fa-solid fa-user-shield fa-3x mb-3"></i>
                                    <p class="font-medium">No Sponsor Information</p>
                                    <p class="text-sm">There is no sponsor on file for this patient.</p>
                                </div>`;
            }
        }

        const pi = patient.patient_info;
        const patientMI = pi?.full_name?.middle_initial ? `${pi.full_name.middle_initial}.` : '';
        const fullName = [pi?.full_name?.first_name, patientMI, pi?.full_name?.last_name].filter(Boolean).join(' ').trim();

        const headerTitle = selectedPatient.id
            ? `Viewing: ${fullName || 'New Patient'}`
            : 'Review & Create New Patient';

        const headerHTML = `
            <div class="bg-white p-4 rounded-lg border border-slate-200 mb-4 flex items-center justify-between">
                <h2 class="text-lg font-semibold text-slate-600">${headerTitle}</h2>
                <div id="actionButtons" class="flex gap-2">
                    <button id="backToListBtn" class="btn btn-secondary">
                        <i class="fa-solid fa-arrow-left"></i>
                        <span>Back to List</span>
                    </button>
                    <button id="editBtn" class="btn btn-primary">
                        <i id="editIcon" class="fa-solid fa-pencil"></i>
                        <i id="cancelIcon" class="fa-solid fa-xmark hidden"></i>
                        <span id="editBtnText">Edit Data</span>
                    </button>
                    <button id="saveBtn" class="btn btn-success hidden">
                        <i id="saveIcon" class="fa-solid fa-check"></i>
                        <span id="saveBtnText">Save Changes</span>
                    </button>
                    <button id="deleteBtn" class="btn btn-danger">
                        <i class="fa-solid fa-trash"></i>
                        <span>Delete</span>
                    </button>
                </div>
            </div>
        `;

        mainContent.innerHTML = headerHTML + `<div class="bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col">
                                    <div class="border-b border-slate-200">
                                        <nav id="detailTabs" class="flex gap-4 -mb-px px-4 sm:px-6">
                                            <button data-tab="summary" class="dashboard-tab active">Summary</button>
                                            <button data-tab="consultations" class="dashboard-tab">Consultations</button>
                                            <button data-tab="labs" class="dashboard-tab">Lab Results</button>
                                            <button data-tab="radiology" class="dashboard-tab">Radiology</button>
                                            <button data-tab="sponsor" class="dashboard-tab">Sponsor</button>
                                        </nav>
                                    </div>
                                    <div id="tabContentScroller" class="p-4 md:p-6 max-h-[calc(100vh-20rem)] overflow-y-auto">
                                        <div id="summaryPanel" class="tab-panel">${summaryHTML}</div>
                                        <div id="consultationsPanel" class="tab-panel hidden"></div>
                                        <div id="labsPanel" class="tab-panel hidden"></div>
                                        <div id="radiologyPanel" class="tab-panel hidden"></div>
                                        <div id="sponsorPanel" class="tab-panel hidden">${sponsorHTML}</div>
                                    </div>
                                </div>`;

        const scroller = document.getElementById('tabContentScroller');
        if (scroller) {
            scroller.addEventListener('scroll', () => {
                const fab = scroller.querySelector('.tab-panel:not(.hidden) .scroll-to-top-fab');
                if (fab) {
                    if (scroller.scrollTop > 100) {
                        fab.classList.remove('hidden');
                    } else {
                        fab.classList.add('hidden');
                    }
                }
            });
        }
    }

    function setupDetailTabs() {
        const tabsContainer = document.getElementById('detailTabs');
        if (!tabsContainer) return;

        tabsContainer.addEventListener('click', (e) => {
            const clickedTab = e.target.closest('.dashboard-tab');
            if (clickedTab) {
                e.preventDefault();
                const tabId = clickedTab.dataset.tab;
                setActiveTab(tabId);
            }
        });
    }

    // --- Helper Functions ---
    function createEditItem(label, value, path) {
        const isTextArea = ['notes', 'findings', 'treatment plan', 'impression', 'key findings', 'medications'].includes(label.toLowerCase());
        let inputType = 'text';
        if (label.toLowerCase().includes('date')) {
            inputType = 'date';
        } else if (label.toLowerCase() === 'age') {
            inputType = 'number';
        }

        if (isTextArea) {
            return `<div class="py-2">
                    <label class="block font-medium text-sm text-gray-600 mb-1">${label}</label>
                    <textarea data-path="${path}" class="edit-textarea">${value || ''}</textarea>
                </div>`;
        }

        return `<div class="py-2 grid grid-cols-3 items-center gap-4">
                <label class="font-medium text-sm text-gray-600 col-span-1">${label}</label>
                <input type="${inputType}" data-path="${path}" value="${value || ''}" class="edit-input col-span-2">
            </div>`;
    }
    function renderConsultations(consultations) {
        const container = document.getElementById('consultationsPanel');
        if (!container) return;

        let header = `<div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <i class="fa-solid fa-stethoscope text-slate-500"></i>Consultations
                        </h3>`;
        if (isEditMode) {
            header += `<button id="addConsultationBtn" class="btn btn-secondary !py-1 !px-3 text-sm">
                           <i class="fa-solid fa-plus"></i> Add
                       </button>`;
        }
        header += `</div>`;

        if (consultations && consultations.length > 0) {
            const quickLinks = consultations.map((item, index) =>
                `<a href="#consultation-${index}" class="quick-link-chip">${item.consultation_date || `Entry ${index + 1}`}</a>`
            ).join('');

            const quickLinksContainer = `
                <div class="detail-card mb-4">
                    <button id="quickAccessToggle" class="detail-card-header w-full flex justify-between items-center cursor-pointer">
                        <span class="font-semibold text-base flex items-center gap-2">
                            <i class="fa-solid fa-magnifying-glass text-slate-500"></i>
                            <span>Quick Access</span>
                        </span>
                        <i class="fa-solid fa-chevron-down quick-access-chevron text-sm"></i>
                    </button>
                    <div id="quickLinksWrapper" class="p-4 flex flex-wrap gap-2">
                        ${quickLinks}
                    </div>
                </div>`;

            // START: Added FAB HTML
            const fabHTML = `<button class="scroll-to-top-fab hidden" data-target-panel="consultationsPanel" title="Back to top">
                                <i class="fa-solid fa-arrow-up"></i>
                             </button>`;
            // END: Added FAB HTML

            let content = `<div class="space-y-4">`;
            consultations.forEach((item, index) => {
                const basePath = `medical_encounters.consultations.${index}`;
                const createViewItem = (icon, label, value) => `
                    <div>
                        <div class="flex items-center gap-2 text-sm font-semibold text-slate-600">
                            <i class="fa-solid ${icon} w-4 text-center"></i>
                            <span>${label}</span>
                        </div>
                        <p class="text-slate-700 mt-1 ml-6 whitespace-pre-wrap">${value || 'N/A'}</p>
                    </div>`;

                content += `<div class="detail-card" id="consultation-${index}">
                                <div class="detail-card-header flex justify-between items-center" style="background-color: #f1f5f9;">
                                    <span>
                                        <i class="fa-solid fa-calendar-alt mr-2 text-slate-400"></i>
                                        <strong>Date:</strong> ${isEditMode ? `<input type="date" data-path="${basePath}.consultation_date" value="${item.consultation_date || ''}" class="edit-input w-40 ml-2">` : (item.consultation_date || 'N/A')}
                                    </span>
                                    ${isEditMode
                        ? `<button class="btn btn-danger !py-1 !px-2 text-xs delete-btn-dynamic" data-type="consultation" data-index="${index}" title="Delete this consultation"><i class="fa-solid fa-trash-can"></i></button>`
                        : item.age_at_visit ? `<span class="text-sm bg-blue-100 text-blue-800 font-medium px-2 py-0.5 rounded-full">Age: ${item.age_at_visit}</span>` : ''
                    }
                                </div>
                                <div class="detail-card-body">
                                    ${isEditMode ?
                        `<div class="space-y-6">
                                            <div>
                                                <h4 class="text-base font-bold text-slate-800 mb-2 border-b pb-2">Vitals</h4>
                                                <div class="grid grid-cols-3 gap-4 pt-2">
                                                    ${createEditItem('Height (cm)', item.vitals?.height_cm, `${basePath}.vitals.height_cm`)}
                                                    ${createEditItem('Weight (kg)', item.vitals?.weight_kg, `${basePath}.vitals.weight_kg`)}
                                                    ${createEditItem('Temp (°C)', item.vitals?.temperature_c, `${basePath}.vitals.temperature_c`)}
                                                </div>
                                            </div>
                                            <div>
                                                <h4 class="text-base font-bold text-slate-800 mb-2 border-b pb-2">Encounter Details</h4>
                                                <div class="space-y-2 pt-2">
                                                    ${createEditItem("Chief Complaint", item.chief_complaint, `${basePath}.chief_complaint`)}
                                                    ${createEditItem("Notes / HPI", item.notes, `${basePath}.notes`)}
                                                    ${createEditItem("Diagnosis", item.diagnosis, `${basePath}.diagnosis`)}
                                                    ${createEditItem("Treatment Plan", item.treatment_plan, `${basePath}.treatment_plan`)}
                                                    ${createEditItem("Attending Physician", item.attending_physician, `${basePath}.attending_physician`)}
                                                </div>
                                            </div>
                                        </div>` :
                        `<div class="space-y-6">
                                            <div>
                                                <h4 class="text-base font-bold text-slate-800 mb-3">Vitals</h4>
                                                <div class="grid grid-cols-3 gap-4">
                                                    ${((icon, label, value, unit) => `<div><div class="flex items-center gap-2 text-sm font-semibold text-slate-600"><i class="fa-solid ${icon} w-4 text-center"></i><span>${label}</span></div><p class="text-slate-700 mt-1 ml-6">${value || 'N/A'} ${unit}</p></div>`)('fa-ruler-vertical', 'Height', item.vitals?.height_cm, 'cm')}
                                                    ${((icon, label, value, unit) => `<div><div class="flex items-center gap-2 text-sm font-semibold text-slate-600"><i class="fa-solid ${icon} w-4 text-center"></i><span>${label}</span></div><p class="text-slate-700 mt-1 ml-6">${value || 'N/A'} ${unit}</p></div>`)('fa-weight-scale', 'Weight', item.vitals?.weight_kg, 'kg')}
                                                    ${((icon, label, value, unit) => `<div><div class="flex items-center gap-2 text-sm font-semibold text-slate-600"><i class="fa-solid ${icon} w-4 text-center"></i><span>${label}</span></div><p class="text-slate-700 mt-1 ml-6">${value || 'N/A'} ${unit}</p></div>`)('fa-temperature-half', 'Temp', item.vitals?.temperature_c, '°C')}
                                                </div>
                                            </div>
                                            <div class="border-t border-slate-200"></div>
                                            <div>
                                                <h4 class="text-base font-bold text-slate-800 mb-4">Encounter Details</h4>
                                                <div class="space-y-4">
                                                    ${((icon, label, value) => `<div><div class="flex items-center gap-2 text-sm font-semibold text-slate-600"><i class="fa-solid ${icon} w-4 text-center"></i><span>${label}</span></div><p class="text-slate-700 mt-1 ml-6 whitespace-pre-wrap">${value || 'N/A'}</p></div>`)('fa-comment-dots', 'Chief Complaint', item.chief_complaint)}
                                                    ${((icon, label, value) => `<div><div class="flex items-center gap-2 text-sm font-semibold text-slate-600"><i class="fa-solid ${icon} w-4 text-center"></i><span>${label}</span></div><p class="text-slate-700 mt-1 ml-6 whitespace-pre-wrap">${value || 'N/A'}</p></div>`)('fa-file-lines', 'Notes / HPI', item.notes)}
                                                    ${((icon, label, value) => `<div><div class="flex items-center gap-2 text-sm font-semibold text-slate-600"><i class="fa-solid ${icon} w-4 text-center"></i><span>${label}</span></div><p class="text-slate-700 mt-1 ml-6 whitespace-pre-wrap">${value || 'N/A'}</p></div>`)('fa-stethoscope', 'Diagnosis / Assessment', item.diagnosis)}
                                                    ${((icon, label, value) => `<div><div class="flex items-center gap-2 text-sm font-semibold text-slate-600"><i class="fa-solid ${icon} w-4 text-center"></i><span>${label}</span></div><p class="text-slate-700 mt-1 ml-6 whitespace-pre-wrap">${value || 'N/A'}</p></div>`)('fa-prescription-bottle-medical', 'Treatment Plan', item.treatment_plan)}
                                                    ${((icon, label, value) => `<div><div class="flex items-center gap-2 text-sm font-semibold text-slate-600"><i class="fa-solid ${icon} w-4 text-center"></i><span>${label}</span></div><p class="text-slate-700 mt-1 ml-6 whitespace-pre-wrap">${value || 'N/A'}</p></div>`)('fa-user-doctor', 'Attending Physician', item.attending_physician)}
                                                </div>
                                            </div>
                                        </div>`
                    }
                                </div>
                            </div>`;
            });
            content += `</div>`;
            container.innerHTML = header + quickLinksContainer + content + fabHTML;
        } else {
            container.innerHTML = header + `
                <div class="text-center py-12 text-slate-400">
                    <i class="fa-solid fa-file-circle-xmark fa-3x mb-3"></i>
                    <p class="font-medium">No Consultation Records</p>
                    <p class="text-sm">There is no consultation history for this patient.</p>
                </div>`;
        }
    }
    function renderLabResults(labs) {
        const container = document.getElementById('labsPanel');
        if (!container) return;

        let header = `<div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <i class="fa-solid fa-vial text-slate-500"></i>Laboratory Results
                        </h3>`;
        if (isEditMode) {
            header += `<button id="addLabResultBtn" class="btn btn-secondary !py-1 !px-3 text-sm">
                           <i class="fa-solid fa-plus"></i> Add
                       </button>`;
        }
        header += `</div>`;

        if (labs && labs.length > 0) {
            const quickLinks = labs.map((lab, index) => {
                const label = lab.test_type || `Entry ${index + 1}`;
                const datePart = lab.date_performed ? ` (${lab.date_performed})` : '';
                return `<a href="#lab-${index}" class="quick-link-chip">${label}${datePart}</a>`;
            }).join('');

            const quickLinksContainer = `
                <div class="detail-card mb-4">
                    <button id="quickAccessToggleLabs" class="detail-card-header w-full flex justify-between items-center cursor-pointer">
                        <span class="font-semibold text-base flex items-center gap-2">
                            <i class="fa-solid fa-magnifying-glass text-slate-500"></i>
                            <span>Quick Access</span>
                        </span>
                        <i class="fa-solid fa-chevron-down quick-access-chevron text-sm"></i>
                    </button>
                    <div id="quickLinksWrapperLabs" class="p-4 flex flex-wrap gap-2">
                        ${quickLinks}
                    </div>
                </div>`;

            const fabHTML = `<button class="scroll-to-top-fab hidden" data-target-panel="labsPanel" title="Back to top">
                                <i class="fa-solid fa-arrow-up"></i>
                             </button>`;

            let content = `<div class="space-y-4">`;
            labs.forEach((lab, index) => {
                const basePath = `medical_encounters.lab_results.${index}`;
                content += `<div class="detail-card" id="lab-${index}">
                                <div class="detail-card-header flex justify-between items-center" style="background-color: #f1f5f9;">
                                    <span>
                                        <i class="fa-solid fa-calendar-alt mr-2 text-slate-400"></i>
                                        <strong>Date:</strong> ${isEditMode ? `<input type="date" data-path="${basePath}.date_performed" value="${lab.date_performed || ''}" class="edit-input w-40 ml-2">` : (lab.date_performed || 'N/A')}
                                    </span>
                                    ${isEditMode ? `<button class="btn btn-danger !py-1 !px-2 text-xs delete-btn-dynamic" data-type="lab" data-index="${index}" title="Delete this lab result"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                                </div>
                                <div class="detail-card-body">
                                    ${isEditMode ?
                        `<div>${createEditItem('Test Type', lab.test_type, `${basePath}.test_type`)}</div>` :
                        `<h4 class="text-lg font-semibold text-green-600 mb-4">${lab.test_type || 'Lab Report'}</h4>`
                    }
                                    <table class="min-w-full text-sm">
                                        <thead class="bg-slate-50">
                                            <tr>
                                                <th class="px-4 py-2 text-left font-medium text-slate-600">Test</th>
                                                <th class="px-4 py-2 text-left font-medium text-slate-600">Result</th>
                                                <th class="px-4 py-2 text-left font-medium text-slate-600">Unit</th>
                                                <th class="px-4 py-2 text-left font-medium text-slate-600">Reference Range</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-slate-200">
                                            ${(lab.results || []).map((res, resultIndex) => {
                        if (isEditMode) {
                            const resultBasePath = `${basePath}.results.${resultIndex}`;
                            return `<tr>
                                                                <td class="px-2 py-1"><input type="text" class="edit-input" data-path="${resultBasePath}.test_name" value="${res.test_name || ''}"></td>
                                                                <td class="px-2 py-1"><input type="text" class="edit-input" data-path="${resultBasePath}.value" value="${res.value || ''}"></td>
                                                                <td class="px-2 py-1"><input type="text" class="edit-input" data-path="${resultBasePath}.unit" value="${res.unit || ''}"></td>
                                                                <td class="px-2 py-1"><input type="text" class="edit-input" data-path="${resultBasePath}.reference_range" value="${res.reference_range || ''}"></td>
                                                            </tr>`;
                        } else {
                            return `<tr>
                                                                <td class="px-4 py-2 font-medium text-slate-800">${res.test_name || ''}</td>
                                                                <td class="px-4 py-2">${res.value || ''}</td>
                                                                <td class="px-4 py-2">${res.unit || ''}</td>
                                                                <td class="px-4 py-2 text-slate-500">${res.reference_range || ''}</td>
                                                            </tr>`;
                        }
                    }).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>`;
            });
            content += `</div>`;
            container.innerHTML = header + quickLinksContainer + content + fabHTML;
        } else {
            container.innerHTML = header + `
                <div class="text-center py-12 text-slate-400">
                    <i class="fa-solid fa-flask-vial fa-3x mb-3"></i>
                    <p class="font-medium">No Lab Results</p>
                    <p class="text-sm">There are no lab results on file for this patient.</p>
                </div>`;
        }
    }

    function renderRadiologyReports(reports) {
        const container = document.getElementById('radiologyPanel');
        if (!container) return;

        let header = `<div class="flex justify-between items-center mb-4">
                        <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <i class="fa-solid fa-x-ray text-slate-500"></i>Radiology Reports
                        </h3>`;
        if (isEditMode) {
            header += `<button id="addRadiologyReportBtn" class="btn btn-secondary !py-1 !px-3 text-sm">
                           <i class="fa-solid fa-plus"></i> Add
                       </button>`;
        }
        header += `</div>`;

        if (reports && reports.length > 0) {
            const quickLinks = reports.map((report, index) => {
                const label = report.examination || `Entry ${index + 1}`;
                const datePart = report.date_performed ? ` (${report.date_performed})` : '';
                return `<a href="#radiology-${index}" class="quick-link-chip">${label}${datePart}</a>`;
            }).join('');

            const quickLinksContainer = `
                <div class="detail-card mb-4">
                    <button id="quickAccessToggleRadiology" class="detail-card-header w-full flex justify-between items-center cursor-pointer">
                        <span class="font-semibold text-base flex items-center gap-2">
                            <i class="fa-solid fa-magnifying-glass text-slate-500"></i>
                            <span>Quick Access</span>
                        </span>
                        <i class="fa-solid fa-chevron-down quick-access-chevron text-sm"></i>
                    </button>
                    <div id="quickLinksWrapperRadiology" class="p-4 flex flex-wrap gap-2">
                        ${quickLinks}
                    </div>
                </div>`;

            const fabHTML = `<button class="scroll-to-top-fab hidden" data-target-panel="radiologyPanel" title="Back to top">
                                <i class="fa-solid fa-arrow-up"></i>
                             </button>`;

            let content = `<div class="space-y-4">`;
            reports.forEach((report, index) => {
                const basePath = `medical_encounters.radiology_reports.${index}`;
                content += `<div class="detail-card" id="radiology-${index}">
                                <div class="detail-card-header flex justify-between items-center" style="background-color: #f1f5f9;">
                                    <span>
                                        <i class="fa-solid fa-calendar-alt mr-2 text-slate-400"></i>
                                        <strong>Date:</strong> ${isEditMode ? `<input type="date" data-path="${basePath}.date_performed" value="${report.date_performed || ''}" class="edit-input w-40 ml-2">` : (report.date_performed || 'N/A')}
                                    </span>
                                    ${isEditMode ? `<button class="btn btn-danger !py-1 !px-2 text-xs delete-btn-dynamic" data-type="radiology" data-index="${index}" title="Delete this report"><i class="fa-solid fa-trash-can"></i></button>` : ''}
                                </div>
                                <div class="detail-card-body">
                                    ${isEditMode ?
                        `<div>${createEditItem('Examination', report.examination, `${basePath}.examination`)}</div>` :
                        `<h4 class="text-lg font-semibold text-sky-600 mb-4">${report.examination || 'Radiology Report'}</h4>`
                    }
                                    ${isEditMode ?
                        `${createEditItem("Findings", report.findings, `${basePath}.findings`)}
                                         ${createEditItem("Impression", report.impression, `${basePath}.impression`)}` :
                        `<div class="space-y-2 text-sm">
                                            <div>
                                                <h4 class="font-semibold text-slate-700">Findings:</h4>
                                                <p class="text-slate-600 whitespace-pre-wrap">${report.findings || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <h4 class="font-semibold text-slate-700">Impression:</h4>
                                                <p class="font-medium text-slate-800 whitespace-pre-wrap">${report.impression || 'N/A'}</p>
                                            </div>
                                        </div>`
                    }
                                </div>
                            </div>`;
            });
            content += `</div>`;
            container.innerHTML = header + quickLinksContainer + content + fabHTML;
        } else {
            container.innerHTML = header + `
                <div class="text-center py-12 text-slate-400">
                    <i class="fa-solid fa-radiation fa-3x mb-3"></i>
                    <p class="font-medium">No Radiology Reports</p>
                    <p class="text-sm">There is no radiology reports on file for this patient.</p>
                </div>`;
        }
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

    function setActiveTab(tabId) {
        const tabsContainer = document.getElementById('detailTabs');
        if (!tabsContainer) return;

        const tabButtons = tabsContainer.querySelectorAll('.dashboard-tab');
        const tabPanels = tabsContainer.closest('.bg-white').querySelectorAll('.tab-panel');

        tabButtons.forEach(button => button.classList.remove('active'));
        tabPanels.forEach(panel => panel.classList.add('hidden'));

        const buttonToActivate = tabsContainer.querySelector(`[data-tab="${tabId}"]`);
        const panelToActivate = document.getElementById(`${tabId}Panel`);

        if (buttonToActivate) buttonToActivate.classList.add('active');
        if (panelToActivate) panelToActivate.classList.remove('hidden');

        // Check scroll position when tab changes
        const scroller = document.getElementById('tabContentScroller');
        const fab = panelToActivate?.querySelector('.scroll-to-top-fab');
        if (scroller && fab) {
            if (scroller.scrollTop > 100) {
                fab.classList.remove('hidden');
            } else {
                fab.classList.add('hidden');
            }
        }
    }

    // Start the application
    fetchAndDisplayPatients(1);
    fetchAndRenderDashboardStats();
});