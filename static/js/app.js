const state = {
    trains: [],
    stations: [],
    routes: [],
};

const api = async (url, options = {}) => {
    const response = await fetch(url, {
        headers: { "Content-Type": "application/json" },
        ...options,
    });
    if (!response.ok) throw new Error(`Request failed: ${url}`);
    return response.json();
};

const formatTime = (value) => value || "Terminus";

async function loadDashboard() {
    const data = await api("/api/dashboard");
    totalTrains.textContent = data.stats.total_trains;
    activeRoutes.textContent = data.stats.active_routes;
    delayedTrains.textContent = data.stats.delayed_trains;
    stationCount.textContent = data.stats.station_count;

    delayList.innerHTML = data.delay_report.map((train) => `
        <div class="delay-item">
            <strong>${train.train_number} - ${train.train_name}</strong>
            <p class="muted">${train.status} by ${train.delay_minutes} minutes</p>
        </div>
    `).join("") || `<p class="muted">No delayed trains at the moment.</p>`;

    drawPunctualityChart(data.punctuality);
}

function drawPunctualityChart(rows) {
    const canvas = punctualityChart;
    const context = canvas.getContext("2d");
    const width = canvas.width = canvas.offsetWidth;
    const height = canvas.height = 230;
    const total = rows.reduce((sum, row) => sum + row.total, 0) || 1;
    const colors = ["#2fd6a3", "#ff6b6b", "#ffc857", "#4bb8ff"];
    context.clearRect(0, 0, width, height);
    rows.forEach((row, index) => {
        const barWidth = Math.max(28, (row.total / total) * (width - 170));
        const y = 32 + index * 44;
        context.fillStyle = colors[index % colors.length];
        context.fillRect(130, y, barWidth, 24);
        context.fillStyle = "#edf6f7";
        context.font = "13px Segoe UI";
        context.fillText(row.status, 12, y + 17);
        context.fillText(row.total, 140 + barWidth, y + 17);
    });
}

async function loadTrains(search = "") {
    state.trains = await api(`/api/trains?search=${encodeURIComponent(search)}`);
    trainTable.innerHTML = state.trains.map((train) => `
        <tr>
            <td>${train.train_number}</td>
            <td>${train.train_name}</td>
            <td>${train.train_type}</td>
            <td>${train.coach_count}</td>
            <td class="row-actions">
                <button onclick='editTrain(${JSON.stringify(train)})'>Edit</button>
                <button class="danger-btn" onclick="deleteTrain(${train.train_id})">Delete</button>
            </td>
        </tr>
    `).join("");

    bookingTrain.innerHTML = state.trains.map((train) => `
        <option value="${train.train_id}">${train.train_number} - ${train.train_name}</option>
    `).join("");
    routeTrain.innerHTML = bookingTrain.innerHTML;
}

async function loadStations(search = "") {
    state.stations = await api(`/api/stations?search=${encodeURIComponent(search)}`);
    stationCards.innerHTML = state.stations.map((station) => `
        <div class="station-card">
            <strong>${station.station_code}</strong>
            <p>${station.station_name}</p>
            <p class="muted">${station.city}, ${station.state}</p>
        </div>
    `).join("");

    const options = state.stations.map((station) => `
        <option value="${station.station_id}">${station.station_code} - ${station.station_name}</option>
    `).join("");
    bookingSource.innerHTML = options;
    bookingDestination.innerHTML = options;
    routeSource.innerHTML = options;
    routeDestination.innerHTML = options;
}

async function loadRoutes() {
    state.routes = await api("/api/routes");
    routeSelect.innerHTML = state.routes.map((route) => `
        <option value="${route.route_id}">${route.train_number} - ${route.route_name}</option>
    `).join("");
    if (state.routes.length) loadRouteMap(state.routes[0].route_id);
}

async function loadRouteMap(routeId) {
    const stops = await api(`/api/routes/${routeId}/map`);
    routeMap.innerHTML = stops.map((stop) => `
        <div class="route-stop">
            <span>${stop.stop_order}</span>
            <div>
                <strong>${stop.station_code} - ${stop.station_name}</strong>
                <p class="muted">${stop.city} | Arrival ${formatTime(stop.arrival_time)} | Departure ${formatTime(stop.departure_time)}</p>
            </div>
            <strong>${stop.distance_from_source_km} km</strong>
        </div>
    `).join("");
}

async function loadSchedules() {
    const schedules = await api("/api/schedules");
    scheduleTable.innerHTML = schedules.map((item) => `
        <tr>
            <td>${item.train_number} - ${item.train_name}</td>
            <td>${item.station_code} - ${item.station_name}</td>
            <td>${item.stop_order}</td>
            <td>${formatTime(item.arrival_time)}</td>
            <td>${formatTime(item.departure_time)}</td>
            <td>${item.platform_number}</td>
            <td>${item.distance_from_source_km} km</td>
        </tr>
    `).join("");
}

async function loadLiveTracking() {
    const live = await api("/api/live");
    liveCards.innerHTML = live.map((train) => `
        <div class="live-card">
            <strong>${train.train_number} - ${train.train_name}</strong>
            <p class="muted">${train.current_station || "Yard"} to ${train.next_station || "Terminus"}</p>
            <p class="muted">Progress: ${train.progress_percent}% | Delay: ${train.delay_minutes} min</p>
            <span class="status ${train.status.replace(" ", "")}">${train.status}</span>
        </div>
    `).join("");

    const averageProgress = live.length
        ? live.reduce((sum, train) => sum + train.progress_percent, 0) / live.length
        : 0;
    animatedTrain.style.left = `${Math.min(78, Math.max(8, averageProgress))}%`;
}

window.editTrain = (train) => {
    trainId.value = train.train_id;
    trainNumber.value = train.train_number;
    trainName.value = train.train_name;
    trainType.value = train.train_type;
    coachCount.value = train.coach_count;
    trainNumber.focus();
};

window.deleteTrain = async (id) => {
    if (!confirm("Delete this train and related route data?")) return;
    await api(`/api/trains/${id}`, { method: "DELETE" });
    await refreshAll();
};

trainForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
        train_number: trainNumber.value,
        train_name: trainName.value,
        train_type: trainType.value,
        coach_count: Number(coachCount.value),
    };
    const id = trainId.value;
    await api(id ? `/api/trains/${id}` : "/api/trains", {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
    });
    trainForm.reset();
    trainId.value = "";
    await refreshAll();
});

stationForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await api("/api/stations", {
        method: "POST",
        body: JSON.stringify({
            station_code: stationCode.value.toUpperCase(),
            station_name: stationName.value,
            city: stationCity.value,
            state: stationState.value,
        }),
    });
    stationForm.reset();
    await refreshAll();
});

routeForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await api("/api/routes", {
        method: "POST",
        body: JSON.stringify({
            route_name: routeName.value,
            train_id: Number(routeTrain.value),
            source_station_id: Number(routeSource.value),
            destination_station_id: Number(routeDestination.value),
            total_distance_km: Number(routeDistance.value),
        }),
    });
    routeForm.reset();
    await refreshAll();
});

bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const ticket = await api("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
            full_name: passengerName.value,
            age: Number(passengerAge.value),
            gender: passengerGender.value,
            phone: passengerPhone.value,
            email: passengerEmail.value,
            train_id: Number(bookingTrain.value),
            source_station_id: Number(bookingSource.value),
            destination_station_id: Number(bookingDestination.value),
            journey_date: journeyDate.value,
            seat_number: seatNumber.value,
            fare: Number(fare.value),
        }),
    });
    ticketBox.innerHTML = `
        <strong>PNR SR-${String(ticket.booking_id).padStart(5, "0")}</strong><br>
        Passenger: ${ticket.full_name}<br>
        Train: ${ticket.train_number} - ${ticket.train_name}<br>
        Journey: ${ticket.source_code} to ${ticket.destination_code}<br>
        Date: ${ticket.journey_date}<br>
        Seat: ${ticket.seat_number}<br>
        Fare: Rs. ${ticket.fare}<br>
        Status: ${ticket.booking_status}
    `;
    bookingForm.reset();
});

simulateBtn.addEventListener("click", async () => {
    await api("/api/live/simulate", { method: "POST" });
    await loadLiveTracking();
    await loadDashboard();
});

routeSelect.addEventListener("change", (event) => loadRouteMap(event.target.value));

searchBtn.addEventListener("click", async () => {
    const search = globalSearch.value;
    await Promise.all([loadTrains(search), loadStations(search)]);
});

async function refreshAll() {
    await Promise.all([loadDashboard(), loadTrains(), loadStations(), loadRoutes(), loadSchedules(), loadLiveTracking()]);
}

refreshAll();

// JavaScript timers make the live-tracking module feel real during demos.
setInterval(async () => {
    await api("/api/live/simulate", { method: "POST" });
    await Promise.all([loadLiveTracking(), loadDashboard()]);
}, 7000);
