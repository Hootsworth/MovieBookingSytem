// public/js/payment-confirmation.js
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initializeCommon === 'function') {
        initializeCommon(); // For header user info, logout, and footer year
    }

    // DOM Elements
    const loadingIndicator = document.getElementById('confirmationLoadingIndicator');
    const confirmationContent = document.getElementById('confirmationContent');
    
    const mainTitle = document.getElementById('confirmationMainTitle');
    const subtitle = document.getElementById('confirmationSubtitle');
    const confirmationIconArea = document.querySelector('.confirmation-icon-area');

    const ticketMovieTitle = document.getElementById('ticketMovieTitle');
    const ticketTheatreName = document.getElementById('ticketTheatreName');
    const ticketBookingIdEl = document.getElementById('ticketBookingId');
    const ticketShowDateTime = document.getElementById('ticketShowDateTime');
    const ticketScreenNumber = document.getElementById('ticketScreenNumber');
    const ticketTotalAmount = document.getElementById('ticketTotalAmount');
    const ticketSeatsList = document.getElementById('ticketSeatsList');
    const ticketQrCodeImage = document.getElementById('ticketQrCodeImage');
    
    // Elements for displaying original price and discount, if applicable
    const ticketOriginalAmountRow = document.getElementById('ticketOriginalAmountRow'); // Create this div in HTML
    const ticketOriginalAmountEl = document.getElementById('ticketOriginalAmount');    // Create this span in HTML
    const ticketDiscountRowEl = document.getElementById('ticketDiscountRow');          // Create this div in HTML
    const ticketDiscountCodeEl = document.getElementById('ticketDiscountCode');        // Create this span in HTML
    const ticketDiscountAmountEl = document.getElementById('ticketDiscountAmount');    // Create this span in HTML


    const printTicketButton = document.getElementById('printTicketButton');
    
    let ticketQrCodeInstance = null;

    function formatTimeForDisplay(timeString) {
        if (!timeString) return 'N/A';
        try {
            const [hours, minutes] = timeString.split(':');
            const date = new Date();
            date.setHours(parseInt(hours, 10));
            date.setMinutes(parseInt(minutes, 10));
            return date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
        } catch (e) { return timeString; }
    }

    function formatDateForDisplay(dateString, options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString(undefined, options);
        } catch (e) { return dateString; }
    }

    function displayRealConfirmationData(data) {
        if (!data || !data.movie_title) { // Check for a key field from the booking data
            displayErrorState('Booking details could not be fully loaded.');
            return;
        }

        if (mainTitle) mainTitle.textContent = 'Booking Confirmed!';
        if (subtitle) subtitle.textContent = 'Your e-ticket is ready. Enjoy the show!';
        if (confirmationIconArea) {
            confirmationIconArea.classList.remove('error');
            confirmationIconArea.classList.add('success');
            confirmationIconArea.innerHTML = '<i class="fas fa-check-circle"></i>';
        }

        if (ticketMovieTitle) ticketMovieTitle.textContent = data.movie_title || 'N/A';
        if (ticketTheatreName) ticketTheatreName.textContent = data.theatre_name || 'N/A';
        if (ticketBookingIdEl) ticketBookingIdEl.textContent = data.booking_id || data.primary_booking_id || 'N/A'; // Use primary_booking_id if booking_id is not top-level
        
        if (ticketShowDateTime) {
            ticketShowDateTime.textContent = 
                `${formatDateForDisplay(data.show_date)} at ${formatTimeForDisplay(data.show_time)}`;
        }
        if (ticketScreenNumber) ticketScreenNumber.textContent = `Screen ${data.screen_number || 'N/A'}`;
        
        // Amount details
        const paymentDetails = data.payment_details; // From the /api/bookings/confirmation/:bookingId endpoint
        let finalAmountPaid = 0;
        let originalAmount = 0; // This needs to be calculated or passed if not directly in payment_details

        if (paymentDetails && paymentDetails.amount != null) {
            finalAmountPaid = parseFloat(paymentDetails.amount);
        } else if (data.final_amount_paid != null) { // Fallback if payment_details is not structured as expected
            finalAmountPaid = parseFloat(data.final_amount_paid);
        }
        
        // To display original amount and discount, we need more info from the backend.
        // The current /api/bookings/confirmation/:bookingId might not provide original_amount and discount_value directly.
        // For now, we'll just display the final amount.
        // If you modify the backend to return these, you can display them.
        
        if (ticketTotalAmount) {
            ticketTotalAmount.textContent = `₹${finalAmountPaid.toFixed(2)}`;
        }
        
        // Example of how to display discount if backend provides it:
        // Assuming 'data.original_booking_amount' and 'data.discount_applied_value' and 'data.discount_code_used'
        // are returned by the /api/bookings/confirmation/:bookingId endpoint.
        if (data.original_booking_amount && data.discount_applied_value > 0) {
            if (ticketOriginalAmountRow && ticketOriginalAmountEl) {
                ticketOriginalAmountEl.textContent = `₹${parseFloat(data.original_booking_amount).toFixed(2)}`;
                ticketOriginalAmountRow.style.display = 'block'; // Or your preferred display style
            }
            if (ticketDiscountRowEl && ticketDiscountCodeEl && ticketDiscountAmountEl) {
                ticketDiscountCodeEl.textContent = data.discount_code_used || 'Discount';
                ticketDiscountAmountEl.textContent = `- ₹${parseFloat(data.discount_applied_value).toFixed(2)}`;
                ticketDiscountRowEl.style.display = 'block'; // Or your preferred display style
            }
        } else {
            if (ticketOriginalAmountRow) ticketOriginalAmountRow.style.display = 'none';
            if (ticketDiscountRowEl) ticketDiscountRowEl.style.display = 'none';
        }


        if (ticketSeatsList) {
            ticketSeatsList.innerHTML = ''; // Clear previous
            const seats = data.all_booked_seats_for_transaction || (data.seat_number ? [{seat_number: data.seat_number, seat_type: data.seat_type}] : []);
            if (seats.length > 0) {
                seats.forEach(seat => {
                    const seatTag = document.createElement('span');
                    seatTag.classList.add('seat-tag-item');
                    seatTag.textContent = `${seat.seat_number} (${seat.seat_type || 'Regular'})`;
                    ticketSeatsList.appendChild(seatTag);
                });
            } else {
                ticketSeatsList.innerHTML = '<span class="seat-tag-item">N/A</span>';
            }
        }

        generateTicketQrCode(data);
        if(confirmationContent) confirmationContent.style.display = 'block';
    }
    
    function displayErrorState(errorMessage) {
        if (mainTitle) mainTitle.textContent = 'Booking Failed or Not Found';
        if (subtitle) subtitle.textContent = errorMessage || 'There was an issue retrieving your booking. Please contact support or check "My Bookings".';
        if (confirmationIconArea) {
            confirmationIconArea.classList.remove('success');
            confirmationIconArea.classList.add('error');
            confirmationIconArea.innerHTML = '<i class="fas fa-times-circle"></i>';
        }
        if (document.querySelector('.ticket-preview-area')) {
            document.querySelector('.ticket-preview-area').style.display = 'none';
        }
        if (printTicketButton) printTicketButton.style.display = 'none';
        if(confirmationContent) confirmationContent.style.display = 'block';
    }

    function generateTicketQrCode(bookingData) { // bookingData is the real booking data from backend
        if (!ticketQrCodeImage) return;
        
        ticketQrCodeImage.innerHTML = ''; 
        const bookingIdentifier = bookingData.booking_id || bookingData.primary_booking_id || 'Unavailable';
        const movieInfo = (bookingData.movie_title || 'Movie').substring(0, 25);
        const showDateTime = `${bookingData.show_date} ${bookingData.show_time}`;
        const seatsArray = bookingData.all_booked_seats_for_transaction || (bookingData.seat_number ? [{seat_number: bookingData.seat_number}] : []);
        const seatsInfo = seatsArray.map(s => s.seat_number).join(',');
        const amountPaid = bookingData.payment_details?.amount || bookingData.final_amount_paid || 0;

        const qrText = `CineVerse E-Ticket\nID: ${bookingIdentifier}\nMovie: ${movieInfo}\nShow: ${showDateTime}\nSeats: ${seatsInfo}\nAmount: Rs.${parseFloat(amountPaid).toFixed(2)}`;

        try {
            if (ticketQrCodeInstance) {
                ticketQrCodeInstance.clear();
            }
            ticketQrCodeInstance = new QRCode(ticketQrCodeImage, {
                text: qrText,
                width: 160, 
                height: 160,
                colorDark: "#0D1117",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M 
            });
        } catch (err) {
            console.error("Ticket QR Code generation failed:", err);
            ticketQrCodeImage.innerHTML = "<p style='font-size:0.8em; color:var(--color-error);'>QR Error</p>";
        }
    }

    if (printTicketButton) {
        printTicketButton.addEventListener('click', () => {
            window.print();
        });
    }

    // --- Main Logic for Real Booking Flow ---
    async function fetchAndDisplayBookingDetails() {
        if (loadingIndicator) loadingIndicator.style.display = 'flex';
        if (confirmationContent) confirmationContent.style.display = 'none';

        const urlParams = new URLSearchParams(window.location.search);
        const bookingIdFromUrl = urlParams.get('bookingId'); // Get the real bookingId

        // Fallback to sessionStorage if bookingId not in URL (e.g. after a refresh if user manually removed param)
        // but primary source should be URL param.
        const bookingIdForFetch = bookingIdFromUrl || sessionStorage.getItem('last_booking_id');


        if (bookingIdForFetch) {
            try {
                // API endpoint to fetch full booking details for confirmation
                const response = await fetch(`/api/bookings/confirmation/${bookingIdForFetch}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `Failed to fetch booking confirmation (status ${response.status})`);
                }
                const bookingData = await response.json();
                displayRealConfirmationData(bookingData);
                
                // Clear 'last_booking_id' from sessionStorage after successful display
                // to prevent accidental re-use if the user navigates away and back without a new bookingId in URL.
                sessionStorage.removeItem('last_booking_id');

            } catch (error) {
                console.error('Error fetching booking confirmation:', error);
                displayErrorState(error.message);
            }
        } else {
            console.error('No bookingId found in URL or session storage for confirmation page.');
            displayErrorState('No booking ID specified. Cannot display confirmation.');
        }
        
        if (loadingIndicator) loadingIndicator.style.display = 'none';
    }

    fetchAndDisplayBookingDetails();
});
