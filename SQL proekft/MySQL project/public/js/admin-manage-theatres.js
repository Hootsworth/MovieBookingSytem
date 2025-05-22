// public/js/admin-manage-theatres.js
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initializeCommon === 'function') {
        initializeCommon(); // Handles user welcome, logout, footer year, and admin check
    }

    const addTheatreForm = document.getElementById('addTheatreForm');
    const addTheatreMessage = document.getElementById('addTheatreMessage');
    const screensContainer = document.getElementById('screensContainer');
    const addScreenButton = document.getElementById('addScreenButton');
    let screenCount = 1; // Start with 1 since the first screen is already in HTML

    function displayFormMessage(message, type = 'error') {
        if (!addTheatreMessage) return;
        addTheatreMessage.innerHTML = `<p class="${type}">${message}</p>`;
        addTheatreMessage.className = `message-area ${type}`;
        addTheatreMessage.style.display = 'block';
        setTimeout(() => { addTheatreMessage.style.display = 'none'; addTheatreMessage.innerHTML = ''; }, 7000);
    }

    if (addScreenButton) {
        addScreenButton.addEventListener('click', () => {
            screenCount++;
            const newScreenEntry = document.createElement('div');
            newScreenEntry.classList.add('screen-entry-card');
            newScreenEntry.innerHTML = `
                <div class="screen-entry-header">
                   <h4>Screen ${screenCount}</h4>
                   <button type="button" class="remove-screen-btn" aria-label="Remove Screen ${screenCount}">&times;</button>
                </div>
                <div class="form-group">
                    <label for="screenNumber${screenCount}">Screen Number</label>
                    <input type="number" name="screen_number[]" class="form-control screen-number-input" required min="1" value="${screenCount}">
                </div>
                <div class="form-group">
                    <label for="screenTotalSeats${screenCount}">Total Seats for this Screen</label>
                    <input type="number" name="screen_total_seats[]" class="form-control screen-seats-input" required min="1">
                </div>
            `;
            screensContainer.appendChild(newScreenEntry);
        });
    }

    if (screensContainer) {
        screensContainer.addEventListener('click', function(event) {
            if (event.target.classList.contains('remove-screen-btn')) {
                if (screensContainer.children.length > 1) { // Always keep at least one screen
                    event.target.closest('.screen-entry-card').remove();
                    // Renumbering screen headers is optional, data submission relies on array order
                    // If renumbering is needed:
                    // const remainingScreenHeaders = screensContainer.querySelectorAll('.screen-entry-header h4');
                    // remainingScreenHeaders.forEach((header, index) => {
                    //     header.textContent = `Screen ${index + 1}`;
                    // });
                    // screenCount = remainingScreenHeaders.length; // Update screenCount if renumbering
                } else {
                    displayFormMessage('At least one screen is required for the theatre.', 'warning');
                }
            }
        });
    }

    if (addTheatreForm) {
        addTheatreForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            addTheatreMessage.style.display = 'none';

            const theatreName = document.getElementById('theatreName').value;
            const theatreLocation = document.getElementById('theatreLocation').value;
            const theatreTotalSeats = document.getElementById('theatreTotalSeats').value; // General capacity

            const screensData = [];
            const screenNumberInputs = screensContainer.querySelectorAll('.screen-number-input');
            const screenSeatsInputs = screensContainer.querySelectorAll('.screen-seats-input');
            
            let screensValid = true;
            const uniqueScreenNumbers = new Set();

            for (let i = 0; i < screenNumberInputs.length; i++) {
                const number = screenNumberInputs[i].value.trim();
                const seats = screenSeatsInputs[i].value.trim();

                if (!number || !seats || parseInt(number) < 1 || parseInt(seats) < 1) {
                    screensValid = false;
                    displayFormMessage(`Invalid data for Screen ${i+1}. Screen number and seats must be positive.`, 'error');
                    screenNumberInputs[i].focus();
                    break;
                }
                if (uniqueScreenNumbers.has(number)) {
                    screensValid = false;
                    displayFormMessage(`Duplicate screen number: ${number}. Screen numbers must be unique within this theatre.`, 'error');
                    screenNumberInputs[i].focus();
                    break;
                }
                uniqueScreenNumbers.add(number);

                screensData.push({
                    screen_number: parseInt(number),
                    total_seats: parseInt(seats)
                });
            }

            if (!screensValid) return;

            if (screensData.length === 0) { // Should be prevented by UI logic (not removing last screen)
                displayFormMessage('At least one screen must be defined for the theatre.', 'error');
                return;
            }

            const payload = {
                name: theatreName,
                location: theatreLocation,
                total_seats: parseInt(theatreTotalSeats), // This is for Theatres table
                screens: screensData // This array will be used to create Screen and Seat records
            };

            try {
                const response = await fetch('/api/theatres', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to add theatre.');
                }

                displayFormMessage(`Theatre "${result.theatre.name}" and its screens/seats added successfully!`, 'success');
                addTheatreForm.reset();
                // Reset screens container to initial state
                screensContainer.innerHTML = `
                    <div class="screen-entry-card">
                        <div class="screen-entry-header">
                           <h4>Screen 1</h4>
                        </div>
                        <div class="form-group">
                            <label for="screenNumber1">Screen Number</label>
                            <input type="number" name="screen_number[]" class="form-control screen-number-input" required min="1" value="1">
                        </div>
                        <div class="form-group">
                            <label for="screenTotalSeats1">Total Seats for this Screen</label>
                            <input type="number" name="screen_total_seats[]" class="form-control screen-seats-input" required min="1">
                        </div>
                    </div>`;
                screenCount = 1;

            } catch (error) {
                console.error('Error adding theatre:', error);
                displayFormMessage(error.message || 'An unexpected error occurred.', 'error');
            }
        });
    }
     // Set active link in sidebar
    function setActiveAdminNavLink() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.admin-nav li a');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });
    }
    setActiveAdminNavLink();
});
