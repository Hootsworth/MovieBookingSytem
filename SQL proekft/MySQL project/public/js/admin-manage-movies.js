// public/js/admin-manage-movies.js
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initializeCommon === 'function') {
        initializeCommon(); // Handles user welcome, logout, footer year, and admin check
    }

    const addMovieForm = document.getElementById('addMovieForm');
    const addMovieMessage = document.getElementById('addMovieMessage');

    function displayFormMessage(message, type = 'error') {
        if (!addMovieMessage) return;
        addMovieMessage.innerHTML = `<p class="${type}">${message}</p>`;
        addMovieMessage.className = `message-area ${type}`; // Ensure correct class for styling
        addMovieMessage.style.display = 'block';
        setTimeout(() => { addMovieMessage.style.display = 'none'; addMovieMessage.innerHTML = ''; }, 5000);
    }

    if (addMovieForm) {
        addMovieForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            addMovieMessage.style.display = 'none'; // Clear previous messages

            const formData = new FormData(addMovieForm);
            const movieData = {
                title: formData.get('title'),
                genre: formData.get('genre'),
                duration: parseInt(formData.get('duration')),
                release_date: formData.get('release_date'),
                // poster_image_url: formData.get('poster_image_url'), // Uncomment if using
                // backdrop_image_url: formData.get('backdrop_image_url'), // Uncomment if using
                // synopsis: formData.get('synopsis') // Uncomment if using
            };

            // Basic frontend validation
            if (!movieData.title || !movieData.genre || !movieData.duration || !movieData.release_date) {
                displayFormMessage('All fields (Title, Genre, Duration, Release Date) are required.', 'error');
                return;
            }
            if (isNaN(movieData.duration) || movieData.duration <= 0) {
                displayFormMessage('Duration must be a positive number.', 'error');
                return;
            }

            try {
                const response = await fetch('/api/movies', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // Admin authentication is handled by session/middleware on backend
                    },
                    body: JSON.stringify(movieData)
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Failed to add movie.');
                }

                displayFormMessage(`Movie "${result.movie.title}" added successfully!`, 'success');
                addMovieForm.reset(); // Clear the form

            } catch (error) {
                console.error('Error adding movie:', error);
                displayFormMessage(error.message || 'An unexpected error occurred.', 'error');
            }
        });
    }

    // Set active link in sidebar based on current page (if this script is also used on a listing page)
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
    setActiveAdminNavLink(); // Call it for the current page
});
