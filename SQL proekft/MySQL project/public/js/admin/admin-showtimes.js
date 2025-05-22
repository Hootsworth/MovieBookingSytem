// public/js/admin/admin-showtimes.js
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initializeCommon === 'function') {
        initializeCommon(); // Handles user welcome, logout, footer year, and admin check
    }

    // Determine if we're on the showtimes list page or the form page
    const isManagePage = document.getElementById('showtimesTable') !== null;
    const isFormPage = document.getElementById('showtimeForm') !== null;

    // ===== SHOWTIME LISTING PAGE FUNCTIONALITY =====
    if (isManagePage) {
        const showtimesTable = document.getElementById('showtimesTable');
        const showtimesTableBody = showtimesTable.querySelector('tbody');
        const manageShowtimesMessage = document.getElementById('manageShowtimesMessage');
        const loadingShowtimesTableIndicator = document.getElementById('loadingShowtimesTableIndicator');
        
        // Filter elements
        const filterShowtimeDate = document.getElementById('filterShowtimeDate');
        const filterShowtimeMovie = document.getElementById('filterShowtimeMovie');
        const filterShowtimeTheatre = document.getElementById('filterShowtimeTheatre');
        const applyShowtimeFiltersBtn = document.getElementById('applyShowtimeFiltersBtn');
        const resetShowtimeFiltersBtn = document.getElementById('resetShowtimeFiltersBtn');

        // Display message function for the manage page
        function displayManageMessage(message, type = 'error') {
            if (!manageShowtimesMessage) return;
            manageShowtimesMessage.innerHTML = `<p class="${type}">${message}</p>`;
            manageShowtimesMessage.className = `message-area ${type}`;
            manageShowtimesMessage.style.display = 'block';
            
            if (type !== 'error') {
                setTimeout(() => { 
                    manageShowtimesMessage.style.display = 'none'; 
                    manageShowtimesMessage.innerHTML = ''; 
                }, 5000);
            }
        }

        // Format date function
        function formatDate(dateString) {
            const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
            return new Date(dateString).toLocaleDateString(undefined, options);
        }

        // Format time function (convert 24h to 12h format with AM/PM)
        function formatTime(timeString) {
            const timeParts = timeString.split(':');
            let hours = parseInt(timeParts[0], 10);
            const minutes = timeParts[1];
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12; // the hour '0' should be '12'
            return `${hours}:${minutes} ${ampm}`;
        }

        // Fetch and display showtimes
        async function fetchShowtimes(filters = {}) {
            if (loadingShowtimesTableIndicator) loadingShowtimesTableIndicator.style.display = 'block';
            if (manageShowtimesMessage) manageShowtimesMessage.style.display = 'none';

            try {
                // Build query string for filters
                const queryParams = new URLSearchParams();
                if (filters.date) queryParams.append('date', filters.date);
                if (filters.movie_id) queryParams.append('movie_id', filters.movie_id);
                if (filters.theater_id) queryParams.append('theater_id', filters.theater_id);
                
                const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
                const response = await fetch(`/api/showtimes${queryString}`);
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Failed to fetch showtimes (status ${response.status})`);
                }
                
                const showtimes = await response.json();
                showtimesTableBody.innerHTML = ''; // Clear existing rows
                
                if (showtimes.length === 0) {
                    // No showtimes found
                    const noDataRow = document.createElement('tr');
                    noDataRow.innerHTML = `<td colspan="8" class="text-center">No showtimes found. Try adjusting your filters or add a new showtime.</td>`;
                    showtimesTableBody.appendChild(noDataRow);
                } else {
                    // Populate table with showtime data
                    showtimes.forEach(showtime => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${showtime.showtime_id}</td>
                            <td>${showtime.movie_title || `ID: ${showtime.movie_id}`}</td>
                            <td>${showtime.theatre_name || `ID: ${showtime.theater_id}`}</td>
                            <td>${showtime.screen_number ? `Screen ${showtime.screen_number}` : `ID: ${showtime.screen_id}`}</td>
                            <td>${formatDate(showtime.show_date)}</td>
                            <td>${formatTime(showtime.show_time)}</td>
                            <td>${showtime.available_seats}</td>
                            <td class="actions">
                                <a href="/admin/form-showtime.html?id=${showtime.showtime_id}" class="btn btn-outline btn-small btn-edit">
                                    <i class="fas fa-edit"></i> Edit
                                </a>
                                <button class="btn btn-outline btn-small btn-delete" data-id="${showtime.showtime_id}">
                                    <i class="fas fa-trash-alt"></i> Delete
                                </button>
                            </td>
                        `;
                        showtimesTableBody.appendChild(row);
                    });

                    // Add event listeners to delete buttons
                    document.querySelectorAll('.btn-delete').forEach(button => {
                        button.addEventListener('click', function() {
                            const showtimeId = this.getAttribute('data-id');
                            if (confirm('Are you sure you want to delete this showtime? This action cannot be undone.')) {
                                deleteShowtime(showtimeId);
                            }
                        });
                    });
                }
            } catch (error) {
                console.error('Error fetching showtimes:', error);
                displayManageMessage(`Failed to load showtimes: ${error.message}`, 'error');
            } finally {
                if (loadingShowtimesTableIndicator) loadingShowtimesTableIndicator.style.display = 'none';
            }
        }

        // Delete showtime function
        async function deleteShowtime(showtimeId) {
            try {
                const response = await fetch(`/api/showtimes/${showtimeId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Failed to delete showtime (status ${response.status})`);
                }
                
                const result = await response.json();
                displayManageMessage(result.message || 'Showtime deleted successfully', 'success');
                // Reload showtimes after successful deletion
                fetchShowtimes(getActiveFilters());
            } catch (error) {
                console.error('Error deleting showtime:', error);
                displayManageMessage(`Failed to delete showtime: ${error.message}`, 'error');
            }
        }

        // Get current filter values
        function getActiveFilters() {
            return {
                date: filterShowtimeDate?.value || '',
                movie_id: filterShowtimeMovie?.value || '',
                theater_id: filterShowtimeTheatre?.value || ''
            };
        }

        // Initialize filter dropdowns
        async function initializeFilters() {
            try {
                // Populate movie filter
                const moviesResponse = await fetch('/api/movies');
                if (moviesResponse.ok) {
                    const movies = await moviesResponse.json();
                    filterShowtimeMovie.innerHTML = '<option value="">All Movies</option>';
                    movies.forEach(movie => {
                        const option = document.createElement('option');
                        option.value = movie.movie_id;
                        option.textContent = movie.title;
                        filterShowtimeMovie.appendChild(option);
                    });
                }
                
                // Populate theatre filter
                const theatresResponse = await fetch('/api/theatres');
                if (theatresResponse.ok) {
                    const theatres = await theatresResponse.json();
                    filterShowtimeTheatre.innerHTML = '<option value="">All Theatres</option>';
                    theatres.forEach(theatre => {
                        const option = document.createElement('option');
                        option.value = theatre.theater_id;
                        option.textContent = theatre.name;
                        filterShowtimeTheatre.appendChild(option);
                    });
                }
            } catch (error) {
                console.error('Error initializing filters:', error);
                displayManageMessage('Failed to load filter options. Some filters may be unavailable.', 'warning');
            }
        }

        // Set up event listeners for filters
        if (applyShowtimeFiltersBtn) {
            applyShowtimeFiltersBtn.addEventListener('click', function() {
                fetchShowtimes(getActiveFilters());
            });
        }

        if (resetShowtimeFiltersBtn) {
            resetShowtimeFiltersBtn.addEventListener('click', function() {
                if (filterShowtimeDate) filterShowtimeDate.value = '';
                if (filterShowtimeMovie) filterShowtimeMovie.value = '';
                if (filterShowtimeTheatre) filterShowtimeTheatre.value = '';
                fetchShowtimes(); // Fetch without filters
            });
        }

        // Initialize the page
        initializeFilters();
        fetchShowtimes(); // Load all showtimes initially
    }

    // ===== SHOWTIME FORM PAGE FUNCTIONALITY =====
    if (isFormPage) {
        const showtimeForm = document.getElementById('showtimeForm');
        const showtimeFormTitle = document.getElementById('showtimeFormTitle');
        const showtimeFormMessage = document.getElementById('showtimeFormMessage');
        const showtimeFormSubmitButtonText = document.getElementById('showtimeFormSubmitButtonText');
        
        // Form fields
        const showtimeId = document.getElementById('showtimeId');
        const showtimeMovieSelect = document.getElementById('showtimeMovieSelect');
        const showtimeTheatreSelect = document.getElementById('showtimeTheatreSelect');
        const showtimeScreenSelect = document.getElementById('showtimeScreenSelect');
        const showtimeShowDateInput = document.getElementById('showtimeShowDateInput');
        const showtimeShowTimeInput = document.getElementById('showtimeShowTimeInput');
        const showtimeAvailableSeatsInput = document.getElementById('showtimeAvailableSeatsInput');
        const availableSeatsGroup = document.getElementById('availableSeatsGroup');

        // Display message function for the form page
        function displayFormMessage(message, type = 'error') {
            if (!showtimeFormMessage) return;
            showtimeFormMessage.innerHTML = `<p class="${type}">${message}</p>`;
            showtimeFormMessage.className = `message-area ${type}`;
            showtimeFormMessage.style.display = 'block';
            
            if (type !== 'error') {
                setTimeout(() => { 
                    showtimeFormMessage.style.display = 'none'; 
                    showtimeFormMessage.innerHTML = ''; 
                }, 5000);
            }
        }

        // Set min date for date input to today
        function setMinDateToToday() {
            if (showtimeShowDateInput) {
                const today = new Date().toISOString().split('T')[0];
                showtimeShowDateInput.setAttribute('min', today);
            }
        }

        // Populate movie dropdown
        async function populateMovies() {
            if (!showtimeMovieSelect) return;
            try {
                const response = await fetch('/api/movies');
                if (!response.ok) throw new Error('Failed to fetch movies');
                const movies = await response.json();
                showtimeMovieSelect.innerHTML = '<option value="">Select a Movie</option>';
                movies.forEach(movie => {
                    const option = document.createElement('option');
                    option.value = movie.movie_id;
                    option.textContent = `${movie.title} (${new Date(movie.release_date).getFullYear()})`;
                    showtimeMovieSelect.appendChild(option);
                });
            } catch (error) {
                console.error('Error populating movies:', error);
                showtimeMovieSelect.innerHTML = '<option value="">Error loading movies</option>';
            }
        }

        // Populate theatre dropdown
        async function populateTheatres() {
            if (!showtimeTheatreSelect) return;
            try {
                const response = await fetch('/api/theatres');
                if (!response.ok) throw new Error('Failed to fetch theatres');
                const theatres = await response.json();
                showtimeTheatreSelect.innerHTML = '<option value="">Select a Theatre</option>';
                theatres.forEach(theatre => {
                    const option = document.createElement('option');
                    option.value = theatre.theater_id;
                    option.textContent = `${theatre.name} (${theatre.location})`;
                    showtimeTheatreSelect.appendChild(option);
                });
            } catch (error) {
                console.error('Error populating theatres:', error);
                showtimeTheatreSelect.innerHTML = '<option value="">Error loading theatres</option>';
            }
        }

        // Populate screens based on selected theatre
        async function populateScreens(theatreId) {
            if (!showtimeScreenSelect || !theatreId) {
                if (showtimeScreenSelect) {
                    showtimeScreenSelect.innerHTML = '<option value="">Select a theatre first</option>';
                    showtimeScreenSelect.disabled = true;
                }
                return;
            }
            showtimeScreenSelect.innerHTML = '<option value="">Loading screens...</option>';
            showtimeScreenSelect.disabled = true;

            try {
                const response = await fetch(`/api/theatres/${theatreId}`);
                if (!response.ok) throw new Error('Failed to fetch screens for the selected theatre');
                const theatreDetails = await response.json();
                
                showtimeScreenSelect.innerHTML = '<option value="">Select a Screen</option>';
                if (theatreDetails.screens && theatreDetails.screens.length > 0) {
                    theatreDetails.screens.forEach(screen => {
                        const option = document.createElement('option');
                        option.value = screen.screen_id;
                        option.textContent = `Screen ${screen.screen_number} (Seats: ${screen.total_seats})`;
                        option.dataset.totalSeats = screen.total_seats; // Store for available seats default
                        showtimeScreenSelect.appendChild(option);
                    });
                    showtimeScreenSelect.disabled = false;
                } else {
                    showtimeScreenSelect.innerHTML = '<option value="">No screens available for this theatre</option>';
                    showtimeScreenSelect.disabled = true;
                }
            } catch (error) {
                console.error('Error populating screens:', error);
                showtimeScreenSelect.innerHTML = '<option value="">Error loading screens</option>';
                showtimeScreenSelect.disabled = true;
            }
        }

        // Load showtime details for editing
        async function loadShowtimeDetails(showtimeId) {
            try {
                const response = await fetch(`/api/showtimes/${showtimeId}`);
                if (!response.ok) throw new Error('Failed to fetch showtime details');
                const showtime = await response.json();
                
                // Update page title for editing
                if (showtimeFormTitle) {
                    showtimeFormTitle.innerHTML = '<i class="fas fa-edit"></i>Edit Showtime';
                }
                if (showtimeFormSubmitButtonText) {
                    showtimeFormSubmitButtonText.textContent = 'Update Showtime';
                }
                
                // Set form field values
                if (showtimeId) document.getElementById('showtimeId').value = showtime.showtime_id;
                if (showtimeMovieSelect) showtimeMovieSelect.value = showtime.movie_id;
                
                // Load theatre first, then screens, then set screen
                if (showtimeTheatreSelect) {
                    showtimeTheatreSelect.value = showtime.theater_id;
                    await populateScreens(showtime.theater_id);
                    if (showtimeScreenSelect) showtimeScreenSelect.value = showtime.screen_id;
                }
                
                if (showtimeShowDateInput) showtimeShowDateInput.value = showtime.show_date;
                if (showtimeShowTimeInput) {
                    // Format time to HH:MM format if needed
                    const timeForInput = showtime.show_time.substr(0, 5);
                    showtimeShowTimeInput.value = timeForInput;
                }
                
                // Show available seats field for editing (hidden for new showtimes)
                if (availableSeatsGroup) availableSeatsGroup.style.display = 'block';
                if (showtimeAvailableSeatsInput) showtimeAvailableSeatsInput.value = showtime.available_seats;
                
            } catch (error) {
                console.error('Error loading showtime details:', error);
                displayFormMessage(`Failed to load showtime details: ${error.message}`, 'error');
            }
        }

        // Set up event handlers for form interaction
        if (showtimeTheatreSelect) {
            showtimeTheatreSelect.addEventListener('change', function() {
                const selectedTheatreId = this.value;
                populateScreens(selectedTheatreId);
            });
        }

        if (showtimeScreenSelect) {
            showtimeScreenSelect.addEventListener('change', function() {
                const selectedOption = this.options[this.selectedIndex];
                // If adding new showtime, update available seats to screen capacity
                if (!showtimeId.value && selectedOption && selectedOption.dataset.totalSeats) {
                    if (showtimeAvailableSeatsInput) {
                        showtimeAvailableSeatsInput.value = selectedOption.dataset.totalSeats;
                    }
                }
            });
        }

        // Handle form submission
        if (showtimeForm) {
            showtimeForm.addEventListener('submit', async function(event) {
                event.preventDefault();
                showtimeFormMessage.style.display = 'none';

                const formData = new FormData(showtimeForm);
                const showtimeData = {
                    movie_id: formData.get('movie_id'),
                    screen_id: formData.get('screen_id'),
                    show_date: formData.get('show_date'),
                    show_time: formData.get('show_time')
                };

                // Include available_seats only for editing existing showtimes
                if (formData.get('showtime_id') && formData.get('available_seats')) {
                    showtimeData.available_seats = formData.get('available_seats');
                }

                if (!showtimeData.movie_id || !showtimeData.screen_id || !showtimeData.show_date || !showtimeData.show_time) {
                    displayFormMessage('All fields (Movie, Screen, Date, Time) are required.', 'error');
                    return;
                }
                
                // Validate date is not in the past for new showtimes
                if (!formData.get('showtime_id')) { // Only for new showtimes
                    const selectedDate = new Date(showtimeData.show_date + 'T00:00:00');
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    
                    if (selectedDate < today) {
                        displayFormMessage('Show date cannot be in the past for new showtimes.', 'error');
                        return;
                    }
                }

                try {
                    const isUpdate = formData.get('showtime_id') ? true : false;
                    let url = '/api/showtimes';
                    let method = 'POST';
                    
                    if (isUpdate) {
                        url = `/api/showtimes/${formData.get('showtime_id')}`;
                        method = 'PUT';
                    }

                    const response = await fetch(url, {
                        method: method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(showtimeData)
                    });
                    
                    const result = await response.json();
                    if (!response.ok) {
                        throw new Error(result.message || `Failed to ${isUpdate ? 'update' : 'add'} showtime.`);
                    }

                    displayFormMessage(`Showtime ${isUpdate ? 'updated' : 'added'} successfully!`, 'success');
                    
                    // Redirect back to showtimes list after short delay
                    setTimeout(() => {
                        window.location.href = '/admin/manage-showtimes.html';
                    }, 1500);

                } catch (error) {
                    console.error(`Error ${formData.get('showtime_id') ? 'updating' : 'adding'} showtime:`, error);
                    displayFormMessage(error.message || 'An unexpected error occurred.', 'error');
                }
            });
        }

        // Check if we're editing an existing showtime
        const urlParams = new URLSearchParams(window.location.search);
        const editShowtimeId = urlParams.get('id');
        
        if (editShowtimeId) {
            loadShowtimeDetails(editShowtimeId);
        } else {
            // New showtime form setup
            setMinDateToToday();
            // Hide available seats input for new showtimes (set automatically)
            if (availableSeatsGroup) availableSeatsGroup.style.display = 'none';
        }

        // Initialize form dropdowns
        populateMovies();
        populateTheatres();
    }
});