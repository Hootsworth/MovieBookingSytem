// public/js/admin-manage-showtimes.js
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initializeCommon === 'function') {
        initializeCommon(); // Handles user welcome, logout, footer year, and admin check
    }

    const addShowtimeForm = document.getElementById('addShowtimeForm');
    const addShowtimeMessage = document.getElementById('addShowtimeMessage');
    const movieSelect = document.getElementById('showtimeMovieId');
    const theatreSelect = document.getElementById('showtimeTheatreId');
    const screenSelect = document.getElementById('showtimeScreenId');
    const showtimeDateInput = document.getElementById('showtimeDate');


    function displayFormMessage(message, type = 'error') {
        if (!addShowtimeMessage) return;
        addShowtimeMessage.innerHTML = `<p class="${type}">${message}</p>`;
        addShowtimeMessage.className = `message-area ${type}`;
        addShowtimeMessage.style.display = 'block';
        setTimeout(() => { addShowtimeMessage.style.display = 'none'; addShowtimeMessage.innerHTML = ''; }, 7000);
    }

    async function populateMovies() {
        if (!movieSelect) return;
        try {
            const response = await fetch('/api/movies');
            if (!response.ok) throw new Error('Failed to fetch movies');
            const movies = await response.json();
            movieSelect.innerHTML = '<option value="">Select a Movie</option>'; // Placeholder
            movies.forEach(movie => {
                const option = document.createElement('option');
                option.value = movie.movie_id;
                option.textContent = `${movie.title} (${new Date(movie.release_date).getFullYear()})`;
                movieSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating movies:', error);
            movieSelect.innerHTML = '<option value="">Error loading movies</option>';
        }
    }

    async function populateTheatres() {
        if (!theatreSelect) return;
        try {
            const response = await fetch('/api/theatres');
            if (!response.ok) throw new Error('Failed to fetch theatres');
            const theatres = await response.json();
            theatreSelect.innerHTML = '<option value="">Select a Theatre</option>'; // Placeholder
            theatres.forEach(theatre => {
                const option = document.createElement('option');
                option.value = theatre.theater_id;
                option.textContent = `${theatre.name} (${theatre.location})`;
                theatreSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Error populating theatres:', error);
            theatreSelect.innerHTML = '<option value="">Error loading theatres</option>';
        }
    }

    async function populateScreens(theatreId) {
        if (!screenSelect || !theatreId) {
            if(screenSelect) {
                screenSelect.innerHTML = '<option value="">Select a theatre first</option>';
                screenSelect.disabled = true;
            }
            return;
        }
        screenSelect.innerHTML = '<option value="">Loading screens...</option>';
        screenSelect.disabled = true;

        try {
            // The API endpoint /api/theatres/:id should return theatre details including its screens array
            const response = await fetch(`/api/theatres/${theatreId}`); 
            if (!response.ok) throw new Error('Failed to fetch screens for the selected theatre');
            const theatreDetails = await response.json();
            
            screenSelect.innerHTML = '<option value="">Select a Screen</option>';
            if (theatreDetails.screens && theatreDetails.screens.length > 0) {
                theatreDetails.screens.forEach(screen => {
                    const option = document.createElement('option');
                    option.value = screen.screen_id;
                    option.textContent = `Screen ${screen.screen_number} (Seats: ${screen.total_seats})`;
                    option.dataset.totalSeats = screen.total_seats; // Store total_seats for later use
                    screenSelect.appendChild(option);
                });
                screenSelect.disabled = false;
            } else {
                screenSelect.innerHTML = '<option value="">No screens available for this theatre</option>';
                screenSelect.disabled = true;
            }
        } catch (error) {
            console.error('Error populating screens:', error);
            screenSelect.innerHTML = '<option value="">Error loading screens</option>';
            screenSelect.disabled = true;
        }
    }
    
    // Set min date for showtimeDateInput to today
    if(showtimeDateInput){
        const today = new Date().toISOString().split('T')[0];
        showtimeDateInput.setAttribute('min', today);
    }


    if (theatreSelect) {
        theatreSelect.addEventListener('change', function() {
            const selectedTheatreId = this.value;
            populateScreens(selectedTheatreId);
        });
    }

    if (addShowtimeForm) {
        addShowtimeForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            addShowtimeMessage.style.display = 'none';

            const formData = new FormData(addShowtimeForm);
            const showtimeData = {
                movie_id: formData.get('movie_id'),
                // theatre_id is derived from screen on backend
                screen_id: formData.get('screen_id'),
                show_date: formData.get('show_date'),
                show_time: formData.get('show_time'),
                // available_seats is set on backend based on screen's total_seats
            };

            if (!showtimeData.movie_id || !showtimeData.screen_id || !showtimeData.show_date || !showtimeData.show_time) {
                displayFormMessage('All fields (Movie, Screen, Date, Time) are required.', 'error');
                return;
            }
            
            // Validate date is not in the past
            const selectedDate = new Date(showtimeData.show_date + 'T00:00:00'); // Ensure local timezone by not specifying Z
            const today = new Date();
            today.setHours(0,0,0,0); // Compare dates only

            if (selectedDate < today) {
                displayFormMessage('Show date cannot be in the past.', 'error');
                return;
            }


            try {
                const response = await fetch('/api/showtimes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(showtimeData)
                });
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to add showtime.');
                }

                displayFormMessage(`Showtime for "${result.showtime.movie_id}" (Movie ID) on ${result.showtime.show_date} at ${result.showtime.show_time} added successfully!`, 'success');
                addShowtimeForm.reset();
                // Reset dependent dropdowns
                if(screenSelect) {
                    screenSelect.innerHTML = '<option value="">Select a theatre first</option>';
                    screenSelect.disabled = true;
                }


            } catch (error) {
                console.error('Error adding showtime:', error);
                displayFormMessage(error.message || 'An unexpected error occurred.', 'error');
            }
        });
    }

    // Initial population of dropdowns
    populateMovies();
    populateTheatres();
    
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
