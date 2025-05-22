// public/js/admin/admin-theatres.js
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initializeCommon === 'function') {
        initializeCommon();
    }

    const messageAreaManage = document.getElementById('manageTheatresMessage');
    const messageAreaForm = document.getElementById('theatreFormMessage');
    
    function displayMessage(areaElement, message, type = 'error') {
        if (!areaElement) return;
        areaElement.innerHTML = `<p class="${type}">${message}</p>`;
        areaElement.className = `message-area ${type}`;
        areaElement.style.display = 'block';
        setTimeout(() => { areaElement.style.display = 'none'; areaElement.innerHTML = ''; }, 7000);
    }

    // --- Logic for manage-theatres.html ---
    const theatresTableBody = document.querySelector('#theatresTable tbody');
    const loadingTheatresTableIndicator = document.getElementById('loadingTheatresTableIndicator');

    async function fetchAndDisplayTheatres() {
        if (!theatresTableBody) return; // Only on manage-theatres.html
        if (loadingTheatresTableIndicator) loadingTheatresTableIndicator.style.display = 'flex';
        if (messageAreaManage) messageAreaManage.style.display = 'none';
        theatresTableBody.innerHTML = '';

        try {
            const response = await fetch('/api/theatres'); // API to get all theatres
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Failed to fetch theatres list.');
            }
            const theatres = await response.json();

            if (theatres.length === 0) {
                displayMessage(messageAreaManage, 'No theatres found. Add some!', 'info');
                const row = theatresTableBody.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 6; // Adjust colspan based on your table structure
                cell.textContent = 'No theatres available.';
                cell.style.textAlign = 'center';
            } else {
                theatres.forEach(theatre => {
                    const row = theatresTableBody.insertRow();
                    row.insertCell().textContent = theatre.theater_id;
                    row.insertCell().textContent = theatre.name;
                    row.insertCell().textContent = theatre.location;
                    row.insertCell().textContent = theatre.total_seats;
                    
                    // Fetch and display screen count (or basic info)
                    const screensCell = row.insertCell();
                    screensCell.classList.add('screens-info');
                    if (theatre.screens && theatre.screens.length > 0) {
                        screensCell.textContent = `${theatre.screens.length} screen(s)`;
                        // Or list them: theatre.screens.map(s => `Screen ${s.screen_number}`).join(', ')
                    } else {
                         // Fetch screens if not included in the initial theatre list
                        fetch(`/api/theatres/${theatre.theater_id}/screens`) // Assumes this endpoint exists
                            .then(res => res.ok ? res.json() : [])
                            .then(screens => {
                                screensCell.textContent = screens.length > 0 ? `${screens.length} screen(s)` : 'No screens';
                            })
                            .catch(() => screensCell.textContent = 'Error loading screens');
                    }
                    
                    const actionsCell = row.insertCell();
                    actionsCell.classList.add('actions');
                    actionsCell.innerHTML = `
                        <a href="/admin/form-theatre.html?edit=${theatre.theater_id}" class="btn btn-outline btn-edit btn-small" title="Edit">
                            <i class="fas fa-edit"></i> Edit
                        </a>
                        <button class="btn btn-outline btn-delete btn-small" data-id="${theatre.theater_id}" data-name="${theatre.name}" title="Delete">
                            <i class="fas fa-trash-alt"></i> Delete
                        </button>
                    `;
                });
                addTheatreDeleteEventListeners();
            }
        } catch (error) {
            console.error('Error fetching theatres:', error);
            displayMessage(messageAreaManage, `Error loading theatres: ${error.message}`, 'error');
        } finally {
            if (loadingTheatresTableIndicator) loadingTheatresTableIndicator.style.display = 'none';
        }
    }

    function addTheatreDeleteEventListeners() {
        const deleteButtons = document.querySelectorAll('#theatresTable .btn-delete');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const theatreId = e.currentTarget.dataset.id;
                const theatreName = e.currentTarget.dataset.name;
                if (confirm(`Are you sure you want to delete "${theatreName}" (ID: ${theatreId})? This will also delete all its screens, seats, showtimes, and related bookings.`)) {
                    try {
                        const response = await fetch(`/api/theatres/${theatreId}`, { method: 'DELETE' });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.message || 'Failed to delete theatre.');
                        
                        displayMessage(messageAreaManage, result.message || `Theatre "${theatreName}" deleted successfully.`, 'success');
                        fetchAndDisplayTheatres(); // Refresh list
                    } catch (error) {
                        console.error('Error deleting theatre:', error);
                        displayMessage(messageAreaManage, `Error deleting theatre: ${error.message}`, 'error');
                    }
                }
            });
        });
    }

    // --- Logic for form-theatre.html ---
    const theatreForm = document.getElementById('theatreForm');
    const theatreFormTitle = document.getElementById('theatreFormTitle');
    const theatreIdInput = document.getElementById('theatreId'); // Hidden input
    const theatreFormSubmitButtonText = document.getElementById('theatreFormSubmitButtonText');
    
    const theatreNameInput = document.getElementById('theatreNameInput');
    const theatreLocationInput = document.getElementById('theatreLocationInput');
    const theatreTotalSeatsInput = document.getElementById('theatreTotalSeatsInput'); // General capacity
    const screensContainerDynamic = document.getElementById('screensContainerDynamic');
    const addScreenEntryButton = document.getElementById('addScreenEntryButton');
    let screenEntryCount = 0;

    function createScreenEntryHTML(screen = null, count) {
        const screenNumber = screen ? screen.screen_number : count;
        const totalSeats = screen ? screen.total_seats : '';
        const screenId = screen ? screen.screen_id : ''; // For existing screens during edit

        return `
            <div class="screen-entry-card" data-screen-id="${screenId || ''}">
                <div class="screen-entry-header">
                   <h5>Screen ${count} ${screenId ? `(ID: ${screenId})` : '(New)'}</h5>
                   ${screensContainerDynamic.children.length > 0 || screenId ? '<button type="button" class="remove-screen-btn" aria-label="Remove Screen">&times;</button>' : ''}
                </div>
                <div class="form-group">
                    <label>Screen Number</label>
                    <input type="number" name="screen_number[]" class="form-control screen-number-input" required min="1" value="${screenNumber}">
                </div>
                <div class="form-group">
                    <label>Total Seats for this Screen</label>
                    <input type="number" name="screen_total_seats[]" class="form-control screen-seats-input" required min="1" value="${totalSeats}">
                </div>
                ${screenId ? `<input type="hidden" name="existing_screen_id[]" value="${screenId}">` : ''}
            </div>
        `;
    }
    
    if (addScreenEntryButton) {
        addScreenEntryButton.addEventListener('click', () => {
            screenEntryCount = screensContainerDynamic.children.length + 1;
            const newScreenHTML = createScreenEntryHTML(null, screenEntryCount);
            screensContainerDynamic.insertAdjacentHTML('beforeend', newScreenHTML);
        });
    }

    if (screensContainerDynamic) {
        screensContainerDynamic.addEventListener('click', function(event) {
            if (event.target.classList.contains('remove-screen-btn')) {
                // For "Add New Theatre", always keep at least one screen.
                // For "Edit Theatre", allow removing screens (backend will handle deletion).
                const isEditing = !!(theatreIdInput && theatreIdInput.value);
                if (!isEditing && screensContainerDynamic.children.length <= 1) {
                     displayMessage(messageAreaForm, 'At least one screen is required when adding a new theatre.', 'warning');
                     return;
                }
                event.target.closest('.screen-entry-card').remove();
                // Re-number screen headers visually (optional)
                const screenHeaders = screensContainerDynamic.querySelectorAll('.screen-entry-header h5');
                screenHeaders.forEach((header, index) => {
                    const existingIdMatch = header.textContent.match(/\(ID: (\d+)\)/);
                    const idSuffix = existingIdMatch ? ` ${existingIdMatch[0]}` : (header.textContent.includes('(New)') ? ' (New)' : '');
                    header.textContent = `Screen ${index + 1}${idSuffix}`;
                });
                screenEntryCount = screenHeaders.length;
            }
        });
    }


    async function loadTheatreForEditing(id) {
        try {
            const response = await fetch(`/api/theatres/${id}`); // This endpoint should return screens too
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Failed to fetch theatre details for editing.');
            }
            const theatre = await response.json();

            if (theatreIdInput) theatreIdInput.value = theatre.theater_id;
            if (theatreNameInput) theatreNameInput.value = theatre.name;
            if (theatreLocationInput) theatreLocationInput.value = theatre.location;
            if (theatreTotalSeatsInput) theatreTotalSeatsInput.value = theatre.total_seats;

            if (screensContainerDynamic) {
                screensContainerDynamic.innerHTML = ''; // Clear any default
                screenEntryCount = 0;
                if (theatre.screens && theatre.screens.length > 0) {
                    theatre.screens.forEach(screen => {
                        screenEntryCount++;
                        screensContainerDynamic.insertAdjacentHTML('beforeend', createScreenEntryHTML(screen, screenEntryCount));
                    });
                } else { // Add one empty screen entry if no screens exist for an existing theatre
                     screenEntryCount++;
                     screensContainerDynamic.insertAdjacentHTML('beforeend', createScreenEntryHTML(null, screenEntryCount));
                }
            }

            if (theatreFormTitle) theatreFormTitle.innerHTML = `<i class="fas fa-edit"></i>Edit Theatre: ${theatre.name}`;
            if (theatreFormSubmitButtonText) theatreFormSubmitButtonText.textContent = 'Update Theatre';

        } catch (error) {
            console.error('Error loading theatre for editing:', error);
            displayMessage(messageAreaForm, `Error loading theatre data: ${error.message}`, 'error');
            if (theatreFormTitle) theatreFormTitle.innerHTML = `<i class="fas fa-exclamation-triangle"></i>Error Loading Theatre`;
        }
    }

    if (theatreForm) {
        const urlParams = new URLSearchParams(window.location.search);
        const editTheatreId = urlParams.get('edit');

        if (editTheatreId) {
            loadTheatreForEditing(editTheatreId);
        } else {
            if (theatreFormTitle) theatreFormTitle.innerHTML = `<i class="fas fa-plus-circle"></i>Add New Theatre`;
            if (theatreFormSubmitButtonText) theatreFormSubmitButtonText.textContent = 'Save Theatre & Screens';
            // Add one default screen entry for new theatres
            if (screensContainerDynamic && screensContainerDynamic.children.length === 0) {
                screenEntryCount++;
                screensContainerDynamic.insertAdjacentHTML('beforeend', createScreenEntryHTML(null, screenEntryCount));
            }
        }

        theatreForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            if (messageAreaForm) messageAreaForm.style.display = 'none';

            const screensData = [];
            const screenNumberInputs = screensContainerDynamic.querySelectorAll('.screen-number-input');
            const screenSeatsInputs = screensContainerDynamic.querySelectorAll('.screen-seats-input');
            const existingScreenIdElements = screensContainerDynamic.querySelectorAll('input[name="existing_screen_id[]"]');


            let screensValid = true;
            const uniqueScreenNumbers = new Set();

            for (let i = 0; i < screenNumberInputs.length; i++) {
                const number = screenNumberInputs[i].value.trim();
                const seats = screenSeatsInputs[i].value.trim();
                const existingId = existingScreenIdElements[i] ? existingScreenIdElements[i].value : null;


                if (!number || !seats || parseInt(number) < 1 || parseInt(seats) < 1) {
                    screensValid = false;
                    displayMessage(messageAreaForm, `Invalid data for Screen ${i + 1}. Screen number and seats must be positive.`, 'error');
                    screenNumberInputs[i].focus();
                    break;
                }
                 if (uniqueScreenNumbers.has(number)) {
                    screensValid = false;
                    displayMessage(messageAreaForm, `Duplicate screen number: ${number}. Screen numbers must be unique.`, 'error');
                    screenNumberInputs[i].focus();
                    break;
                }
                uniqueScreenNumbers.add(number);

                screensData.push({
                    screen_id: existingId ? parseInt(existingId) : null, // Include existing screen_id if present
                    screen_number: parseInt(number),
                    total_seats: parseInt(seats)
                });
            }
            if (!screensValid) return;
            
            const currentTheatreId = theatreIdInput.value; // From hidden input
            const payload = {
                name: theatreNameInput.value,
                location: theatreLocationInput.value,
                total_seats: parseInt(theatreTotalSeatsInput.value),
                screens: screensData // This array includes screen_id for existing, null for new
            };

            const method = currentTheatreId ? 'PUT' : 'POST';
            const url = currentTheatreId ? `/api/theatres/${currentTheatreId}` : '/api/theatres';

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || `Failed to ${currentTheatreId ? 'update' : 'add'} theatre.`);
                }
                displayMessage(messageAreaForm, result.message || `Theatre ${currentTheatreId ? 'updated' : 'added'} successfully!`, 'success');
                
                if (!currentTheatreId) { // If ADD operation
                    theatreForm.reset();
                    screensContainerDynamic.innerHTML = createScreenEntryHTML(null, 1); // Reset to one screen
                    screenEntryCount = 1;
                } else { // If UPDATE operation
                     setTimeout(() => { window.location.href = '/admin/manage-theatres.html'; }, 2000);
                }
            } catch (error) {
                console.error(`Error ${currentTheatreId ? 'updating' : 'adding'} theatre:`, error);
                displayMessage(messageAreaForm, error.message || 'An unexpected error occurred.', 'error');
            }
        });
    }

    // --- Page Initialization ---
    function initializePage() {
        const currentPath = window.location.pathname;
        if (currentPath.includes('/admin/manage-theatres.html')) {
            fetchAndDisplayTheatres();
        }
        // Logic for form-theatre.html is handled by checking URL params within its own block.

        const navLinks = document.querySelectorAll('.admin-nav li a');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (currentPath.startsWith(link.getAttribute('href'))) {
                 if (currentPath.includes('form-theatre.html') && link.getAttribute('href').includes('manage-theatres.html')) {
                    link.classList.add('active');
                } else if (link.getAttribute('href') === currentPath) {
                    link.classList.add('active');
                }
            } else if (currentPath === '/admin/dashboard.html' && link.id === 'navDashboard') {
                 link.classList.add('active');
            }
        });
    }
    initializePage();
});
