const API_BASE = 'http://localhost:5000';

const KEYS = {
	users: 'vh_users',
	events: 'vh_events',
	applications: 'vh_applications',
	session: 'vh_current_user'
};

function readJson(key, fallback = []) {
	try {
		const value = localStorage.getItem(key);
		return value ? JSON.parse(value) : fallback;
	} catch (error) {
		return fallback;
	}
}

function writeJson(key, value) {
	localStorage.setItem(key, JSON.stringify(value));
}

function uid(prefix = 'id') {
	return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function seedData() {
	if (!localStorage.getItem(KEYS.users)) {
		writeJson(KEYS.users, [
			{ id: 'u1', name: 'Admin Demo', email: 'admin@vh.com', password: '123456', role: 'admin', hours: 0, points: 0 },
			{ id: 'u2', name: 'NGO Demo', email: 'ngo@vh.com', password: '123456', role: 'ngo', hours: 0, points: 0 },
			{ id: 'u3', name: 'Volunteer Demo', email: 'vol@vh.com', password: '123456', role: 'volunteer', hours: 24, points: 320 }
		]);
	}

	if (!localStorage.getItem(KEYS.events)) {
		writeJson(KEYS.events, []);
	}

	if (!localStorage.getItem(KEYS.applications)) {
		writeJson(KEYS.applications, []);
	}
}

seedData();

function getCurrentUser() {
	return readJson(KEYS.session, null);
}

function setCurrentUser(user) {
	writeJson(KEYS.session, user);
}

function logout() {
	localStorage.removeItem(KEYS.session);
}

function validateEmail(email) {
	return /^\S+@\S+\.\S+$/.test(email);
}

function renderNavbar(active = '') {
	const navContainer = document.getElementById('navLinks');
	if (!navContainer) return;

	const user = getCurrentUser();

	// Build navigation links based on user role
	let links = [
		{ href: 'index.html', text: 'Home', key: 'home' },
		{ href: 'events.html', text: 'Events', key: 'events' }
	];

	// Add role-specific links
	if (user) {
		switch (user.role) {
			case 'volunteer':
				links.push({ href: 'dashboard-volunteer.html', text: 'My Dashboard', key: 'dash' });
				break;
			case 'ngo':
				links.push({ href: 'dashboard-ngo.html', text: 'Organization Panel', key: 'dash' });
				links.push({ href: 'events.html', text: 'Browse Events', key: 'events' });
				break;
			case 'admin':
				links.push({ href: 'admin.html', text: 'Admin Panel', key: 'dash' });
				links.push({ href: 'events.html', text: 'All Events', key: 'events' });
				break;
		}
	} else {
		// Show login/register for unauthenticated users
		links.push({ href: 'login.html', text: 'Login', key: 'login' });
		links.push({ href: 'register.html', text: 'Register', key: 'register' });
	}

	// Build navbar HTML
	let navHTML = links
		.map((link) => `<a class="nav-link ${active === link.key ? 'active' : ''}" href="${link.href}">${link.text}</a>`)
		.join('');

	// Add user info and logout if logged in
	if (user) {
		navHTML += `
			<div class="nav-link" style="cursor: default; background: #dbeafe; color: var(--primary-dark);">
				<strong>${user.name}</strong> <span style="font-size: 0.85em;"> (${user.role})</span>
			</div>
			<a class="nav-link" href="#" id="logout-link" style="background: #fee2e2; color: #991b1b;">Logout</a>
		`;
	}

	navContainer.innerHTML = navHTML;

	// Attach logout handler
	const logoutLink = document.getElementById('logout-link');
	if (logoutLink) {
		logoutLink.addEventListener('click', (e) => {
			e.preventDefault();
			logout();
			window.location.href = 'index.html';
		});
	}
}

async function apiFetch(path, options = {}) {
	const response = await fetch(`${API_BASE}${path}`, options);
	if (!response.ok) {
		throw new Error(`API error ${response.status}`);
	}
	return response.json();
}

async function registerUser(payload) {
	const users = readJson(KEYS.users);
	if (users.some((u) => u.email === payload.email)) {
		throw new Error('Email already exists.');
	}

	const user = {
		id: uid('u'),
		name: payload.name,
		email: payload.email,
		password: payload.password,
		role: payload.role,
		hours: 0,
		points: 0
	};

	users.push(user);
	writeJson(KEYS.users, users);
	return { user };
}

async function loginUser(payload) {
	const users = readJson(KEYS.users);
	const user = users.find((u) => u.email === payload.email && u.password === payload.password);
	if (!user) {
		throw new Error('Invalid email or password.');
	}
	return { user };
}

async function getEvents() {
	try {
		const data = await apiFetch('/events');
		console.log('Events API Response:', data);
		return data.events || [];
	} catch (error) {
		console.error('Failed to fetch /events, using local fallback:', error);
		return readJson(KEYS.events);
	}
}

async function createEvent(eventData) {
	try {
		const data = await apiFetch('/events', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(eventData)
		});

		console.log('Event Create Response:', data);

		if (data && data.event) {
			const localEvents = readJson(KEYS.events);
			const normalized = {
				...data.event,
				id: data.event._id || data.event.id,
				date: data.event.date,
				approved: (data.event.status || '').toLowerCase() === 'approved'
			};
			localEvents.unshift(normalized);
			writeJson(KEYS.events, localEvents);
		}

		return data;
	} catch (error) {
		console.error('Failed to create via API, using local fallback:', error);
		const events = readJson(KEYS.events);
		const event = {
			...eventData,
			id: uid('e'),
			status: 'approved',
			approved: true
		};
		events.unshift(event);
		writeJson(KEYS.events, events);
		return { success: true, event };
	}
}

async function applyToEvent(input) {
	const eventId = typeof input === 'string' ? input : input?.eventId;
	const currentUser = getCurrentUser();

	if (!currentUser) {
		throw new Error('You must be logged in to apply.');
	}

	const applications = readJson(KEYS.applications);
	const duplicate = applications.find((app) => app.eventId === eventId && app.userId === currentUser.id);
	if (duplicate) {
		throw new Error('You already applied for this event.');
	}

	const app = {
		id: uid('a'),
		userId: currentUser.id,
		userName: currentUser.name,
		eventId,
		status: 'pending',
		appliedAt: new Date().toISOString()
	};

	applications.push(app);
	writeJson(KEYS.applications, applications);

	const users = readJson(KEYS.users);
	const user = users.find((u) => u.id === currentUser.id);
	if (user) {
		user.points = (user.points || 0) + 10;
		user.hours = (user.hours || 0) + 2;
		writeJson(KEYS.users, users);
		setCurrentUser(user);
	}

	return { success: true, application: app };
}

function getApplications() {
	return readJson(KEYS.applications);
}

function getUsers() {
	return readJson(KEYS.users);
}

function saveUsers(users) {
	writeJson(KEYS.users, users);
}

function saveEvents(events) {
	writeJson(KEYS.events, events);
}

function redirectByRole(user) {
	if (!user || !user.role) {
		window.location.href = 'index.html';
		return;
	}

	switch (user.role.toLowerCase()) {
		case 'volunteer':
			window.location.href = 'dashboard-volunteer.html';
			break;
		case 'ngo':
			window.location.href = 'dashboard-ngo.html';
			break;
		case 'admin':
			window.location.href = 'admin.html';
			break;
		default:
			window.location.href = 'index.html';
	}
}

/**
 * Protect dashboard pages - ensure only correct role can access
 * @param {string} requiredRole - Required role to access page
 */
function protectDashboard(requiredRole) {
	const user = getCurrentUser();

	if (!user) {
		window.location.href = 'login.html';
		return;
	}

	if (user.role !== requiredRole) {
		alert(`Access denied. This page is for ${requiredRole}s only. You are logged in as ${user.role}.`);
		redirectByRole(user);
		return;
	}
}

/**
 * Check if user is authenticated
 */
function requireLogin() {
	const user = getCurrentUser();
	if (!user) {
		window.location.href = 'login.html';
		return false;
	}
	return true;
}
