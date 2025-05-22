// public/js/user-dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    // Elements for "Now Showing" movies
    const movieGridContainer = document.getElementById('movieGridContainer');
    const loadingMoviesIndicator = document.getElementById('loadingMoviesIndicator');
    const movieGridMessage = document.getElementById('movieGridMessage');
    const movieSearchInput = document.getElementById('movieSearchInput');
    const movieSearchButton = document.getElementById('movieSearchButton');
    const genreFilterSelect = document.getElementById('genreFilterSelect');

    // Elements for "Popular Now" movies
    const popularMovieGridContainer = document.getElementById('popularMovieGridContainer');
    const loadingPopularMoviesIndicator = document.getElementById('loadingPopularMoviesIndicator');
    const popularMovieGridMessage = document.getElementById('popularMovieGridMessage');

    let allMovies = []; // For "Now Showing" filterable list

    if (typeof initializeCommon === 'function') {
        initializeCommon(); 
    } else {
        console.warn('common.js or initializeCommon function not found.');
        const userWelcomeText = document.getElementById('userWelcomeText');
        const storedUser = sessionStorage.getItem('cineverse_user');
        if (userWelcomeText && storedUser) {
            try {
                const user = JSON.parse(storedUser);
                userWelcomeText.textContent = `Welcome, ${user.username || 'User'}!`;
            } catch (e) { console.error('Error parsing user from session storage', e); }
        }
        const logoutButton = document.getElementById('logoutButton');
        if(logoutButton) {
            logoutButton.addEventListener('click', () => {
                fetch('/api/auth/logout', { method: 'POST'})
                .then(res => {
                    sessionStorage.removeItem('cineverse_user');
                    window.location.href = '/login.html';
                })
                .catch(err => console.error('Logout failed', err));
            });
        }
    }
    const currentYearSpan = document.getElementById('currentYear');
    if (currentYearSpan) {
        currentYearSpan.textContent = new Date().getFullYear();
    }

    function displayMessage(element, message, type = 'info') {
        if (!element) return;
        element.innerHTML = `<p class="${type}">${message}</p>`;
        element.className = `message-area ${type}`; // Ensure full class name is set
        element.style.display = 'block';
    }

    function renderDashboardStars(averageRating, reviewCount) {
        const rating = parseFloat(averageRating); 
        let starsHTML = '';
        if (reviewCount === 0 || isNaN(rating) || rating === 0) {
            for (let i = 1; i <= 5; i++) {
                starsHTML += '<i class="far fa-star"></i>'; 
            }
            return `<span class="stars-display">${starsHTML}</span> <span class="rating-text-display">N/A</span> <span class="review-count-dashboard">(${reviewCount} review${reviewCount !== 1 ? 's' : ''})</span>`;
        }
        
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                starsHTML += '<i class="fas fa-star"></i>'; 
            } else if (i - 0.5 <= rating) {
                starsHTML += '<i class="fas fa-star-half-alt"></i>'; 
            } else {
                starsHTML += '<i class="far fa-star"></i>'; 
            }
        }
        return `<span class="stars-display">${starsHTML}</span> <span class="rating-text-display">${rating.toFixed(1)}</span> <span class="review-count-dashboard">(${reviewCount} review${reviewCount !== 1 ? 's' : ''})</span>`;
    }

    function createMovieCardHTML(movie) {
        const posterUrl = movie.poster_image_url || '/images/placeholder-poster.png'; 
        const ratingDisplay = renderDashboardStars(movie.average_rating, movie.review_count);

        return `
            <article class="movie-card" data-movie-id="${movie.movie_id}">
                <a href="/movie-details.html?id=${movie.movie_id}" class="movie-poster-link">
                    <div class="movie-poster" style="background-image: url('${posterUrl}');">
                        <div class="movie-overlay-info">
                            <span class="movie-rating">
                                ${ratingDisplay} 
                            </span>
                        </div>
                    </div>
                </a>
                <div class="movie-content">
                    <h3 class="movie-title-card">${movie.title || 'Untitled Movie'}</h3>
                    <p class="movie-genre-card">${movie.genre || 'Genre not available'}</p>
                    <a href="/movie-details.html?id=${movie.movie_id}" class="btn btn-outline btn-small movie-details-link">
                        View Details <i class="fas fa-arrow-right icon-right"></i>
                    </a>
                </div>
            </article>
        `;
    }

    function renderMoviesToContainer(containerElement, messageElement, moviesToRender) {
        if (!containerElement) return;
        if (moviesToRender.length === 0) {
            displayMessage(messageElement, 'No movies found to display here.', 'info');
            containerElement.innerHTML = ''; 
        } else {
            if (messageElement) messageElement.style.display = 'none';
            containerElement.innerHTML = moviesToRender.map(createMovieCardHTML).join('');
        }
    }

    function populateGenreFilter(movies) {
        if (!genreFilterSelect) return;
        const genres = new Set();
        movies.forEach(movie => {
            if (movie.genre) {
                movie.genre.split(',').forEach(g => {
                    const trimmedGenre = g.trim();
                    if (trimmedGenre) genres.add(trimmedGenre);
                });
            }
        });
        
        // Clear existing options except the first "All Genres" one
        while (genreFilterSelect.options.length > 1) {
            genreFilterSelect.remove(1);
        }

        Array.from(genres).sort().forEach(genre => {
            const option = document.createElement('option');
            option.value = genre.toLowerCase(); // Use lowercase for value for consistency
            option.textContent = genre;
            genreFilterSelect.appendChild(option);
        });
    }

    function filterAndRenderNowShowingMovies() {
        if (!movieSearchInput || !genreFilterSelect) return; 

        const searchTerm = movieSearchInput.value.toLowerCase();
        const selectedGenre = genreFilterSelect.value; // Already lowercase if set by populateGenreFilter

        const filteredMovies = allMovies.filter(movie => {
            const titleMatch = movie.title.toLowerCase().includes(searchTerm);
            const genreMatch = selectedGenre === 'all' || 
                               (movie.genre && movie.genre.toLowerCase().split(',').map(g=>g.trim()).includes(selectedGenre));
            return titleMatch && genreMatch;
        });
        renderMoviesToContainer(movieGridContainer, movieGridMessage, filteredMovies);
    }

    async function fetchAndDisplayNowShowingMovies() {
        if (loadingMoviesIndicator) loadingMoviesIndicator.style.display = 'flex';
        if (movieGridMessage) movieGridMessage.style.display = 'none';

        try {
            const response = await fetch('/api/movies'); 
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            allMovies = await response.json(); 
            
            if (allMovies.length === 0) {
                displayMessage(movieGridMessage, 'No movies currently showing. Check back soon!', 'info');
            } else {
                renderMoviesToContainer(movieGridContainer, movieGridMessage, allMovies);
                populateGenreFilter(allMovies); // Populate filter based on "Now Showing" movies
            }

        } catch (error) {
            console.error('Error fetching "Now Showing" movies:', error);
            displayMessage(movieGridMessage, `Failed to load "Now Showing" movies: ${error.message}`, 'error');
        } finally {
            if (loadingMoviesIndicator) loadingMoviesIndicator.style.display = 'none';
        }
    }

    async function fetchAndDisplayPopularMovies() {
        if (loadingPopularMoviesIndicator) loadingPopularMoviesIndicator.style.display = 'flex';
        if (popularMovieGridMessage) popularMovieGridMessage.style.display = 'none';

        try {
            const response = await fetch('/api/movies/popular');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const popularMovies = await response.json();
            
            if (popularMovies.length === 0) {
                displayMessage(popularMovieGridMessage, 'No popular movies at the moment. Explore "Now Showing"!', 'info');
            } else {
                renderMoviesToContainer(popularMovieGridContainer, popularMovieGridMessage, popularMovies);
            }

        } catch (error) {
            console.error('Error fetching popular movies:', error);
            displayMessage(popularMovieGridMessage, `Failed to load popular movies: ${error.message}`, 'error');
        } finally {
            if (loadingPopularMoviesIndicator) loadingPopularMoviesIndicator.style.display = 'none';
        }
    }

    // Event listeners for "Now Showing" search and filter
    if (movieSearchButton) movieSearchButton.addEventListener('click', filterAndRenderNowShowingMovies);
    if (movieSearchInput) {
        movieSearchInput.addEventListener('keyup', (event) => { if (event.key === 'Enter') filterAndRenderNowShowingMovies(); });
        movieSearchInput.addEventListener('input', filterAndRenderNowShowingMovies); // Real-time filtering
    }
    if (genreFilterSelect) genreFilterSelect.addEventListener('change', filterAndRenderNowShowingMovies);
    
    // Initial data fetch
    fetchAndDisplayPopularMovies();
    fetchAndDisplayNowShowingMovies(); 
});