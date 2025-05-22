// public/js/movie-details.js
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initializeCommon === 'function') {
        initializeCommon(); // Handles user welcome, logout, theme switcher, footer year etc.
    }

    // DOM Elements for Movie Details
    const movieBackdrop = document.getElementById('movieBackdrop');
    const moviePosterImage = document.getElementById('moviePosterImage');
    const movieTitle = document.getElementById('movieTitle');
    const movieReleaseDate = document.getElementById('movieReleaseDate')?.querySelector('span');
    const movieDuration = document.getElementById('movieDuration')?.querySelector('span');
    const movieGenre = document.getElementById('movieGenre')?.querySelector('span');
    const movieSynopsis = document.getElementById('movieSynopsis');
    const movieAverageRatingEl = document.getElementById('movieAverageRating');

    // DOM Elements for Trailer (NEW)
    const movieTrailerSection = document.getElementById('movieTrailerSection');
    const trailerEmbedContainer = document.getElementById('trailerEmbedContainer');
    const trailerMessage = document.getElementById('trailerMessage');

    // DOM Elements for Cast & Crew
    const castCrewGridContainer = document.getElementById('castCrewGridContainer');
    const loadingCastCrewIndicator = document.getElementById('loadingCastCrewIndicator');
    const castCrewMessage = document.getElementById('castCrewMessage');

    // DOM Elements for Showtimes
    const showtimesGridContainer = document.getElementById('showtimesGridContainer');
    const loadingShowtimesIndicator = document.getElementById('loadingShowtimesIndicator');
    const showtimesMessage = document.getElementById('showtimesMessage');

    // DOM Elements for Reviews
    const addReviewSection = document.getElementById('addReviewSection');
    const reviewForm = document.getElementById('reviewForm');
    const reviewFormMessage = document.getElementById('reviewFormMessage');
    const reviewsListContainer = document.getElementById('reviewsListContainer');
    const loadingReviewsIndicator = document.getElementById('loadingReviewsIndicator');
    const reviewsMessage = document.getElementById('reviewsMessage');
    const reviewLoginPrompt = document.getElementById('reviewLoginPrompt');

    let currentMovieId = null;

    function isLoggedIn() {
        // Check if user data exists in session storage
        return sessionStorage.getItem('cineverse_user') !== null;
    }

    function displayMessage(element, message, type = 'info') {
        if (!element) return;
        element.innerHTML = `<p class="${type}">${message}</p>`;
        element.className = `message-area ${type}`; // Ensure correct class for styling
        element.style.display = 'block';
    }
    
    function displayTemporaryMessage(element, message, type = 'info', duration = 5000) {
        displayMessage(element, message, type);
        setTimeout(() => {
            if (element && element.style.display !== 'none') { // Check if still visible
                element.style.display = 'none';
                element.innerHTML = '';
            }
        }, duration);
    }


    function formatDuration(minutes) {
        if (!minutes || isNaN(minutes)) return 'N/A';
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${h}h ${m}m`;
    }

    function formatDate(dateString, options = { year: 'numeric', month: 'long', day: 'numeric' }) {
        if (!dateString) return 'N/A';
        try {
            // Handle dates that might already be just YYYY-MM-DD by ensuring a time component for consistent parsing
            const date = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00');
            return date.toLocaleDateString(undefined, options);
        } catch (e) { 
            console.warn("Error formatting date:", dateString, e);
            return dateString; // Fallback to original string if formatting fails
        }
    }

    function formatTime(timeString) { // Expects HH:MM:SS or HH:MM
        if (!timeString) return 'N/A';
        try {
            const parts = timeString.split(':');
            const hours = parseInt(parts[0], 10);
            const minutes = parseInt(parts[1], 10);
            if (isNaN(hours) || isNaN(minutes)) return timeString;

            const date = new Date();
            date.setHours(hours);
            date.setMinutes(minutes);
            return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
        } catch (e) { 
            console.warn("Error formatting time:", timeString, e);
            return timeString; 
        }
    }

    function renderAverageStarsDisplay(averageRating, reviewCount) {
        if (!movieAverageRatingEl) return;
        const starsContainer = movieAverageRatingEl.querySelector('.stars');
        const ratingValueEl = movieAverageRatingEl.querySelector('.rating-value');
        const reviewCountEl = movieAverageRatingEl.querySelector('.review-count');

        if (!starsContainer || !ratingValueEl || !reviewCountEl) {
            console.warn("Average rating display elements not found in HTML.");
            return;
        }

        const rating = parseFloat(averageRating);
        if (reviewCount === 0 || isNaN(rating) || rating === 0) {
            starsContainer.innerHTML = '<i class="far fa-star"></i>'.repeat(5); // All empty stars
            ratingValueEl.textContent = 'N/A';
            reviewCountEl.textContent = '(0 Reviews)';
            return;
        }

        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) starsHTML += '<i class="fas fa-star"></i>'; // Full star
            else if (i - 0.5 <= rating) starsHTML += '<i class="fas fa-star-half-alt"></i>'; // Half star
            else starsHTML += '<i class="far fa-star"></i>'; // Empty star
        }
        starsContainer.innerHTML = starsHTML;
        ratingValueEl.textContent = rating.toFixed(1);
        reviewCountEl.textContent = `(${reviewCount} Review${reviewCount !== 1 ? 's' : ''})`;
    }

    // Function to render YouTube Trailer (NEW)
    function renderMovieTrailer(trailerUrl) {
        if (!movieTrailerSection || !trailerEmbedContainer || !trailerMessage) return;

        if (trailerUrl && trailerUrl.includes('youtube.com/embed/')) {
            trailerEmbedContainer.innerHTML = `
                <iframe 
                    src="${trailerUrl}" 
                    title="Movie Trailer" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                    allowfullscreen>
                </iframe>`;
            trailerMessage.style.display = 'none';
            trailerEmbedContainer.style.display = 'block';
            movieTrailerSection.style.display = 'block'; // Show the whole section
        } else {
            trailerEmbedContainer.innerHTML = ''; // Clear any previous iframe
            trailerEmbedContainer.style.display = 'none';
            if (trailerUrl) { // If a URL was provided but it's not valid
                 displayMessage(trailerMessage, 'Trailer URL is invalid or not a YouTube embed link.', 'warning');
            } else {
                 displayMessage(trailerMessage, 'No trailer available for this movie.', 'info');
            }
            movieTrailerSection.style.display = 'block'; // Still show section for the message
        }
    }


    function renderCastAndCrew(castAndCrew) {
        if (!castCrewGridContainer) return;
        if (castCrewMessage) castCrewMessage.style.display = 'none'; 

        if (!castAndCrew || castAndCrew.length === 0) {
            displayMessage(castCrewMessage, 'Cast and crew information not available for this movie.', 'info');
            castCrewGridContainer.innerHTML = ''; 
            return;
        }
        
        // Sort: Directors first, then by display_order, then by name
        const sortedCast = [...castAndCrew].sort((a, b) => {
            if (a.role_type === 'Director' && b.role_type !== 'Director') return -1;
            if (a.role_type !== 'Director' && b.role_type === 'Director') return 1;
            // For non-directors, sort by display_order, then by name
            if (a.display_order !== b.display_order) return (a.display_order || 999) - (b.display_order || 999);
            return (a.person_name || '').localeCompare(b.person_name || '');
        });


        let castHTML = '';
        sortedCast.forEach(person => {
            const roleDisplay = person.role_type === 'Director' ? 'Director' : (person.character_name || person.role_type || 'N/A'); // Show role_type if character_name is missing for actors
            const placeholderImage = '/images/placeholder-cast.png'; 

            castHTML += `
                <div class="cast-member-card">
                    <div class="cast-member-image-wrapper">
                        <img src="${person.image_url || placeholderImage}" alt="${person.person_name}" onerror="this.onerror=null;this.src='${placeholderImage}';">
                    </div>
                    <p class="cast-member-name">${person.person_name}</p>
                    <p class="cast-member-role">${roleDisplay}</p>
                </div>
            `;
        });
        castCrewGridContainer.innerHTML = castHTML;
    }


    async function fetchMovieDetails(movieId) {
        try {
            const response = await fetch(`/api/movies/${movieId}`); 
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})); // Try to parse error, fallback if not JSON
                throw new Error(errorData.message || `Failed to fetch movie details (status ${response.status})`);
            }
            const movie = await response.json();
            currentMovieId = movie.movie_id; // Store current movie ID

            // Populate movie details
            if (movieTitle) movieTitle.textContent = movie.title || 'Movie Title Not Available';
            document.title = `${movie.title || 'Movie'} Details | CineVerse`; // Update page title

            const posterUrl = movie.poster_image_url || '/images/placeholder-poster.png';
            const backdropUrl = movie.backdrop_image_url || '/images/placeholder-hero-bg.jpg'; // Default fallback backdrop

            if (movieBackdrop) movieBackdrop.style.backgroundImage = `url('${backdropUrl}')`;
            if (moviePosterImage) {
                moviePosterImage.src = posterUrl;
                moviePosterImage.alt = `${movie.title} Poster`;
                moviePosterImage.onerror = () => { moviePosterImage.src = '/images/placeholder-poster.png'; }; // Fallback for broken image
            }

            if (movieReleaseDate) movieReleaseDate.textContent = formatDate(movie.release_date);
            if (movieDuration) movieDuration.textContent = formatDuration(movie.duration);
            if (movieGenre) movieGenre.textContent = movie.genre || 'N/A';
            if (movieSynopsis) movieSynopsis.textContent = movie.synopsis || 'Synopsis not available.';

            renderAverageStarsDisplay(movie.average_rating, movie.review_count);

            // Render Trailer (NEW)
            renderMovieTrailer(movie.trailer_youtube_url);


            // Render Cast & Crew
            if (loadingCastCrewIndicator) loadingCastCrewIndicator.style.display = 'flex';
            if (movie.cast_and_crew) {
                renderCastAndCrew(movie.cast_and_crew);
            } else {
                displayMessage(castCrewMessage, 'Cast and crew information not available.', 'info');
                if (castCrewGridContainer) castCrewGridContainer.innerHTML = '';
            }
            if (loadingCastCrewIndicator) loadingCastCrewIndicator.style.display = 'none';


            // Show/hide review form based on login status
            if (isLoggedIn()) {
                if (addReviewSection) addReviewSection.style.display = 'block';
                if (reviewLoginPrompt) reviewLoginPrompt.style.display = 'none';
            } else {
                if (addReviewSection) addReviewSection.style.display = 'none';
                if (reviewLoginPrompt) reviewLoginPrompt.style.display = 'block';
            }

        } catch (error) {
            console.error('Error fetching movie details:', error);
            if (movieTitle) movieTitle.textContent = 'Error Loading Movie';
            if (movieSynopsis) movieSynopsis.textContent = `Could not load movie details: ${error.message}`;
            if (movieAverageRatingEl) { renderAverageStarsDisplay(0,0); } // Reset rating display
            
            // Handle trailer error display
            if (movieTrailerSection && trailerMessage) {
                displayMessage(trailerMessage, `Could not load trailer: ${error.message}`, 'error');
                if (trailerEmbedContainer) trailerEmbedContainer.style.display = 'none';
                movieTrailerSection.style.display = 'block'; // Show section to display error
            }

            displayMessage(castCrewMessage, `Could not load cast information: ${error.message}`, 'error');
            if (loadingCastCrewIndicator) loadingCastCrewIndicator.style.display = 'none';
        }
    }

    function createShowtimeCardHTML(showtime) {
        // Ensure theatre_name and screen_number are displayed, with fallbacks
        const theatreName = showtime.theatre_name || 'Theatre N/A';
        const screenNumber = showtime.screen_number || 'N/A';
        const availableSeats = showtime.available_seats !== undefined && showtime.available_seats !== null 
                               ? `${showtime.available_seats} seats available` 
                               : 'Availability N/A';

        return `
            <article class="showtime-card" data-showtime-id="${showtime.showtime_id}">
                <div class="showtime-card-header">
                    <h3>${theatreName}</h3>
                    <p>Screen ${screenNumber}</p>
                </div>
                <div class="showtime-card-body">
                    <p class="show-date-card">${formatDate(showtime.show_date)}</p>
                    <div class="time-slot" role="button" tabindex="0" data-showtime-id="${showtime.showtime_id}" aria-label="Book showtime at ${formatTime(showtime.show_time)}">
                        ${formatTime(showtime.show_time)}
                    </div>
                     <p class="available-seats-info">${availableSeats}</p>
                </div>
                <div class="showtime-card-footer">
                    <button class="btn btn-primary btn-small btn-book-seats" data-showtime-id="${showtime.showtime_id}">
                        Book Seats <i class="fas fa-ticket-alt icon-right"></i>
                    </button>
                </div>
            </article>
        `;
    }

    async function fetchShowtimes(movieId) {
        if (loadingShowtimesIndicator) loadingShowtimesIndicator.style.display = 'flex';
        if (showtimesMessage) showtimesMessage.style.display = 'none';
        try {
            const response = await fetch(`/api/showtimes/movie/${movieId}`);
            if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'Failed to fetch showtimes');
            const showtimes = await response.json();
            
            if (showtimesGridContainer) {
                if (showtimes.length === 0) {
                    displayMessage(showtimesMessage, 'No showtimes currently available for this movie.', 'info');
                    showtimesGridContainer.innerHTML = ''; // Clear previous
                } else {
                    showtimesGridContainer.innerHTML = showtimes.map(createShowtimeCardHTML).join('');
                    addShowtimeEventListeners();
                }
            }
        } catch (error) {
            console.error('Error fetching showtimes:', error);
            displayMessage(showtimesMessage, `Could not load showtimes: ${error.message}`, 'error');
        } finally {
            if (loadingShowtimesIndicator) loadingShowtimesIndicator.style.display = 'none';
        }
    }

    function addShowtimeEventListeners() {
        document.querySelectorAll('.btn-book-seats, .time-slot').forEach(button => {
            button.addEventListener('click', (event) => {
                const showtimeId = event.currentTarget.dataset.showtimeId;
                if (showtimeId && currentMovieId) { // Ensure currentMovieId is set
                    sessionStorage.setItem('selected_showtime_id', showtimeId);
                    sessionStorage.setItem('selected_movie_id', currentMovieId); // Store movie ID for booking page
                    window.location.href = `/seat-selection.html?showtimeId=${showtimeId}&movieId=${currentMovieId}`;
                } else {
                    console.error("Movie ID or Showtime ID missing for booking. Current Movie ID:", currentMovieId, "Showtime ID:", showtimeId);
                    alert("Could not proceed with booking. Essential information is missing. Please try refreshing the page.");
                }
            });
            // Add keyboard accessibility for time slots if they act like buttons
            if (button.classList.contains('time-slot')) {
                button.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault(); // Prevent scrolling on spacebar
                        button.click(); // Trigger the click event
                    }
                });
            }
        });
    }

    function renderIndividualReviewStars(rating) {
        let starsHTML = '';
        for (let i = 1; i <= 5; i++) {
            starsHTML += `<i class="${i <= rating ? 'fas' : 'far'} fa-star" style="color: var(--color-warning);"></i> `;
        }
        return `<div class="stars-display">${starsHTML.trim()}</div>`;
    }

    function createReviewCardHTML(review) {
        const user = JSON.parse(sessionStorage.getItem('cineverse_user'));
        let actionButtons = '';
        // Check if the logged-in user is the author of the review OR an admin
        if (user && user.user_id && (user.user_id === review.user_id || user.user_type === 'Admin' || user.user_type === 'admin')) {
            actionButtons = `
                <div class="review-actions">
                    <button class="btn btn-icon btn-logout btn-small btn-delete-review" data-review-id="${review.review_id}" title="Delete Review"><i class="fas fa-trash"></i></button>
                </div>`;
        }
        return `
            <article class="review-card" id="review-${review.review_id}">
                <div class="review-card-header">
                    <span class="username">${review.username || 'Anonymous'}</span>
                    <span class="review-date">${formatDate(review.review_date, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="review-card-body">
                    ${renderIndividualReviewStars(review.rating)}
                    <p class="review-text-content">${review.review_text || 'No comment provided.'}</p>
                </div>
                ${actionButtons}
            </article>
        `;
    }

    async function fetchReviews(movieId) {
        if (loadingReviewsIndicator) loadingReviewsIndicator.style.display = 'flex';
        if (reviewsMessage) reviewsMessage.style.display = 'none';
        if (reviewsListContainer) reviewsListContainer.innerHTML = ''; // Clear previous reviews
        try {
            const response = await fetch(`/api/reviews/movie/${movieId}`);
            if (!response.ok) throw new Error((await response.json().catch(() => ({}))).message || 'Failed to fetch reviews');
            const reviews = await response.json();
            
            if (reviewsListContainer) {
                if (reviews.length === 0) {
                    displayMessage(reviewsMessage, 'Be the first to review this movie!', 'info');
                } else {
                    reviewsListContainer.innerHTML = reviews.map(createReviewCardHTML).join('');
                    addReviewActionEventListeners(); // Add listeners to new delete buttons
                }
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
            displayMessage(reviewsMessage, `Could not load reviews: ${error.message}`, 'error');
        } finally {
            if (loadingReviewsIndicator) loadingReviewsIndicator.style.display = 'none';
        }
    }

    if (reviewForm) {
        reviewForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!currentMovieId || !isLoggedIn()) {
                displayTemporaryMessage(reviewFormMessage, !currentMovieId ? 'Movie ID missing. Cannot submit review.' : 'Please log in to write a review.', 'error');
                return;
            }

            const formData = new FormData(reviewForm);
            const rating = formData.get('rating');
            const review_text = formData.get('review_text').trim();

            if (!rating) {
                displayTemporaryMessage(reviewFormMessage, 'Please select a star rating.', 'error');
                return;
            }
            // Optional: check for empty review text if you want to make it mandatory
            // if (!review_text) {
            //     displayTemporaryMessage(reviewFormMessage, 'Please write some text for your review.', 'error');
            //     return;
            // }

            try {
                const response = await fetch('/api/reviews', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ movie_id: currentMovieId, rating: parseInt(rating), review_text })
                });
                const result = await response.json().catch(() => ({ message: "Review submitted, but couldn't parse server response."})); // Graceful handling of non-JSON response

                if (response.ok) {
                    displayTemporaryMessage(reviewFormMessage, result.message || 'Review submitted successfully!', 'success');
                    reviewForm.reset();
                    // Clear selected stars visually
                    document.querySelectorAll('.star-rating input[type="radio"]').forEach(rb => rb.checked = false);
                    
                    // Refresh movie details (for average rating) and reviews list
                    await fetchMovieDetails(currentMovieId); // Use await to ensure it completes before fetching reviews if dependent
                    fetchReviews(currentMovieId); 
                } else {
                    displayTemporaryMessage(reviewFormMessage, result.message || 'Failed to submit review.', 'error');
                }
            } catch (error) {
                console.error('Error submitting review:', error);
                displayTemporaryMessage(reviewFormMessage, 'An unexpected error occurred while submitting your review.', 'error');
            }
        });
    }

    function addReviewActionEventListeners() {
        document.querySelectorAll('.btn-delete-review').forEach(button => {
            // Clone and replace to avoid multiple listeners on re-renders
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button); 

            newButton.addEventListener('click', async (event) => {
                const reviewId = event.currentTarget.dataset.reviewId;
                if (!reviewId || !confirm('Are you sure you want to delete this review? This action cannot be undone.')) return;
                
                try {
                    const response = await fetch(`/api/reviews/${reviewId}`, { method: 'DELETE' });
                    const result = await response.json().catch(() => ({ message: "Review deleted, but couldn't parse server response."}));
                    
                    if (response.ok) {
                        displayTemporaryMessage(reviewsMessage, result.message || 'Review deleted successfully.', 'success');
                        document.getElementById(`review-${reviewId}`)?.remove(); // Remove the review card from DOM
                        
                        // Refresh movie details (for average rating)
                        await fetchMovieDetails(currentMovieId); 
                        // Check if reviews list is now empty
                        if (reviewsListContainer && reviewsListContainer.children.length === 0) {
                            displayMessage(reviewsMessage, 'Be the first to review this movie!', 'info');
                        }
                    } else {
                        displayTemporaryMessage(reviewsMessage, result.message || 'Failed to delete review.', 'error');
                    }
                } catch (error) {
                    console.error('Error deleting review:', error);
                    displayTemporaryMessage(reviewsMessage, 'An error occurred while deleting the review.', 'error');
                }
            });
        });
    }

    // --- Initialization ---
    const urlParams = new URLSearchParams(window.location.search);
    const movieIdFromUrl = urlParams.get('id');

    if (movieIdFromUrl) {
        currentMovieId = movieIdFromUrl; // Set currentMovieId early
        fetchMovieDetails(movieIdFromUrl); // Fetches details, trailer, cast
        fetchShowtimes(movieIdFromUrl);
        fetchReviews(movieIdFromUrl);
    } else {
        console.error('No movie ID found in URL.');
        if (movieTitle) movieTitle.textContent = 'Movie Not Found';
        if (movieSynopsis) movieSynopsis.textContent = 'No movie ID provided in the URL. Please select a movie from the dashboard.';
        if (movieAverageRatingEl) { renderAverageStarsDisplay(0,0); }
        
        if (movieTrailerSection && trailerMessage) {
            displayMessage(trailerMessage, 'Cannot load trailer without a movie ID.', 'error');
            if(trailerEmbedContainer) trailerEmbedContainer.style.display = 'none';
            movieTrailerSection.style.display = 'block';
        }
        if (castCrewMessage) displayMessage(castCrewMessage, 'Cannot load cast information without a movie ID.', 'error');
        if (showtimesMessage) displayMessage(showtimesMessage, 'Cannot load showtimes without a movie ID.', 'error');
        if (reviewsMessage) displayMessage(reviewsMessage, 'Cannot load reviews without a movie ID.', 'error');

        // Hide loading indicators if they were visible
        if (loadingCastCrewIndicator) loadingCastCrewIndicator.style.display = 'none';
        if (loadingShowtimesIndicator) loadingShowtimesIndicator.style.display = 'none';
        if (loadingReviewsIndicator) loadingReviewsIndicator.style.display = 'none';
    }

    // Go Back Button functionality (if you have one)
    const goBackButton = document.getElementById('goBackButton');
    if (goBackButton) {
        // Show back button if there's a history to go back to and it's not the root
        if (window.history.length > 1 && document.referrer && document.referrer !== window.location.href) {
            goBackButton.style.display = 'inline-block'; 
            goBackButton.addEventListener('click', () => {
                window.history.back();
            });
        } else {
             goBackButton.style.display = 'none'; // Hide if no history or same page
        }
    }
});
