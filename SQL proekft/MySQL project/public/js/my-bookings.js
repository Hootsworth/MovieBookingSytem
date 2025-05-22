// public/js/my-bookings.js
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initializeCommon === 'function') {
        initializeCommon(); // Handles user welcome, logout, footer year
    }

    const bookingsListContainer = document.getElementById('bookingsListContainer');
    const loadingBookingsIndicator = document.getElementById('loadingBookingsIndicator');
    const bookingsMessage = document.getElementById('bookingsMessage');

    function displayBookingsMessage(message, type = 'info') {
        if (!bookingsMessage) return;
        bookingsMessage.innerHTML = `<p class="${type}">${message}</p>`;
        bookingsMessage.className = `message-area ${type}`; // Ensure class is set for styling
        bookingsMessage.style.display = 'block';

        if (type === 'info' && message.toLowerCase().includes('no bookings')) {
            bookingsListContainer.innerHTML = `
                <div class="no-bookings-message">
                    <i class="fas fa-ticket-alt"></i>
                    <p>${message}</p>
                    <a href="/user-dashboard.html" class="btn btn-primary">Book a Movie</a>
                </div>`;
        }
    }

    function formatDate(dateString, options = { year: 'numeric', month: 'long', day: 'numeric' }) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString(undefined, options);
        } catch (e) {
            return dateString;
        }
    }

    function formatTime(timeString) { // Expects "HH:MM:SS"
        if (!timeString) return 'N/A';
        try {
            const [hours, minutes] = timeString.split(':');
            const date = new Date();
            date.setHours(parseInt(hours, 10));
            date.setMinutes(parseInt(minutes, 10));
            return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
        } catch (e) {
            return timeString;
        }
    }

    function createBookingCardHTML(booking) {
        // Assuming booking object has: movie_title, poster_url (you'll need to add this to your Booking.getByUserId query if not present)
        // theatre_name, screen_number, seat_number, show_date, show_time, status, booking_id
        const posterUrl = booking.poster_url || '/images/placeholder-poster.png'; // Fallback poster

        return `
            <article class="booking-card" id="booking-${booking.booking_id}">
                <div class="booking-poster">
                    <img src="${posterUrl}" alt="${booking.movie_title || 'Movie'} Poster">
                </div>
                <div class="booking-details">
                    <div class="booking-details-header">
                        <h3>${booking.movie_title || 'Movie Title N/A'}</h3>
                    </div>
                    <div class="booking-info">
                        <span><i class="fas fa-landmark"></i><strong>Theatre:</strong> ${booking.theatre_name || 'N/A'}</span>
                        <span><i class="fas fa-desktop"></i><strong>Screen:</strong> ${booking.screen_number || 'N/A'}</span>
                        <span><i class="fas fa-calendar-alt"></i><strong>Date:</strong> ${formatDate(booking.show_date)}</span>
                        <span><i class="fas fa-clock"></i><strong>Time:</strong> ${formatTime(booking.show_time)}</span>
                        <span><i class="fas fa-chair"></i><strong>Seat:</strong> ${booking.seat_number || 'N/A'} (${booking.seat_type || 'Regular'})</span>
                        <span><i class="fas fa-hashtag"></i><strong>Booking ID:</strong> ${booking.booking_id}</span>
                    </div>
                    <div class="booking-status-container">
                         <span class="booking-status ${booking.status ? booking.status.toLowerCase() : ''}">${booking.status || 'Status N/A'}</span>
                    </div>
                    <div class="booking-actions">
                        ${booking.status && booking.status.toLowerCase() === 'confirmed' ? 
                            `<button class="btn btn-outline btn-small btn-cancel-booking" data-booking-id="${booking.booking_id}">
                                <i class="fas fa-times icon-left"></i>Cancel Booking
                             </button>` : 
                            ''}
                        </div>
                </div>
            </article>
        `;
    }

    async function fetchUserBookings() {
        if (loadingBookingsIndicator) loadingBookingsIndicator.style.display = 'flex';
        if (bookingsMessage) bookingsMessage.style.display = 'none';
        if (bookingsListContainer) bookingsListContainer.innerHTML = '';


        // Check if user is logged in
        const user = JSON.parse(sessionStorage.getItem('cineverse_user'));
        if (!user) {
            displayBookingsMessage('You need to be logged in to view your bookings. <a href="/login.html">Login here</a>.', 'error');
            if (loadingBookingsIndicator) loadingBookingsIndicator.style.display = 'none';
            // Optionally redirect: window.location.href = '/login.html';
            return;
        }

        try {
            const response = await fetch('/api/bookings/my-bookings'); // API endpoint from bookingRoutes.js
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to fetch bookings (status ${response.status})`);
            }
            const bookings = await response.json();

            if (bookingsListContainer) {
                if (bookings.length === 0) {
                    displayBookingsMessage('You have no bookings yet.', 'info');
                } else {
                    bookingsListContainer.innerHTML = bookings.map(createBookingCardHTML).join('');
                    addCancelEventListeners();
                }
            }

        } catch (error) {
            console.error('Error fetching user bookings:', error);
            displayBookingsMessage(`Could not load your bookings: ${error.message}`, 'error');
        } finally {
            if (loadingBookingsIndicator) loadingBookingsIndicator.style.display = 'none';
        }
    }

    function addCancelEventListeners() {
        const cancelButtons = document.querySelectorAll('.btn-cancel-booking');
        cancelButtons.forEach(button => {
            // Clone and replace to remove old listeners if this function is called multiple times
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);

            newButton.addEventListener('click', async (event) => {
                const bookingId = event.currentTarget.dataset.bookingId;
                if (!bookingId) return;

                if (confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
                    try {
                        const response = await fetch(`/api/bookings/${bookingId}/cancel`, {
                            method: 'POST',
                            // No body needed if the route just uses the ID from params
                        });
                        const result = await response.json();

                        if (response.ok) {
                            displayBookingsMessage(result.message || 'Booking cancelled successfully.', 'success');
                            // Update the card status or reload bookings
                            // For simplicity, we'll reload all bookings.
                            // For better UX, just update the specific card.
                            const cancelledCard = document.getElementById(`booking-${bookingId}`);
                            if(cancelledCard) {
                                const statusEl = cancelledCard.querySelector('.booking-status');
                                const actionButtonEl = cancelledCard.querySelector('.btn-cancel-booking');
                                if(statusEl) {
                                    statusEl.textContent = 'Cancelled';
                                    statusEl.className = 'booking-status cancelled';
                                }
                                if(actionButtonEl) {
                                    actionButtonEl.remove();
                                }
                            }
                            // Or fetchUserBookings(); // to refresh the whole list
                        } else {
                            displayBookingsMessage(result.message || 'Failed to cancel booking.', 'error');
                        }
                    } catch (error) {
                        console.error('Error cancelling booking:', error);
                        displayBookingsMessage('An error occurred while cancelling the booking.', 'error');
                    }
                }
            });
        });
    }

    // Initial call to fetch bookings
    fetchUserBookings();
});
