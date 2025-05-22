// public/js/admin/admin-movies.js
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initializeCommon === 'function') {
        initializeCommon(); // For header, footer, user info, admin check
    }

    // --- For form-movie.html (Add/Edit Movie Form) ---
    const movieForm = document.getElementById('movieForm');
    const movieFormTitle = document.getElementById('movieFormTitle');
    const movieIdInput = document.getElementById('movieId'); // Hidden input for movie_id
    // Movie detail inputs
    const movieTitleInput = document.getElementById('movieTitle');
    const movieGenreInput = document.getElementById('movieGenre');
    const movieDurationInput = document.getElementById('movieDuration');
    const movieReleaseDateInput = document.getElementById('movieReleaseDate');
    const moviePosterUrlInput = document.getElementById('moviePosterUrl');
    const movieBackdropUrlInput = document.getElementById('movieBackdropUrl');
    const movieTrailerUrlInput = document.getElementById('movieTrailerUrl'); // New trailer URL input
    const movieSynopsisInput = document.getElementById('movieSynopsis');
    const movieFormMessage = document.getElementById('movieFormMessage');
    const movieFormSubmitButtonText = document.getElementById('movieFormSubmitButtonText');

    // Cast Management Elements
    const addCastMemberButton = document.getElementById('addCastMemberButton');
    const castMembersContainer = document.getElementById('castMembersContainer');
    const castMemberTemplate = document.getElementById('castMemberTemplate');


    // --- For manage-movies.html (Movies Table) ---
    const moviesTableBody = document.querySelector('#moviesTable tbody');
    const loadingMoviesTableIndicator = document.getElementById('loadingMoviesTableIndicator');
    const manageMoviesMessage = document.getElementById('manageMoviesMessage');

    const urlParams = new URLSearchParams(window.location.search);
    const editMovieId = urlParams.get('edit_id');

    function displayMessage(element, message, type = 'info', duration = 5000) {
        if (!element) return;
        element.innerHTML = `<p class="${type}">${message}</p>`;
        element.className = `message-area ${type}`; // Ensure correct class for styling
        element.style.display = 'block';
        if (duration > 0) {
            setTimeout(() => {
                if (element.style.display !== 'none') { // Check if still visible before hiding
                    element.style.display = 'none';
                    element.innerHTML = '';
                }
            }, duration);
        }
    }
    
    function formatDateForInput(dateString) {
        if (!dateString) return '';
        try {
            // Assuming dateString is YYYY-MM-DD or can be parsed into that by Date
            const date = new Date(dateString);
            // Adjust for timezone offset to get the correct YYYY-MM-DD in local time for the input
            date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
            return date.toISOString().split('T')[0];
        } catch (e) { 
            console.warn("Could not format date for input:", dateString, e);
            // Fallback for dates already in YYYY-MM-DD or if parsing fails
            if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                return dateString;
            }
            return ''; // Or handle error appropriately
        }
    }


    function isValidHttpUrl(string) {
        if (!string) return true; // Allow empty URLs (will be stored as NULL)
        let url;
        try {
            url = new URL(string);
        } catch (_) {
            return false;  
        }
        return url.protocol === "http:" || url.protocol === "https:";
    }

    // --- Cast Management Functions for Movie Form ---
    function createCastMemberFormEntry(castMemberData = {}) {
        if (!castMemberTemplate || !castMembersContainer) {
            console.error("Cast member template or container not found.");
            return;
        }

        const templateContent = castMemberTemplate.content.cloneNode(true);
        const entryDiv = templateContent.querySelector('.cast-member-entry');
        if (!entryDiv) {
            console.error("'.cast-member-entry' not found in template.");
            return;
        }
        
        // Populate fields if data is provided (for editing)
        const castIdInput = entryDiv.querySelector('.cast-id-input');
        if (castIdInput && castMemberData.cast_id) { 
            castIdInput.value = castMemberData.cast_id;
        }

        const personNameInput = entryDiv.querySelector('.cast-person-name');
        if (personNameInput) personNameInput.value = castMemberData.person_name || '';
        
        const roleSelect = entryDiv.querySelector('.cast-role-type');
        if (roleSelect) roleSelect.value = castMemberData.role_type || 'Actor';
        
        const characterNameGroup = entryDiv.querySelector('.character-name-group');
        const characterNameInput = entryDiv.querySelector('.cast-character-name');
        
        function toggleCharacterNameField() {
            if (roleSelect && characterNameGroup && characterNameInput) {
                if (roleSelect.value === 'Actor') {
                    characterNameGroup.style.display = 'block';
                    characterNameInput.required = true; // Make it required for actors
                } else {
                    characterNameGroup.style.display = 'none';
                    characterNameInput.value = ''; 
                    characterNameInput.required = false;
                }
            }
        }

        if (characterNameInput) characterNameInput.value = castMemberData.character_name || '';
        if (roleSelect) roleSelect.addEventListener('change', toggleCharacterNameField);
        toggleCharacterNameField(); // Initial call to set visibility

        const imageUrlInput = entryDiv.querySelector('.cast-image-url');
        if (imageUrlInput) imageUrlInput.value = castMemberData.image_url || '';

        const displayOrderInput = entryDiv.querySelector('.cast-display-order');
        if (displayOrderInput) displayOrderInput.value = castMemberData.display_order !== undefined ? castMemberData.display_order : 0;
        
        const removeButton = entryDiv.querySelector('.btn-remove-cast');
        if (removeButton) {
            removeButton.addEventListener('click', () => {
                entryDiv.remove();
            });
        }

        castMembersContainer.appendChild(templateContent);
    }


    if (addCastMemberButton) {
        addCastMemberButton.addEventListener('click', () => createCastMemberFormEntry());
    }

    // Populate form if editing a movie
    if (movieForm && editMovieId) {
        if (movieFormTitle) movieFormTitle.innerHTML = '<i class="fas fa-edit"></i> Edit Movie';
        if (movieFormSubmitButtonText) movieFormSubmitButtonText.textContent = 'Update Movie';

        fetch(`/api/movies/${editMovieId}`)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(err => { throw new Error(err.message || `Failed to fetch movie details (ID: ${editMovieId})`); });
                }
                return response.json();
            })
            .then(movie => {
                if (!movie) {
                    throw new Error(`Movie with ID ${editMovieId} not found.`);
                }
                if (movieIdInput) movieIdInput.value = movie.movie_id;
                if (movieTitleInput) movieTitleInput.value = movie.title;
                if (movieGenreInput) movieGenreInput.value = movie.genre;
                if (movieDurationInput) movieDurationInput.value = movie.duration;
                if (movieReleaseDateInput) movieReleaseDateInput.value = formatDateForInput(movie.release_date);
                if (moviePosterUrlInput) moviePosterUrlInput.value = movie.poster_image_url || '';
                if (movieBackdropUrlInput) movieBackdropUrlInput.value = movie.backdrop_image_url || '';
                if (movieTrailerUrlInput) movieTrailerUrlInput.value = movie.trailer_youtube_url || ''; // Populate trailer URL
                if (movieSynopsisInput) movieSynopsisInput.value = movie.synopsis || '';

                if (movie.cast_and_crew && castMembersContainer) {
                    castMembersContainer.innerHTML = ''; 
                    movie.cast_and_crew.forEach(castMember => createCastMemberFormEntry(castMember));
                } else if (castMembersContainer) {
                     castMembersContainer.innerHTML = ''; 
                }
            })
            .catch(error => {
                console.error('Error fetching movie for edit:', error);
                displayMessage(movieFormMessage, `Error loading movie data: ${error.message}`, 'error');
            });
    } else if (movieForm) { 
        if (movieFormTitle) movieFormTitle.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Movie';
        if (movieFormSubmitButtonText) movieFormSubmitButtonText.textContent = 'Save Movie';
        // createCastMemberFormEntry(); // Optionally add one empty cast member form by default for new movies
    }

    // Handle Add/Edit Movie Form Submission
    if (movieForm) {
        movieForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            displayMessage(movieFormMessage, 'Processing...', 'info', 0); 

            const movieData = {
                title: movieTitleInput.value.trim(),
                genre: movieGenreInput.value.trim(),
                duration: parseInt(movieDurationInput.value),
                release_date: movieReleaseDateInput.value,
                poster_image_url: moviePosterUrlInput.value.trim() || null,
                backdrop_image_url: movieBackdropUrlInput.value.trim() || null,
                trailer_youtube_url: movieTrailerUrlInput.value.trim() || null, // Get trailer URL
                synopsis: movieSynopsisInput.value.trim() || null,
                cast_and_crew: []
            };

            // Basic client-side validation (more comprehensive validation on backend)
            if (!movieData.title || !movieData.genre || !movieData.duration || !movieData.release_date) {
                displayMessage(movieFormMessage, 'Title, Genre, Duration, and Release Date are required.', 'error'); return;
            }
            if (isNaN(movieData.duration) || movieData.duration <= 0) {
                displayMessage(movieFormMessage, 'Duration must be a positive number.', 'error'); return;
            }
            if (movieData.poster_image_url && !isValidHttpUrl(movieData.poster_image_url)) {
                displayMessage(movieFormMessage, 'Invalid Poster Image URL. Must start with http:// or https://.', 'error'); return;
            }
            if (movieData.backdrop_image_url && !isValidHttpUrl(movieData.backdrop_image_url)) {
                displayMessage(movieFormMessage, 'Invalid Backdrop Image URL. Must start with http:// or https://.', 'error'); return;
            }
            if (movieData.trailer_youtube_url && !isValidHttpUrl(movieData.trailer_youtube_url)) { // Validate trailer URL
                displayMessage(movieFormMessage, 'Invalid YouTube Trailer URL. Must start with http:// or https://.', 'error'); return;
            }
            // Optional: More specific validation for YouTube embed URLs
            if (movieData.trailer_youtube_url && !movieData.trailer_youtube_url.includes('youtube.com/embed/')) {
                displayMessage(movieFormMessage, 'Trailer URL should be a YouTube embed URL (e.g., https://www.youtube.com/embed/VIDEO_ID).', 'warning', 7000);
                // Not returning, just a warning. Backend should ideally validate this more strictly if needed.
            }


            // Collect cast data
            const castEntries = castMembersContainer.querySelectorAll('.cast-member-entry');
            for (const entry of castEntries) {
                const personName = entry.querySelector('.cast-person-name')?.value.trim();
                const roleType = entry.querySelector('.cast-role-type')?.value;
                let characterName = entry.querySelector('.cast-character-name')?.value.trim();
                const imageUrl = entry.querySelector('.cast-image-url')?.value.trim() || null;
                const displayOrder = parseInt(entry.querySelector('.cast-display-order')?.value) || 0;

                if (!personName || !roleType) {
                    displayMessage(movieFormMessage, 'Each cast member must have a Person Name and Role.', 'error');
                    return;
                }
                if (roleType === 'Actor' && !characterName) {
                     // Making character name optional for now, but can be required
                    console.warn(`Actor '${personName}' is submitted without a character name.`);
                }
                 if (roleType !== 'Actor') { // For Director, Writer, Producer
                    characterName = null; 
                }
                if (imageUrl && !isValidHttpUrl(imageUrl)) {
                    displayMessage(movieFormMessage, `Invalid Image URL for cast member '${personName}'.`, 'error'); return;
                }

                movieData.cast_and_crew.push({
                    person_name: personName,
                    role_type: roleType,
                    character_name: characterName,
                    image_url: imageUrl,
                    display_order: displayOrder
                });
            }

            const currentMovieIdVal = movieIdInput.value; 
            const method = currentMovieIdVal ? 'PUT' : 'POST';
            const url = currentMovieIdVal ? `/api/movies/${currentMovieIdVal}` : '/api/movies';

            try {
                const response = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(movieData)
                });
                const result = await response.json();

                if (response.ok) {
                    displayMessage(movieFormMessage, result.message || `Movie ${currentMovieIdVal ? 'updated' : 'added'} successfully! Redirecting...`, 'success', 3000);
                    setTimeout(() => {
                        window.location.href = '/admin/manage-movies.html';
                    }, 2000);
                } else {
                    displayMessage(movieFormMessage, result.message || `Failed to ${currentMovieIdVal ? 'update' : 'add'} movie.`, 'error');
                }
            } catch (error) {
                console.error(`Error ${currentMovieIdVal ? 'updating' : 'adding'} movie:`, error);
                displayMessage(movieFormMessage, 'An unexpected error occurred. Please try again.', 'error');
            }
        });
    }

    // --- For manage-movies.html (Movie Listing) ---
    async function fetchAndDisplayMoviesForAdmin() {
        if (!moviesTableBody) return; 
        if (loadingMoviesTableIndicator) loadingMoviesTableIndicator.style.display = 'flex';
        if (manageMoviesMessage) manageMoviesMessage.style.display = 'none';
        moviesTableBody.innerHTML = ''; // Clear existing rows

        try {
            const response = await fetch('/api/movies'); 
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to fetch movies for admin table');
            }
            const movies = await response.json();

            if (movies.length === 0) {
                displayMessage(manageMoviesMessage, 'No movies found. Add some!', 'info', 0); // Persist this message
            } else {
                movies.forEach(movie => {
                    const row = moviesTableBody.insertRow();
                    row.insertCell().textContent = movie.movie_id;
                    row.insertCell().textContent = movie.title;
                    row.insertCell().textContent = movie.genre;
                    row.insertCell().textContent = `${movie.duration} min`;
                    row.insertCell().textContent = formatDateForInput(movie.release_date); 
                    
                    const actionsCell = row.insertCell();
                    actionsCell.classList.add('actions');
                    actionsCell.innerHTML = `
                        <a href="/admin/form-movie.html?edit_id=${movie.movie_id}" class="btn btn-outline btn-small btn-edit" title="Edit Movie"><i class="fas fa-edit"></i> Edit</a>
                        <button class="btn btn-outline btn-small btn-delete" data-movie-id="${movie.movie_id}" title="Delete Movie"><i class="fas fa-trash"></i> Delete</button>
                    `;
                });
                addDeleteEventListenersForMovies();
            }
        } catch (error) {
            console.error('Error fetching movies for admin table:', error);
            displayMessage(manageMoviesMessage, `Error loading movies: ${error.message}`, 'error', 0); // Persist error
        } finally {
            if (loadingMoviesTableIndicator) loadingMoviesTableIndicator.style.display = 'none';
        }
    }

    function addDeleteEventListenersForMovies() {
        document.querySelectorAll('#moviesTable .btn-delete').forEach(button => {
            // Clone and replace to remove old listeners, ensuring only one is active
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            newButton.addEventListener('click', async (event) => {
                const movieId = event.currentTarget.dataset.movieId;
                if (!movieId) return;

                if (confirm(`Are you sure you want to delete movie ID ${movieId}? This action cannot be undone and will also delete related showtimes, reviews, and cast.`)) {
                    displayMessage(manageMoviesMessage, `Deleting movie ID ${movieId}...`, 'info', 0);
                    try {
                        const response = await fetch(`/api/movies/${movieId}`, { method: 'DELETE' });
                        const result = await response.json().catch(() => ({ message: "Movie deleted, but couldn't parse server response."})); // Default message if JSON parsing fails
                        
                        if (response.ok) {
                            displayMessage(manageMoviesMessage, result.message || 'Movie deleted successfully.', 'success');
                            fetchAndDisplayMoviesForAdmin(); // Refresh the table
                        } else {
                             displayMessage(manageMoviesMessage, result.message || `Failed to delete movie ID ${movieId}.`, 'error');
                        }
                    } catch (error) {
                        console.error('Error deleting movie:', error);
                        displayMessage(manageMoviesMessage, `An error occurred while deleting movie ID ${movieId}.`, 'error');
                    }
                }
            });
        });
    }

    // If on manage-movies page, fetch movies
    if (document.querySelector('#moviesTable')) {
        fetchAndDisplayMoviesForAdmin();
    }
});
