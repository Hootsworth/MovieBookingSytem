// public/js/admin/admin-dashboard.js
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initializeCommon === 'function') {
        initializeCommon();
        const user = JSON.parse(sessionStorage.getItem('cineverse_user'));
        if (!user || (user.user_type !== 'Admin' && user.user_type !== 'admin')) {
            console.warn("Admin access check: Not an admin or user session not found.");
            // Potentially redirect or disable admin functionalities
            // For now, we'll let it proceed but some actions might fail due to isAdmin middleware
        }
    }

    const loadingSummaryIndicator = document.getElementById('loadingSummaryIndicator');
    const adminSummaryMessage = document.getElementById('adminSummaryMessage');
    const summaryStatsGrid = document.getElementById('summaryStatsGrid');

    // Stat elements
    const totalUsersStat = document.getElementById('totalUsersStat');
    const totalMoviesStat = document.getElementById('totalMoviesStat');
    const totalTheatresStat = document.getElementById('totalTheatresStat');
    const totalShowtimesStat = document.getElementById('totalShowtimesStat');
    const totalBookingsStat = document.getElementById('totalBookingsStat');
    const totalDiscountsStat = document.getElementById('totalDiscountsStat'); // New stat element

    // Discount Management Elements
    const addDiscountForm = document.getElementById('addDiscountForm');
    const discountFormMessage = document.getElementById('discountFormMessage');
    const discountsTableBody = document.getElementById('discountsTableBody');
    const loadingDiscountsIndicator = document.getElementById('loadingDiscountsIndicator');
    const discountsListMessage = document.getElementById('discountsListMessage');


    function displayAdminMessage(message, type = 'info', targetElement = adminSummaryMessage) {
        if (!targetElement) return;
        targetElement.innerHTML = `<p class="${type}">${message}</p>`;
        targetElement.className = `message-area ${type}`;
        targetElement.style.display = 'block';
        if (targetElement !== adminSummaryMessage) { // Auto-hide for non-summary messages
             setTimeout(() => { targetElement.style.display = 'none'; targetElement.innerHTML = ''; }, 5000);
        }
    }

    async function fetchAdminSummary() {
        if (loadingSummaryIndicator) loadingSummaryIndicator.style.display = 'flex';
        if (summaryStatsGrid) summaryStatsGrid.style.display = 'none';
        if (adminSummaryMessage) adminSummaryMessage.style.display = 'none';

        try {
            const response = await fetch('/api/admin/summary');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to fetch admin summary (status ${response.status})`);
            }
            const data = await response.json();
            
            if (data.summary) {
                if (totalUsersStat) totalUsersStat.textContent = data.summary.users || 0;
                if (totalMoviesStat) totalMoviesStat.textContent = data.summary.movies || 0;
                if (totalTheatresStat) totalTheatresStat.textContent = data.summary.theatres || 0;
                if (totalShowtimesStat) totalShowtimesStat.textContent = data.summary.showtimes || 0;
                if (totalBookingsStat) totalBookingsStat.textContent = data.summary.bookings || 0;
                if (totalDiscountsStat) totalDiscountsStat.textContent = data.summary.discounts || 0; // Update discount stat
                if (summaryStatsGrid) summaryStatsGrid.style.display = 'grid';
            } else {
                displayAdminMessage('Summary data is not available.', 'warning');
            }

        } catch (error) {
            console.error('Error fetching admin summary:', error);
            displayAdminMessage(`Could not load admin summary: ${error.message}`, 'error');
        } finally {
            if (loadingSummaryIndicator) loadingSummaryIndicator.style.display = 'none';
        }
    }

    function formatDateForDisplay(dateString) {
        if (!dateString) return 'N/A';
        // Convert YYYY-MM-DD from DB to a more readable format or ensure input type="date" handles it.
        // For display in table, toLocaleDateString is fine.
        try {
            return new Date(dateString + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) { return dateString; }
    }

    async function fetchAndDisplayDiscounts() {
        if (loadingDiscountsIndicator) loadingDiscountsIndicator.style.display = 'flex';
        if (discountsListMessage) discountsListMessage.style.display = 'none';
        if (discountsTableBody) discountsTableBody.innerHTML = ''; // Clear previous list

        try {
            const response = await fetch('/api/admin/discounts');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to fetch discounts');
            }
            const discounts = await response.json();

            if (discounts.length === 0) {
                displayAdminMessage('No discount codes found.', 'info', discountsListMessage);
            } else {
                discounts.forEach(discount => {
                    const row = discountsTableBody.insertRow();
                    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                    const isActive = today >= discount.valid_from && today <= discount.valid_until;
                    
                    row.insertCell().textContent = discount.code;
                    row.insertCell().textContent = `${parseFloat(discount.discount_percentage).toFixed(2)}%`;
                    row.insertCell().textContent = formatDateForDisplay(discount.valid_from);
                    row.insertCell().textContent = formatDateForDisplay(discount.valid_until);
                    const statusCell = row.insertCell();
                    statusCell.textContent = isActive ? 'Active' : 'Expired/Upcoming';
                    statusCell.className = isActive ? 'status-active' : 'status-expired';
                    // Add action buttons (edit/delete) if needed in the future
                    // const actionsCell = row.insertCell();
                    // actionsCell.innerHTML = `<button class="btn btn-small btn-outline">Edit</button> <button class="btn btn-small btn-danger">Delete</button>`;
                });
            }
        } catch (error) {
            console.error('Error fetching discounts:', error);
            displayAdminMessage(`Error loading discounts: ${error.message}`, 'error', discountsListMessage);
        } finally {
            if (loadingDiscountsIndicator) loadingDiscountsIndicator.style.display = 'none';
        }
    }

    if (addDiscountForm) {
        addDiscountForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            const formData = new FormData(addDiscountForm);
            const discountData = {
                code: formData.get('code'),
                discount_percentage: formData.get('discount_percentage'),
                valid_from: formData.get('valid_from'),
                valid_until: formData.get('valid_until')
            };

            // Basic client-side validation
            if (new Date(discountData.valid_from) >= new Date(discountData.valid_until)) {
                displayAdminMessage('Valid From date must be before Valid Until date.', 'error', discountFormMessage);
                return;
            }
            if (parseFloat(discountData.discount_percentage) <=0 || parseFloat(discountData.discount_percentage) > 100) {
                 displayAdminMessage('Discount percentage must be between 1 and 100.', 'error', discountFormMessage);
                return;
            }


            try {
                const response = await fetch('/api/admin/discounts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(discountData)
                });
                const result = await response.json();

                if (response.ok) {
                    displayAdminMessage(result.message || 'Discount created successfully!', 'success', discountFormMessage);
                    addDiscountForm.reset();
                    fetchAndDisplayDiscounts(); // Refresh the list of discounts
                    fetchAdminSummary(); // Refresh summary stats
                } else {
                    displayAdminMessage(result.message || 'Failed to create discount.', 'error', discountFormMessage);
                }
            } catch (error) {
                console.error('Error creating discount:', error);
                displayAdminMessage('An unexpected error occurred.', 'error', discountFormMessage);
            }
        });
    }


    function setActiveSidebarLink() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.admin-nav li a');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.href === window.location.href || (currentPath.includes(link.getAttribute('href')) && link.getAttribute('href') !== '/admin/dashboard.html') || (currentPath === '/admin/dashboard.html' && link.getAttribute('href') === '/admin/dashboard.html') ) {
                 if(currentPath.endsWith(link.getAttribute('href'))) { // More specific match
                    link.classList.add('active');
                 } else if (link.getAttribute('href') === '/admin/dashboard.html' && currentPath.includes('/admin/dashboard.html')) {
                    link.classList.add('active'); // For the base dashboard page
                 }
            }
        });
    }

    // Initial calls
    fetchAdminSummary();
    fetchAndDisplayDiscounts(); // Fetch discounts on page load
    setActiveSidebarLink();
});
