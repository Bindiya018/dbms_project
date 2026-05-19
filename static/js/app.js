// Smart Railway Tracking and Management System - Frontend App

// Initialize app on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Navigation
const navLinks = document.querySelectorAll('.sidebar nav a');
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href').substring(1);
        showSection(targetId);
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
    });
});

function showSection(sectionId) {
    document.querySelectorAll('.panel, .content-grid, .stats-grid').forEach(section => {
        section.style.display = 'none';
    });
    const target = document.getElementById(sectionId);
    if (target) target.style.display = '';
}

// Initialize app
async function initializeApp() {
    try {
        await loadDashboardStats();
        await loadTrains();
        await loadStations();
        await loadRoutes();
        await loadLiveTracking();
        await loadSchedules();
        await loadBookings();
        setupFormHandlers();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

// Dashboard Stats
async function loadDashboardStats() {
    try {
        const response = await fetch('/api/dashboard');
        const data = await response.json();
        
        document.getElementById('totalTrains').textContent = data.stats.total_trains || 0;
        document.getElementById('activeRoutes').textContent = data.stats.active_routes || 0;
        document.getElementById('delayedTrains').textContent = data.stats.delayed_trains || 0;
        document.getElementById('stationCount').textContent = data.stats.station_count || 0;
        
        // Display delay report
        const delayList = document.getElementById('delayList');
        delayList.innerHTML = '';
        data.delay_report.forEach(train => {
            delayList.innerHTML += `
                <div class="delay-item">
                    <div>
                        <strong>${train.train_number} - ${train.train_name}</strong>
                        <small>Status: ${train.status}</small>
                    </div>
                    <span class="delay-badge">${train.delay_minutes} min</span>
                </div>
            `;
        });
        
        // Draw punctuality chart
        drawPunctualityChart(data.punctuality);
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Trains Management
async function loadTrains() {
    try {
        const response = await fetch('/api/trains');
        const trains = await response.json();
        const table = document.getElementById('trainTable');
        table.innerHTML = '';
        
        trains.forEach((train, i) => {
            table.innerHTML += `
                <tr>
                    <td>${train.train_number}</td>
                    <td>${train.train_name}</td>
                    <td>${train.train_type}</td>
                    <td>${train.coach_count}</td>
                    <td>
                        <button class="btn-edit" onclick="editTrain(${train.train_id})">Edit</button>
                        <button class="btn-delete" onclick="deleteTrain(${train.train_id})">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading trains:', error);
    }
}

// Train Form Handler
document.getElementById('trainForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const trainId = document.getElementById('trainId').value;
    const data = {
        train_number: document.getElementById('trainNumber').value,
        train_name: document.getElementById('trainName').value,
        train_type: document.getElementById('trainType').value,
        coach_count: parseInt(document.getElementById('coachCount').value)
    };
    
    try {
        const method = trainId ? 'PUT' : 'POST';
        const url = trainId ? `/api/trains/${trainId}` : '/api/trains';
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            e.target.reset();
            loadTrains();
            alert(trainId ? 'Train updated!' : 'Train added!');
        }
    } catch (error) {
        console.error('Error saving train:', error);
    }
});

async function deleteTrain(trainId) {
    if (confirm('Are you sure?')) {
        try {
            await fetch(`/api/trains/${trainId}`, { method: 'DELETE' });
            loadTrains();
        } catch (error) {
            console.error('Error deleting train:', error);
        }
    }
}

// Stations Management
async function loadStations() {
    try {
        const response = await fetch('/api/stations');
        const stations = await response.json();
        const stationCards = document.getElementById('stationCards');
        stationCards.innerHTML = '';
        
        stations.forEach(station => {
            stationCards.innerHTML += `
                <div class="station-card">
                    <strong>${station.station_code}</strong>
                    <div>${station.station_name}</div>
                    <small>${station.city}, ${station.state}</small>
                </div>
            `;
        });
        
        // Populate station selects
        populateStationSelects(stations);
    } catch (error) {
        console.error('Error loading stations:', error);
    }
}

function populateStationSelects(stations) {
    const selects = ['routeSource', 'routeDestination', 'bookingSource', 'bookingDestination'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Select Station</option>';
            stations.forEach(station => {
                select.innerHTML += `<option value="${station.station_id}">${station.station_name}</option>`;
            });
        }
    });
}

// Station Form Handler
document.getElementById('stationForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        station_code: document.getElementById('stationCode').value,
        station_name: document.getElementById('stationName').value,
        city: document.getElementById('stationCity').value,
        state: document.getElementById('stationState').value
    };
    
    try {
        const response = await fetch('/api/stations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            e.target.reset();
            loadStations();
            alert('Station added!');
        }
    } catch (error) {
        console.error('Error saving station:', error);
    }
});

// Routes Management
async function loadRoutes() {
    try {
        const response = await fetch('/api/routes');
        const routes = await response.json();
        
        // Populate route select
        const routeSelect = document.getElementById('routeSelect');
        if (routeSelect) {
            routeSelect.innerHTML = '';
            routes.forEach(route => {
                routeSelect.innerHTML += `<option value="${route.route_id}">${route.route_name}</option>`;
            });
            routeSelect.addEventListener('change', () => showRouteMap(routeSelect.value));
        }
        
        // Populate train select for route creation
        const trainSelect = document.getElementById('routeTrain');
        if (trainSelect) {
            const trains = await fetch('/api/trains').then(r => r.json());
            trainSelect.innerHTML = '';
            trains.forEach(train => {
                trainSelect.innerHTML += `<option value="${train.train_id}">${train.train_number} - ${train.train_name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading routes:', error);
    }
}

// Route Form Handler
document.getElementById('routeForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        train_id: parseInt(document.getElementById('routeTrain').value),
        route_name: document.getElementById('routeName').value,
        source_station_id: parseInt(document.getElementById('routeSource').value),
        destination_station_id: parseInt(document.getElementById('routeDestination').value),
        total_distance_km: parseInt(document.getElementById('routeDistance').value)
    };
    
    try {
        const response = await fetch('/api/routes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            e.target.reset();
            loadRoutes();
            alert('Route created!');
        }
    } catch (error) {
        console.error('Error saving route:', error);
    }
});

// Show Route Map
async function showRouteMap(routeId) {
    try {
        const response = await fetch(`/api/routes/${routeId}/map`);
        const schedule = await response.json();
        const routeMap = document.getElementById('routeMap');
        routeMap.innerHTML = '';
        
        schedule.forEach((stop, i) => {
            routeMap.innerHTML += `
                <div class="route-stop">
                    <div class="stop-number">${stop.stop_order}</div>
                    <div class="stop-info">
                        <div>
                            <strong>${stop.station_code} - ${stop.station_name}</strong>
                            <small>${stop.city}</small>
                        </div>
                        <div>
                            <small>Arrival: ${stop.arrival_time || 'N/A'}</small>
                            <small>Departure: ${stop.departure_time || 'N/A'}</small>
                        </div>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading route map:', error);
    }
}

// Live Tracking
async function loadLiveTracking() {
    try {
        const response = await fetch('/api/live');
        const liveData = await response.json();
        const liveCards = document.getElementById('liveCards');
        liveCards.innerHTML = '';
        
        liveData.forEach(train => {
            const statusColor = train.status === 'On Time' ? '#10b981' : train.status === 'Delayed' ? '#ef4444' : '#f59e0b';
            liveCards.innerHTML += `
                <div class="live-card" style="border-left-color: ${statusColor}">
                    <strong>${train.train_number} - ${train.train_name}</strong>
                    <small>Status: ${train.status}</small>
                    <small>Progress: ${train.progress_percent}%</small>
                    <small>Current: ${train.current_station || 'Unknown'}</small>
                    <small>Next: ${train.next_station || 'Unknown'}</small>
                </div>
            `;
        });
    } catch (error) {
        console.error('Error loading live tracking:', error);
    }
}

// Simulate Live Tracking
document.getElementById('simulateBtn')?.addEventListener('click', async () => {
    try {
        await fetch('/api/live/simulate', { method: 'POST' });
        loadLiveTracking();
    } catch (error) {
        console.error('Error simulating tracking:', error);
    }
});

// Schedules
async function loadSchedules() {
    try {
        const response = await fetch('/api/schedules');
        const schedules = await response.json();
        const table = document.getElementById('scheduleTable');
        table.innerHTML = '';
        
        schedules.forEach(schedule => {
            table.innerHTML += `
                <tr>
                    <td>${schedule.train_number} - ${schedule.train_name}</td>
                    <td>${schedule.station_code} - ${schedule.station_name}</td>
                    <td>${schedule.stop_order}</td>
                    <td>${schedule.arrival_time || 'N/A'}</td>
                    <td>${schedule.departure_time || 'N/A'}</td>
                    <td>${schedule.platform_number || 'N/A'}</td>
                    <td>${schedule.distance_from_source_km} km</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error('Error loading schedules:', error);
    }
}

// Bookings
async function loadBookings() {
    try {
        const response = await fetch('/api/bookings');
        const bookings = await response.json();
        
        // Populate train select for bookings
        const trainSelect = document.getElementById('bookingTrain');
        if (trainSelect) {
            const trains = await fetch('/api/trains').then(r => r.json());
            trainSelect.innerHTML = '';
            trains.forEach(train => {
                trainSelect.innerHTML += `<option value="${train.train_id}">${train.train_number} - ${train.train_name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading bookings:', error);
    }
}

// Booking Form Handler
document.getElementById('bookingForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        full_name: document.getElementById('passengerName').value,
        age: parseInt(document.getElementById('passengerAge').value),
        gender: document.getElementById('passengerGender').value,
        phone: document.getElementById('passengerPhone').value,
        email: document.getElementById('passengerEmail').value,
        train_id: parseInt(document.getElementById('bookingTrain').value),
        source_station_id: parseInt(document.getElementById('bookingSource').value),
        destination_station_id: parseInt(document.getElementById('bookingDestination').value),
        journey_date: document.getElementById('journeyDate').value,
        seat_number: document.getElementById('seatNumber').value,
        fare: parseFloat(document.getElementById('fare').value)
    };
    
    try {
        const response = await fetch('/api/bookings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const ticket = await response.json();
            displayTicket(ticket);
            e.target.reset();
        }
    } catch (error) {
        console.error('Error creating booking:', error);
    }
});

function displayTicket(ticket) {
    const ticketBox = document.getElementById('ticketBox');
    ticketBox.innerHTML = `
        <div class="ticket">
            <div class="ticket-header">✓ BOOKING CONFIRMED</div>
            <div class="ticket-detail"><strong>Booking ID:</strong> <em>#${ticket.booking_id}</em></div>
            <div class="ticket-detail"><strong>Passenger:</strong> <em>${ticket.full_name}</em></div>
            <div class="ticket-detail"><strong>Train:</strong> <em>${ticket.train_number} - ${ticket.train_name}</em></div>
            <div class="ticket-detail"><strong>From:</strong> <em>${ticket.source_code}</em></div>
            <div class="ticket-detail"><strong>To:</strong> <em>${ticket.destination_code}</em></div>
            <div class="ticket-detail"><strong>Date:</strong> <em>${ticket.journey_date}</em></div>
            <div class="ticket-detail"><strong>Seat:</strong> <em>${ticket.seat_number}</em></div>
            <div class="ticket-detail"><strong>Fare:</strong> <em>₹${ticket.fare}</em></div>
            <div class="ticket-detail"><strong>Status:</strong> <em>${ticket.booking_status}</em></div>
        </div>
    `;
}

// Punctuality Chart (using simple bar representation)
function drawPunctualityChart(data) {
    const canvas = document.getElementById('punctualityChart');
    if (!canvas || !data || data.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const chartHeight = 230;
    const chartWidth = canvas.width;
    const barWidth = chartWidth / (data.length * 2);
    let xPos = 20;
    
    const maxValue = Math.max(...data.map(d => d.total));
    
    data.forEach((item, i) => {
        const barHeight = (item.total / maxValue) * (chartHeight - 40);
        const color = item.status === 'On Time' ? '#10b981' : item.status === 'Delayed' ? '#ef4444' : '#f59e0b';
        
        ctx.fillStyle = color;
        ctx.fillRect(xPos, chartHeight - barHeight - 20, barWidth, barHeight);
        
        ctx.fillStyle = '#111827';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(item.status, xPos + barWidth / 2, chartHeight - 5);
        
        xPos += barWidth * 2;
    });
}

// Setup Form Handlers
function setupFormHandlers() {
    // Search functionality
    document.getElementById('searchBtn')?.addEventListener('click', async () => {
        const search = document.getElementById('globalSearch').value;
        if (search) {
            const trains = await fetch(`/api/trains?search=${search}`).then(r => r.json());
            const table = document.getElementById('trainTable');
            table.innerHTML = '';
            trains.forEach(train => {
                table.innerHTML += `
                    <tr>
                        <td>${train.train_number}</td>
                        <td>${train.train_name}</td>
                        <td>${train.train_type}</td>
                        <td>${train.coach_count}</td>
                        <td>
                            <button class="btn-edit" onclick="editTrain(${train.train_id})">Edit</button>
                            <button class="btn-delete" onclick="deleteTrain(${train.train_id})">Delete</button>
                        </td>
                    </tr>
                `;
            });
        }
    });
}
