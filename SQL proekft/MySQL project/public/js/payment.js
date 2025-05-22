// public/js/payment.js
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initializeCommon === 'function') {
        initializeCommon();
    }

    // Summary DOM Elements
    const summaryMovieTitle = document.getElementById('summaryMovieTitle');
    const summaryTheatreName = document.getElementById('summaryTheatreName');
    const summaryScreenNumber = document.getElementById('summaryScreenNumber');
    const summaryShowDateTime = document.getElementById('summaryShowDateTime');
    const summarySeatsInfo = document.getElementById('summarySeatsInfo');
    const summaryTicketCount = document.getElementById('summaryTicketCount');
    const summarySubtotalAmountEl = document.getElementById('summarySubtotalAmount');
    const discountRowEl = document.getElementById('discountRow');
    const appliedDiscountCodeEl = document.getElementById('appliedDiscountCode');
    const summaryDiscountAppliedEl = document.getElementById('summaryDiscountApplied');
    const summaryTotalAmountEl = document.getElementById('summaryTotalAmount');

    // Payment Form DOM Elements
    const paymentPageMessage = document.getElementById('paymentPageMessage');
    const paymentMethodTabs = document.querySelectorAll('.payment-method-tab');
    const selectedPaymentMethodTypeInput = document.getElementById('selectedPaymentMethodType');
    const cardPaymentSection = document.getElementById('cardPaymentSection');
    const upiPaymentSection = document.getElementById('upiPaymentSection');
    const mainPaymentForm = document.getElementById('mainPaymentForm');
    const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
    const paymentProcessingLoader = document.getElementById('paymentProcessingLoader');
    const finalAmountToPayInput = document.getElementById('finalAmountToPay');
    const activeDiscountIdInput = document.getElementById('activeDiscountId');

    // Discount Elements
    const discountCodeInput = document.getElementById('discountCodeInput');
    const applyDiscountBtn = document.getElementById('applyDiscountBtn');
    const discountMessage = document.getElementById('discountMessage');

    // Card Inputs
    const cardNumberInput = document.getElementById('cardNumber');
    const cardNameInput = document.getElementById('cardName');
    const expiryDateInput = document.getElementById('expiryDate');
    const cvvInput = document.getElementById('cvv');

    // UPI Inputs & Display
    const upiIdInput = document.getElementById('upiId');
    const qrCodeDisplay = document.getElementById('qrCodeDisplay');
    const qrPlaceholderText = document.getElementById('qrPlaceholderText');
    const qrStatusMessage = document.getElementById('qrStatusMessage');
    const generateQrForUpiIdBtn = document.getElementById('generateQrForUpiId');
    
    // Confirmation Email Input (NEW)
    const confirmationEmailInput = document.getElementById('confirmationEmail');
    
    let qrCodeInstance = null; 

    // Data from sessionStorage
    let selectedSeatsDetails = JSON.parse(sessionStorage.getItem('selected_seats_details'));
    let showtimeDetailsForPayment = JSON.parse(sessionStorage.getItem('showtime_details_for_payment'));
    let movieDetailsForPayment = JSON.parse(sessionStorage.getItem('movie_details_for_payment'));
    let originalTotalBookingAmount = parseFloat(sessionStorage.getItem('total_booking_amount'));
    let currentDiscountPercentage = 0;
    let currentDiscountId = null;
    let currentDiscountCode = '';

    // Auto-fill confirmation email if user is logged in and email is available
    const storedUser = JSON.parse(sessionStorage.getItem('cineverse_user'));
    if (storedUser && storedUser.email && confirmationEmailInput) {
        confirmationEmailInput.value = storedUser.email;
    }


    function displayPaymentMessage(message, type = 'error', targetElement = paymentPageMessage) {
        if (!targetElement) return;
        targetElement.innerHTML = `<p class="${type}">${message}</p>`;
        targetElement.className = `message-area ${type}`; // Ensure class is set correctly
        targetElement.style.display = 'block';
        const hideDelay = targetElement === paymentPageMessage ? 7000 : 5000;
        setTimeout(() => { 
            if (targetElement.style.display !== 'none') { // Check if still visible
                targetElement.style.display = 'none'; 
                targetElement.innerHTML = ''; 
            }
        }, hideDelay);
    }

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
    function formatDateForDisplay(dateString) {
        if (!dateString) return 'N/A';
        try {
            const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
            return new Date(dateString).toLocaleDateString(undefined, options);
        } catch (e) { return dateString; }
    }

    function updateDisplayedTotals() {
        if (isNaN(originalTotalBookingAmount)) {
            console.warn("Original total booking amount is not a number. Cannot update totals.");
            return;
        }

        if (summarySubtotalAmountEl) summarySubtotalAmountEl.textContent = `₹${originalTotalBookingAmount.toFixed(2)}`;
        
        let finalAmount = originalTotalBookingAmount;
        if (currentDiscountPercentage > 0) {
            const discountValue = (originalTotalBookingAmount * currentDiscountPercentage) / 100;
            if (summaryDiscountAppliedEl) summaryDiscountAppliedEl.textContent = `- ₹${discountValue.toFixed(2)}`;
            if (appliedDiscountCodeEl) appliedDiscountCodeEl.textContent = currentDiscountCode;
            if (discountRowEl) discountRowEl.style.display = 'flex'; // Use flex as per summary item style
            finalAmount -= discountValue;
        } else {
            if (discountRowEl) discountRowEl.style.display = 'none';
        }
        
        finalAmount = Math.max(0, finalAmount); // Ensure final amount is not negative

        if (summaryTotalAmountEl) summaryTotalAmountEl.textContent = `₹${finalAmount.toFixed(2)}`;
        if (finalAmountToPayInput) finalAmountToPayInput.value = finalAmount.toFixed(2);
        if (activeDiscountIdInput) activeDiscountIdInput.value = currentDiscountId || '';

        // Update QR code if UPI is selected and amount changes
        if (selectedPaymentMethodTypeInput && selectedPaymentMethodTypeInput.value === 'UPI') {
            generateUpiQrCode(upiIdInput ? upiIdInput.value.trim() : null, finalAmount);
        }
    }

    function populateBookingSummary() {
        if (!selectedSeatsDetails || !showtimeDetailsForPayment || !movieDetailsForPayment || isNaN(originalTotalBookingAmount)) {
            displayPaymentMessage('Booking details are missing. Please try selecting seats again.', 'error');
            if(confirmPaymentBtn) confirmPaymentBtn.disabled = true;
            return;
        }

        if (summaryMovieTitle) summaryMovieTitle.textContent = movieDetailsForPayment.title || 'N/A';
        if (summaryTheatreName) summaryTheatreName.textContent = showtimeDetailsForPayment.theatre_name || 'N/A';
        if (summaryScreenNumber) summaryScreenNumber.textContent = `Screen ${showtimeDetailsForPayment.screen_number || 'N/A'}`;
        if (summaryShowDateTime) summaryShowDateTime.textContent = 
            `${formatDateForDisplay(showtimeDetailsForPayment.show_date)}, ${formatTimeForDisplay(showtimeDetailsForPayment.show_time)}`;
        
        if (summarySeatsInfo) {
            summarySeatsInfo.textContent = selectedSeatsDetails.map(s => s.number).join(', ') || 'N/A';
        }
        if (summaryTicketCount) summaryTicketCount.textContent = selectedSeatsDetails.length || '0';
        
        updateDisplayedTotals(); // This will set subtotal and final total
    }

    function switchPaymentMethod(method) {
        paymentMethodTabs.forEach(tab => tab.classList.remove('active'));
        const activeTab = document.querySelector(`.payment-method-tab[data-method="${method}"]`);
        if (activeTab) activeTab.classList.add('active');
        
        if(selectedPaymentMethodTypeInput) selectedPaymentMethodTypeInput.value = method;

        if (cardPaymentSection) cardPaymentSection.style.display = method === 'Card' ? 'block' : 'none';
        if (upiPaymentSection) upiPaymentSection.style.display = method === 'UPI' ? 'block' : 'none';

        if (method === 'UPI') {
            const currentFinalAmount = finalAmountToPayInput ? (parseFloat(finalAmountToPayInput.value) || originalTotalBookingAmount) : originalTotalBookingAmount;
            generateUpiQrCode(upiIdInput ? upiIdInput.value.trim() : null, currentFinalAmount);
        }
    }

    paymentMethodTabs.forEach(tab => {
        tab.addEventListener('click', () => switchPaymentMethod(tab.dataset.method));
    });

    function generateUpiQrCode(upiId = null, amount) {
        if (!qrCodeDisplay) return;

        if (isNaN(amount) || amount < 0) { 
            if(qrStatusMessage) qrStatusMessage.textContent = amount < 0 ? 'Amount invalid for QR code.' : 'Scan to pay.';
            if(qrCodeDisplay && amount < 0) qrCodeDisplay.innerHTML = ''; // Clear if invalid
            if(qrPlaceholderText && amount < 0) qrPlaceholderText.style.display = 'block';
            if (amount === 0 && qrCodeDisplay) { 
                qrCodeDisplay.innerHTML = '<p class="qr-message">No payment needed.</p>';
                if(qrPlaceholderText) qrPlaceholderText.style.display = 'none';
                if(qrStatusMessage) qrStatusMessage.textContent = 'Total is ₹0.00';
                return;
            }
            if (amount < 0) return; // Don't proceed if amount is negative
        }
        
        qrCodeDisplay.innerHTML = ''; // Clear previous QR
        if(qrPlaceholderText) qrPlaceholderText.style.display = 'none';
        if(qrStatusMessage) qrStatusMessage.textContent = 'Generating QR Code...';

        const merchantVpa = upiId || 'merchant-vpa@examplebank'; // Default or user-provided
        const merchantName = "CineVerse"; // Your merchant name
        const transactionNote = `Booking for ${movieDetailsForPayment?.title || 'Movie'}`;
        const upiString = `upi://pay?pa=${merchantVpa}&pn=${encodeURIComponent(merchantName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(transactionNote.substring(0,50))}`;

        if (qrCodeInstance) {
            qrCodeInstance.clear(); // Clear previous instance if exists
        }
        try {
            qrCodeInstance = new QRCode(qrCodeDisplay, {
                text: upiString,
                width: 160,
                height: 160,
                colorDark: "#0D1117", // Dark color for QR code
                colorLight: "#ffffff", // Light color for QR code background
                correctLevel: QRCode.CorrectLevel.M // Error correction level
            });
            if(qrStatusMessage) qrStatusMessage.textContent = `Scan to pay ₹${amount.toFixed(2)}`;
        } catch (error) {
            console.error("Error generating QR Code:", error);
            if(qrStatusMessage) qrStatusMessage.textContent = 'Could not generate QR code.';
            if(qrPlaceholderText) qrPlaceholderText.style.display = 'block';
        }
    }

    if (generateQrForUpiIdBtn && upiIdInput) {
        generateQrForUpiIdBtn.addEventListener('click', () => {
            const customUpiId = upiIdInput.value.trim();
            const currentFinalAmount = finalAmountToPayInput ? (parseFloat(finalAmountToPayInput.value) || originalTotalBookingAmount) : originalTotalBookingAmount;
            if (customUpiId && /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(customUpiId)) { // Basic UPI ID format check
                generateUpiQrCode(customUpiId, currentFinalAmount);
            } else {
                displayPaymentMessage('Please enter a valid UPI ID to generate a specific QR code.', 'error', paymentPageMessage);
                generateUpiQrCode(null, currentFinalAmount); // Generate with default VPA if custom is invalid
            }
        });
    }
    
    // Card input formatting
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
            let formattedValue = '';
            for (let i = 0; i < value.length; i += 4) {
                formattedValue += value.substring(i, i + 4) + ' ';
            }
            e.target.value = formattedValue.trim().substring(0, 19); // Max 16 digits + 3 spaces
        });
    }

    if (expiryDateInput) {
        expiryDateInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length > 2) {
                value = value.substring(0, 2) + '/' + value.substring(2, 4);
            }
            e.target.value = value.substring(0,5); // MM/YY
        });
    }

    // Discount Code Logic
    if (applyDiscountBtn && discountCodeInput) {
        applyDiscountBtn.addEventListener('click', async () => {
            const code = discountCodeInput.value.trim().toUpperCase();
            if (!code) {
                displayPaymentMessage('Please enter a discount code.', 'warning', discountMessage);
                return;
            }

            applyDiscountBtn.disabled = true;
            applyDiscountBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Applying...';

            try {
                const response = await fetch('/api/payments/validate-discount', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ discount_code: code })
                });
                const result = await response.json();

                if (response.ok) {
                    currentDiscountPercentage = parseFloat(result.discount_percentage);
                    currentDiscountId = result.discount_id;
                    currentDiscountCode = result.code; // Store the applied code
                    if(appliedDiscountCodeEl) appliedDiscountCodeEl.textContent = currentDiscountCode; // Display it
                    displayPaymentMessage(`Discount '${currentDiscountCode}' applied! ${result.discount_percentage}% off.`, 'success', discountMessage);
                    updateDisplayedTotals();
                    discountCodeInput.disabled = true; // Disable input after successful application
                    applyDiscountBtn.textContent = 'Applied'; // Change button text
                } else {
                    // Reset discount if validation fails
                    currentDiscountPercentage = 0; 
                    currentDiscountId = null;
                    currentDiscountCode = '';
                    if(appliedDiscountCodeEl) appliedDiscountCodeEl.textContent = '';
                    displayPaymentMessage(result.message || 'Invalid or expired discount code.', 'error', discountMessage);
                    updateDisplayedTotals(); // Recalculate totals without discount
                    applyDiscountBtn.disabled = false;
                    applyDiscountBtn.innerHTML = 'Apply';
                }
            } catch (error) {
                currentDiscountPercentage = 0;
                currentDiscountId = null;
                currentDiscountCode = '';
                if(appliedDiscountCodeEl) appliedDiscountCodeEl.textContent = '';
                displayPaymentMessage('Error validating discount code. Please try again.', 'error', discountMessage);
                updateDisplayedTotals();
                applyDiscountBtn.disabled = false;
                applyDiscountBtn.innerHTML = 'Apply';
            }
        });
    }


    // Form Submission Logic
    if (mainPaymentForm) {
        mainPaymentForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            if (paymentProcessingLoader) paymentProcessingLoader.style.display = 'flex';
            if (confirmPaymentBtn) confirmPaymentBtn.disabled = true;
            displayPaymentMessage('Processing your booking...', 'info', paymentPageMessage);

            const paymentMethod = selectedPaymentMethodTypeInput.value;
            let paymentDetailsToken = `simulated_${paymentMethod.toLowerCase()}_token_${Date.now()}`;
            
            // Basic "validation" for card details if card payment is selected (for simulation)
            if (paymentMethod === 'Card') {
                if (!cardNumberInput.value || !cardNameInput.value || !expiryDateInput.value || !cvvInput.value) {
                     // Allowing to proceed for simulation even if empty, but a real app would validate strictly.
                     console.warn('Card details are incomplete, proceeding with simulation.');
                }
            } else if (paymentMethod === 'UPI') {
                // For UPI, token can be the UPI ID or a generic QR scan confirmation
                paymentDetailsToken = upiIdInput.value.trim() || `simulated_qr_payment_${Date.now()}`;
            }

            const finalAmount = parseFloat(finalAmountToPayInput.value);
            const emailForTicket = confirmationEmailInput ? confirmationEmailInput.value.trim() : ''; // Get email

            // Frontend validation for email
            if (!emailForTicket || !/^\S+@\S+\.\S+$/.test(emailForTicket)) {
                displayPaymentMessage('Please enter a valid email address for ticket confirmation.', 'error', paymentPageMessage);
                if (paymentProcessingLoader) paymentProcessingLoader.style.display = 'none';
                if (confirmPaymentBtn) confirmPaymentBtn.disabled = false;
                return; // Stop submission if email is invalid
            }

            if (!showtimeDetailsForPayment || !selectedSeatsDetails || isNaN(originalTotalBookingAmount) || isNaN(finalAmount)) {
                displayPaymentMessage('Critical booking information is missing. Cannot proceed.', 'error', paymentPageMessage);
                if (paymentProcessingLoader) paymentProcessingLoader.style.display = 'none';
                if (confirmPaymentBtn) confirmPaymentBtn.disabled = false;
                return;
            }
            
            const payload = {
                showtime_id: showtimeDetailsForPayment.showtime_id,
                seat_ids: selectedSeatsDetails.map(s => s.id),
                amount: finalAmount,
                original_amount: originalTotalBookingAmount,
                discount_id: currentDiscountId,
                payment_method: paymentMethod,
                payment_details_token: paymentDetailsToken,
                confirmation_email: emailForTicket // Include the email in the payload
            };

            try {
                const response = await fetch('/api/payments/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify(payload)
                });
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Booking processing failed.');
                }

                displayPaymentMessage(result.message || 'Booking successful! Redirecting...', 'success', paymentPageMessage);
                
                sessionStorage.removeItem('selected_seats_details');
                sessionStorage.removeItem('total_booking_amount');
                sessionStorage.setItem('last_booking_id', result.booking_id); 
                // Optionally store email for confirmation page, though backend should handle sending
                // sessionStorage.setItem('last_confirmation_email', emailForTicket); 

                setTimeout(() => {
                    window.location.href = `/payment-confirmation.html?bookingId=${result.booking_id}`;
                }, 2000);

            } catch (error) {
                displayPaymentMessage(error.message || 'An unexpected error occurred during booking.', 'error', paymentPageMessage);
                console.error('Booking submission error:', error);
                if (paymentProcessingLoader) paymentProcessingLoader.style.display = 'none';
                if (confirmPaymentBtn) confirmPaymentBtn.disabled = false;
            }
        });
    }

    // Initial setup
    populateBookingSummary();
    switchPaymentMethod('Card'); // Default to Card payment
});
