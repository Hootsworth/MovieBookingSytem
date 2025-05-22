// public/js/seat-selection.js
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initializeCommon === 'function') {
        initializeCommon();
    }

    // DOM Elements
    const movieTitleBanner = document.getElementById('movieTitleBanner');
    const showtimeDetailsBanner = document.getElementById('showtimeDetailsBanner');
    const seatsGridContainer = document.getElementById('seatsGridContainer');
    const loadingSeatsIndicator = document.getElementById('loadingSeatsIndicator');
    const seatsMessage = document.getElementById('seatsMessage');

    const summaryMovieTitle = document.getElementById('summaryMovieTitle');
    const summaryShowtimeDateTime = document.getElementById('summaryShowtimeDateTime');
    const summarySelectedSeatsOutput = document.getElementById('summarySelectedSeatsOutput');
    const summaryTicketCount = document.getElementById('summaryTicketCount');
    const summaryTotalPrice = document.getElementById('summaryTotalPrice');
    const proceedToPaymentBtn = document.getElementById('proceedToPaymentBtn');

    let selectedSeats = []; // Array to store selected seat objects { id, number, type, price }
    let seatPrices = {
        'Regular': 150,
        'Premium': 250,
        'VIP': 400
    };
    let currentShowtimeData = null;
    let currentMovieData = null;

    // Configuration for aisles
    const AISLE_AFTER_SEAT_NUMBERS = [2, 6]; // Add an aisle after seat number 2 and 6 (0-indexed for calculation, 1-indexed for display)
    const AISLE_WIDTH_UNITS = 1; // How many "seat units" wide an aisle should be

    function displaySeatsMessage(message, type = 'info') {
        if (!seatsMessage) return;
        seatsMessage.innerHTML = `<p class="${type}">${message}</p>`; // Ensure message is wrapped in a paragraph
        seatsMessage.className = `message-area ${type}`; // Apply type class for styling
        seatsMessage.style.display = 'block';
    }

    function formatTimeForDisplay(timeString) {
        if (!timeString) return 'N/A';
        try {
            const [hours, minutes] = timeString.split(':');
            const date = new Date();
            date.setHours(parseInt(hours, 10));
            date.setMinutes(parseInt(minutes, 10));
            return date.toLocaleTimeString(navigator.language, { hour: 'numeric', minute: '2-digit', hour12: true });
        } catch (e) { console.error("Error formatting time:", e); return timeString; }
    }

    function formatDateForDisplay(dateString) {
        if (!dateString) return 'N/A';
        try {
            const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
            return new Date(dateString).toLocaleDateString(navigator.language, options);
        } catch (e) { console.error("Error formatting date:", e); return dateString; }
    }

    async function fetchPageData(showtimeId, movieId) {
        if (loadingSeatsIndicator) loadingSeatsIndicator.style.display = 'flex';
        if (seatsMessage) seatsMessage.style.display = 'none';

        try {
            const movieResponse = await fetch(`/api/movies/${movieId}`);
            if (!movieResponse.ok) throw new Error(`Failed to load movie details (status: ${movieResponse.status}).`);
            currentMovieData = await movieResponse.json();
            if (movieTitleBanner) movieTitleBanner.textContent = currentMovieData.title || 'Movie Title';
            if (summaryMovieTitle) summaryMovieTitle.textContent = currentMovieData.title || 'N/A';

            const showtimeResponse = await fetch(`/api/showtimes/${showtimeId}`);
            if (!showtimeResponse.ok) throw new Error(`Failed to load showtime details (status: ${showtimeResponse.status}).`);
            currentShowtimeData = await showtimeResponse.json();

            const theatreName = currentShowtimeData.theatre_name || 'Theatre';
            const screenNumber = currentShowtimeData.screen_number || 'N/A';
            const showDate = formatDateForDisplay(currentShowtimeData.show_date);
            const showTime = formatTimeForDisplay(currentShowtimeData.show_time);

            if (showtimeDetailsBanner) {
                showtimeDetailsBanner.textContent =
                    `${theatreName} - Screen ${screenNumber} | ${showDate} at ${showTime}`;
            }
            if (summaryShowtimeDateTime) {
                summaryShowtimeDateTime.textContent = `${showDate}, ${showTime}`;
            }

            const seatsResponse = await fetch(`/api/seats/showtime/${showtimeId}`);
            if (!seatsResponse.ok) throw new Error(`Failed to load seat layout (status: ${seatsResponse.status}).`);
            const seatLayoutData = await seatsResponse.json();

            renderSeats(seatLayoutData.seats);

        } catch (error) {
            console.error('Error fetching page data:', error);
            displaySeatsMessage(`Error loading page data: ${error.message}`, 'error');
            if (movieTitleBanner && !currentMovieData) movieTitleBanner.textContent = 'Error Loading';
            if (showtimeDetailsBanner && !currentShowtimeData) showtimeDetailsBanner.textContent = 'Could not load showtime.';
        } finally {
            if (loadingSeatsIndicator) loadingSeatsIndicator.style.display = 'none';
        }
    }

    function renderSeats(seats) {
        if (!seatsGridContainer) {
            console.error("Seats grid container not found.");
            return;
        }
        seatsGridContainer.innerHTML = ''; // Clear previous seats

        if (!seats || seats.length === 0) {
            displaySeatsMessage('No seats available for this showtime, or layout is undefined.', 'info');
            return;
        }

        const rowsMap = new Map();
        let maxSeatNumberInAnyRow = 0;

        seats.forEach(seat => {
            const rowLetter = seat.seat_number.charAt(0).toUpperCase();
            const seatNumOnly = parseInt(seat.seat_number.substring(1));

            if (isNaN(seatNumOnly)) {
                console.warn(`Invalid seat number format: ${seat.seat_number}`);
                return; // Skip this seat
            }

            if (!rowsMap.has(rowLetter)) {
                rowsMap.set(rowLetter, []);
            }
            rowsMap.get(rowLetter).push({...seat, seatNumOnly }); // Store parsed number
            if (seatNumOnly > maxSeatNumberInAnyRow) {
                maxSeatNumberInAnyRow = seatNumOnly;
            }
        });

        // Calculate total columns: seats + row label + aisles
        // Number of aisles is determined by AISLE_AFTER_SEAT_NUMBERS
        const numberOfAisles = AISLE_AFTER_SEAT_NUMBERS.length;
        const totalColumnsForSeatsAndAisles = maxSeatNumberInAnyRow + (numberOfAisles * AISLE_WIDTH_UNITS);
        const totalGridColumns = 1 + totalColumnsForSeatsAndAisles;

        seatsGridContainer.style.gridTemplateColumns = `auto repeat(${totalColumnsForSeatsAndAisles}, minmax(30px, auto))`;

        const sortedRowLetters = Array.from(rowsMap.keys()).sort();

        sortedRowLetters.forEach(rowLetter => {
            const rowSeats = rowsMap.get(rowLetter).sort((a, b) => a.seatNumOnly - b.seatNumOnly);

            // 1. Add Row Label Cell
            const rowLabelCell = document.createElement('div');
            rowLabelCell.classList.add('row-label-cell');
            rowLabelCell.textContent = rowLetter;
            // rowLabelCell.style.gridRow = `span 1`; // Not needed if each item is one cell
            // rowLabelCell.style.gridColumn = `1 / 2`; // Explicitly place in first column
            seatsGridContainer.appendChild(rowLabelCell);

            // 2. Add Seats and Aisles for the current row
            let currentSeatDisplayIndex = 1; // This tracks the visual seat number considering aisles
            for (let seatNumToRender = 1; seatNumToRender <= maxSeatNumberInAnyRow; seatNumToRender++) {
                const matchingSeat = rowSeats.find(s => s.seatNumOnly === seatNumToRender);

                if (matchingSeat) {
                    const seatElement = document.createElement('div');
                    seatElement.classList.add('seat');
                    seatElement.dataset.seatId = matchingSeat.seat_id;
                    seatElement.dataset.seatNumber = matchingSeat.seat_number;
                    seatElement.dataset.seatType = matchingSeat.seat_type || 'Regular'; // Default to Regular
                    seatElement.dataset.seatTypeAbbr = (matchingSeat.seat_type || 'Regular').charAt(0).toUpperCase();
                    seatElement.textContent = seatNumToRender.toString(); // Display just the number part

                    if (matchingSeat.is_booked) {
                        seatElement.classList.add('occupied');
                        seatElement.setAttribute('aria-disabled', 'true');
                        seatElement.setAttribute('title', `Seat ${matchingSeat.seat_number} (Occupied)`);
                    } else {
                        seatElement.classList.add('available');
                        // Add seat type class, e.g., 'premium', 'vip'
                        if (matchingSeat.seat_type) {
                            seatElement.classList.add(matchingSeat.seat_type.toLowerCase());
                        }
                        const price = seatPrices[matchingSeat.seat_type] || seatPrices['Regular'];
                        seatElement.setAttribute('role', 'button');
                        seatElement.setAttribute('tabindex', '0');
                        seatElement.setAttribute('aria-label', `Seat ${matchingSeat.seat_number}, Type: ${matchingSeat.seat_type}, Price: ₹${price}`);
                        seatElement.addEventListener('click', handleSeatClick);
                        seatElement.addEventListener('keydown', (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault();
                                handleSeatClick(event);
                            }
                        });
                    }
                    // seatElement.style.gridColumnStart = (currentSeatDisplayIndex + 1).toString(); // +1 because grid is 1-indexed & first col is label
                    seatsGridContainer.appendChild(seatElement);
                } else {
                    // If a seat is expected but not found (e.g. seat 5 in a row that only goes up to 4), render an empty spacer
                    // This ensures the grid alignment is maintained if rows have varying seat counts.
                    // However, if we base it on maxSeatNumberInAnyRow, this implies all rows should conceptually span that width.
                    const emptySpacer = document.createElement('div');
                    emptySpacer.classList.add('aisle-spacer', 'empty-seat-placeholder'); // Make it visually distinct if needed
                    // emptySpacer.style.gridColumnStart = (currentSeatDisplayIndex + 1).toString();
                    seatsGridContainer.appendChild(emptySpacer);
                }
                currentSeatDisplayIndex++;

                // Check if an aisle should be added AFTER this seat number
                if (AISLE_AFTER_SEAT_NUMBERS.includes(seatNumToRender)) {
                    for (let i = 0; i < AISLE_WIDTH_UNITS; i++) {
                        const aisleElement = document.createElement('div');
                        aisleElement.classList.add('aisle-spacer');
                        aisleElement.setAttribute('aria-hidden', 'true'); // Aisles are not interactive
                        // aisleElement.style.gridColumnStart = (currentSeatDisplayIndex + 1).toString();
                        seatsGridContainer.appendChild(aisleElement);
                        currentSeatDisplayIndex++;
                    }
                }
            }
             // Fill remaining columns if this row is shorter than maxSeatNumberInAnyRow + aisles
            const expectedGridCellsForRow = 1 + totalColumnsForSeatsAndAisles; // label + seats/aisles
            const currentGridCellsForRow = 1 + currentSeatDisplayIndex -1; // label + what we added

            for(let i = currentGridCellsForRow; i < expectedGridCellsForRow; i++) {
                const emptySpacer = document.createElement('div');
                emptySpacer.classList.add('aisle-spacer', 'empty-trailing-placeholder');
                seatsGridContainer.appendChild(emptySpacer);
            }
        });

        if (seats.length === 0 && !loadingSeatsIndicator.style.display.includes('flex')) { // Check loading indicator too
            displaySeatsMessage('No seats available for this showtime.', 'info');
        }
    }


    function handleSeatClick(event) {
        const seatElement = event.currentTarget;
        if (seatElement.classList.contains('occupied')) return;

        const seatId = parseInt(seatElement.dataset.seatId);
        const seatNumber = seatElement.dataset.seatNumber;
        const seatType = seatElement.dataset.seatType;
        const seatPrice = seatPrices[seatType] || seatPrices['Regular'];

        const seatIndex = selectedSeats.findIndex(s => s.id === seatId);

        if (seatIndex > -1) {
            selectedSeats.splice(seatIndex, 1);
            seatElement.classList.remove('selected');
            seatElement.setAttribute('aria-pressed', 'false');
        } else {
            // Optional: Add a limit to the number of seats
            // if (selectedSeats.length >= MAX_SEATS_ALLOWED) {
            //     displaySeatsMessage(`You can select a maximum of ${MAX_SEATS_ALLOWED} seats.`, 'warning');
            //     return;
            // }
            selectedSeats.push({ id: seatId, number: seatNumber, type: seatType, price: seatPrice });
            seatElement.classList.add('selected');
            seatElement.setAttribute('aria-pressed', 'true');
        }
        updateBookingSummary();
    }

    function updateBookingSummary() {
        if (summarySelectedSeatsOutput) {
            if (selectedSeats.length === 0) {
                summarySelectedSeatsOutput.innerHTML = 'None';
            } else {
                summarySelectedSeatsOutput.innerHTML = selectedSeats.map(s =>
                    `<span class="seat-tag">${s.number} (${s.type})</span>`
                ).join('');
            }
        }
        if (summaryTicketCount) {
            summaryTicketCount.textContent = selectedSeats.length;
        }

        const totalPrice = selectedSeats.reduce((total, seat) => total + (seat.price || 0), 0);
        if (summaryTotalPrice) {
            summaryTotalPrice.textContent = `₹${totalPrice.toFixed(2)}`;
        }

        if (proceedToPaymentBtn) {
            proceedToPaymentBtn.disabled = selectedSeats.length === 0;
        }
    }

    if (proceedToPaymentBtn) {
        proceedToPaymentBtn.addEventListener('click', () => {
            if (selectedSeats.length === 0) {
                displaySeatsMessage('Please select at least one seat before proceeding.', 'error');
                return;
            }

            sessionStorage.setItem('selected_seats_details', JSON.stringify(selectedSeats));
            sessionStorage.setItem('showtime_details_for_payment', JSON.stringify(currentShowtimeData));
            sessionStorage.setItem('movie_details_for_payment', JSON.stringify(currentMovieData));
            const totalPrice = selectedSeats.reduce((total, seat) => total + seat.price, 0);
            sessionStorage.setItem('total_booking_amount', totalPrice.toFixed(2));

            const movieIdForPayment = currentMovieData ? currentMovieData.movie_id : urlParams.get('movieId');
            const showtimeIdForPayment = currentShowtimeData ? currentShowtimeData.showtime_id : urlParams.get('showtimeId');

            if (!movieIdForPayment || !showtimeIdForPayment) {
                displaySeatsMessage('Cannot proceed. Movie or Showtime ID is missing.', 'error');
                console.error("Missing IDs for payment:", { movieIdForPayment, showtimeIdForPayment });
                return;
            }
            window.location.href = `/payment.html?movieId=${movieIdForPayment}&showtimeId=${showtimeIdForPayment}`;
        });
    }

    // Initial Load
    const urlParams = new URLSearchParams(window.location.search);
    const showtimeId = urlParams.get('showtimeId');
    const movieId = urlParams.get('movieId');

    if (showtimeId && movieId) {
        fetchPageData(showtimeId, movieId);
    } else {
        console.error('Missing showtimeId or movieId in URL query parameters.');
        displaySeatsMessage('Could not load page. Missing required showtime or movie information.', 'error');
        if (movieTitleBanner) movieTitleBanner.textContent = 'Error';
        if (showtimeDetailsBanner) showtimeDetailsBanner.textContent = 'Invalid showtime or movie specified.';
        if (loadingSeatsIndicator) loadingSeatsIndicator.style.display = 'none';
    }

    // Initialize common elements like footer year if the function exists
    if (typeof initializeCommon === 'function') {
        initializeCommon(); // Call this after main page logic might interact with common elements
    }
});
