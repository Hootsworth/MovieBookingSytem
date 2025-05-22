// public/js/admin/admin-users.js
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initializeCommon === 'function') {
        initializeCommon(); // Handles user welcome, logout, footer year, and admin check
    }

    const messageAreaManage = document.getElementById('manageUsersMessage');
    const messageAreaForm = document.getElementById('userFormMessage');
    
    function displayMessage(areaElement, message, type = 'error') {
        if (!areaElement) return;
        areaElement.innerHTML = `<p class="${type}">${message}</p>`;
        areaElement.className = `message-area ${type}`;
        areaElement.style.display = 'block';
        setTimeout(() => { areaElement.style.display = 'none'; areaElement.innerHTML = ''; }, 7000);
    }

    // --- Logic for manage-users.html ---
    const usersTableBody = document.querySelector('#usersTable tbody');
    const loadingUsersTableIndicator = document.getElementById('loadingUsersTableIndicator');

    async function fetchAndDisplayUsers() {
        if (!usersTableBody) return; // Only on manage-users.html
        if (loadingUsersTableIndicator) loadingUsersTableIndicator.style.display = 'flex';
        if (messageAreaManage) messageAreaManage.style.display = 'none';
        usersTableBody.innerHTML = '';

        try {
            const response = await fetch('/api/admin/users'); // API to get all users
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Failed to fetch users list.');
            }
            const users = await response.json();

            if (users.length === 0) {
                displayMessage(messageAreaManage, 'No users found.', 'info');
                const row = usersTableBody.insertRow();
                const cell = row.insertCell();
                cell.colSpan = 5; // Number of columns
                cell.textContent = 'No users registered.';
                cell.style.textAlign = 'center';
            } else {
                users.forEach(user => {
                    const row = usersTableBody.insertRow();
                    row.insertCell().textContent = user.user_id;
                    row.insertCell().textContent = user.username;
                    row.insertCell().textContent = user.email;
                    row.insertCell().textContent = user.user_type;
                    
                    const actionsCell = row.insertCell();
                    actionsCell.classList.add('actions');
                    // Prevent admin from deleting their own account or another admin easily from UI
                    const loggedInUser = JSON.parse(sessionStorage.getItem('cineverse_user'));
                    let deleteButtonHtml = '';
                    if (loggedInUser && loggedInUser.user_id !== user.user_id && user.user_type !== 'Admin' && user.user_type !== 'admin') {
                         deleteButtonHtml = `
                            <button class="btn btn-outline btn-delete btn-small" data-id="${user.user_id}" data-username="${user.username}" title="Delete User">
                                <i class="fas fa-trash-alt"></i> Delete
                            </button>`;
                    } else if (loggedInUser && loggedInUser.user_id === user.user_id) {
                        deleteButtonHtml = `<span class="text-muted" title="Cannot delete self">-</span>`;
                    } else if (user.user_type === 'Admin' || user.user_type === 'admin') {
                         deleteButtonHtml = `<span class="text-muted" title="Cannot delete admin from UI">-</span>`;
                    }


                    actionsCell.innerHTML = `
                        <a href="/admin/form-user.html?edit=${user.user_id}" class="btn btn-outline btn-edit btn-small" title="Edit User Role">
                            <i class="fas fa-user-shield"></i> Edit Role
                        </a>
                        ${deleteButtonHtml}
                    `;
                });
                addUserDeleteEventListeners();
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            displayMessage(messageAreaManage, `Error loading users: ${error.message}`, 'error');
        } finally {
            if (loadingUsersTableIndicator) loadingUsersTableIndicator.style.display = 'none';
        }
    }

    function addUserDeleteEventListeners() {
        const deleteButtons = document.querySelectorAll('#usersTable .btn-delete');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const userId = e.currentTarget.dataset.id;
                const username = e.currentTarget.dataset.username;
                if (confirm(`Are you sure you want to delete user "${username}" (ID: ${userId})? This will also delete all their bookings.`)) {
                    try {
                        const response = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
                        const result = await response.json();
                        if (!response.ok) throw new Error(result.message || 'Failed to delete user.');
                        
                        displayMessage(messageAreaManage, result.message || `User "${username}" deleted successfully.`, 'success');
                        fetchAndDisplayUsers(); // Refresh list
                    } catch (error) {
                        console.error('Error deleting user:', error);
                        displayMessage(messageAreaManage, `Error deleting user: ${error.message}`, 'error');
                    }
                }
            });
        });
    }

    // --- Logic for form-user.html ---
    const userForm = document.getElementById('userForm');
    const userFormTitle = document.getElementById('userFormTitle');
    const userIdInput = document.getElementById('userId'); // Hidden input
    
    const usernameInput = document.getElementById('userUsername');
    const emailInput = document.getElementById('userEmail');
    const userTypeSelect = document.getElementById('userTypeSelect');


    async function loadUserForEditing(id) {
        try {
            const response = await fetch(`/api/admin/users/${id}`);
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || 'Failed to fetch user details for editing.');
            }
            const user = await response.json();

            if (userIdInput) userIdInput.value = user.user_id;
            if (usernameInput) usernameInput.value = user.username;
            if (emailInput) emailInput.value = user.email;
            if (userTypeSelect) userTypeSelect.value = user.user_type;
            
            if (userFormTitle) userFormTitle.innerHTML = `<i class="fas fa-user-edit"></i>Edit User: ${user.username}`;

        } catch (error) {
            console.error('Error loading user for editing:', error);
            displayMessage(messageAreaForm, `Error loading user data: ${error.message}`, 'error');
            if (userFormTitle) userFormTitle.innerHTML = `<i class="fas fa-exclamation-triangle"></i>Error Loading User`;
        }
    }

    if (userForm) {
        const urlParams = new URLSearchParams(window.location.search);
        const editUserId = urlParams.get('edit');

        if (editUserId) {
            loadUserForEditing(editUserId);
        } else {
            // This form is only for editing, not adding new users from admin panel
            if (userFormTitle) userFormTitle.innerHTML = `<i class="fas fa-exclamation-circle"></i>No User Selected`;
            displayMessage(messageAreaForm, 'No user ID provided for editing. Please select a user from the manage users page.', 'warning');
            userForm.style.display = 'none'; // Hide form if no user to edit
        }

        userForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            if (messageAreaForm) messageAreaForm.style.display = 'none';

            const currentUserId = userIdInput.value;
            if (!currentUserId) {
                displayMessage(messageAreaForm, 'No user selected for update.', 'error');
                return;
            }

            const userData = {
                user_type: userTypeSelect.value,
                // Username and email are read-only in this form
            };

            try {
                const response = await fetch(`/api/admin/users/${currentUserId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(userData) // Only send user_type for update
                });
                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || `Failed to update user role.`);
                }
                
                displayMessage(messageAreaForm, result.message || `User role updated successfully!`, 'success');
                setTimeout(() => { window.location.href = '/admin/manage-users.html'; }, 2000);

            } catch (error) {
                console.error(`Error updating user:`, error);
                displayMessage(messageAreaForm, error.message || 'An unexpected error occurred.', 'error');
            }
        });
    }

    // --- Page Initialization ---
    function initializePage() {
        const currentPath = window.location.pathname;
        if (currentPath.includes('/admin/manage-users.html')) {
            fetchAndDisplayUsers();
        }
        // Form logic handled by URL param check above

        const navLinks = document.querySelectorAll('.admin-nav li a');
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (currentPath.startsWith(link.getAttribute('href'))) {
                 if (currentPath.includes('form-user.html') && link.getAttribute('href').includes('manage-users.html')) {
                    link.classList.add('active');
                } else if (link.getAttribute('href') === currentPath) {
                    link.classList.add('active');
                }
            } else if (currentPath === '/admin/dashboard.html' && link.id === 'navDashboard') {
                 link.classList.add('active');
            }
        });
    }
    initializePage();
});
