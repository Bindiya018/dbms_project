CREATE DATABASE IF NOT EXISTS smart_railway_db;
USE smart_railway_db;

DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS passengers;
DROP TABLE IF EXISTS live_tracking;
DROP TABLE IF EXISTS train_schedule;
DROP TABLE IF EXISTS routes;
DROP TABLE IF EXISTS stations;
DROP TABLE IF EXISTS trains;

CREATE TABLE trains (
    train_id INT AUTO_INCREMENT PRIMARY KEY,
    train_number VARCHAR(10) NOT NULL UNIQUE,
    train_name VARCHAR(100) NOT NULL,
    train_type ENUM('Express', 'Superfast', 'Passenger', 'Intercity', 'Rajdhani') NOT NULL,
    coach_count INT NOT NULL CHECK (coach_count BETWEEN 1 AND 30),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stations (
    station_id INT AUTO_INCREMENT PRIMARY KEY,
    station_code VARCHAR(8) NOT NULL UNIQUE,
    station_name VARCHAR(100) NOT NULL,
    city VARCHAR(80) NOT NULL,
    state VARCHAR(80) NOT NULL
);

CREATE TABLE routes (
    route_id INT AUTO_INCREMENT PRIMARY KEY,
    train_id INT NOT NULL,
    route_name VARCHAR(120) NOT NULL,
    source_station_id INT NOT NULL,
    destination_station_id INT NOT NULL,
    total_distance_km INT NOT NULL CHECK (total_distance_km > 0),
    is_active BOOLEAN DEFAULT TRUE,
    CONSTRAINT fk_routes_train FOREIGN KEY (train_id) REFERENCES trains(train_id) ON DELETE CASCADE,
    CONSTRAINT fk_routes_source FOREIGN KEY (source_station_id) REFERENCES stations(station_id),
    CONSTRAINT fk_routes_destination FOREIGN KEY (destination_station_id) REFERENCES stations(station_id),
    CONSTRAINT chk_route_endpoints CHECK (source_station_id <> destination_station_id)
);

CREATE TABLE train_schedule (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    route_id INT NOT NULL,
    station_id INT NOT NULL,
    stop_order INT NOT NULL CHECK (stop_order > 0),
    arrival_time TIME,
    departure_time TIME,
    platform_number INT NOT NULL CHECK (platform_number BETWEEN 1 AND 20),
    distance_from_source_km INT NOT NULL CHECK (distance_from_source_km >= 0),
    CONSTRAINT fk_schedule_route FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE CASCADE,
    CONSTRAINT fk_schedule_station FOREIGN KEY (station_id) REFERENCES stations(station_id),
    CONSTRAINT uq_schedule_stop UNIQUE (route_id, stop_order),
    CONSTRAINT uq_schedule_station UNIQUE (route_id, station_id)
);

CREATE TABLE live_tracking (
    tracking_id INT AUTO_INCREMENT PRIMARY KEY,
    train_id INT NOT NULL UNIQUE,
    route_id INT NOT NULL,
    current_station_id INT,
    next_station_id INT,
    status ENUM('On Time', 'Delayed', 'Arriving', 'Departed') DEFAULT 'On Time',
    delay_minutes INT DEFAULT 0 CHECK (delay_minutes >= 0),
    progress_percent INT DEFAULT 0 CHECK (progress_percent BETWEEN 0 AND 100),
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tracking_train FOREIGN KEY (train_id) REFERENCES trains(train_id) ON DELETE CASCADE,
    CONSTRAINT fk_tracking_route FOREIGN KEY (route_id) REFERENCES routes(route_id) ON DELETE CASCADE,
    CONSTRAINT fk_tracking_current FOREIGN KEY (current_station_id) REFERENCES stations(station_id),
    CONSTRAINT fk_tracking_next FOREIGN KEY (next_station_id) REFERENCES stations(station_id)
);

CREATE TABLE passengers (
    passenger_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    age INT NOT NULL CHECK (age > 0),
    gender ENUM('Male', 'Female', 'Other') NOT NULL,
    phone VARCHAR(15) NOT NULL,
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
    booking_id INT AUTO_INCREMENT PRIMARY KEY,
    passenger_id INT NOT NULL,
    train_id INT NOT NULL,
    source_station_id INT NOT NULL,
    destination_station_id INT NOT NULL,
    journey_date DATE NOT NULL,
    seat_number VARCHAR(10) NOT NULL,
    fare DECIMAL(8,2) NOT NULL CHECK (fare >= 0),
    booking_status ENUM('Confirmed', 'Waiting', 'Cancelled') DEFAULT 'Confirmed',
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_booking_passenger FOREIGN KEY (passenger_id) REFERENCES passengers(passenger_id) ON DELETE CASCADE,
    CONSTRAINT fk_booking_train FOREIGN KEY (train_id) REFERENCES trains(train_id) ON DELETE CASCADE,
    CONSTRAINT fk_booking_source FOREIGN KEY (source_station_id) REFERENCES stations(station_id),
    CONSTRAINT fk_booking_destination FOREIGN KEY (destination_station_id) REFERENCES stations(station_id),
    CONSTRAINT uq_train_seat_date UNIQUE (train_id, journey_date, seat_number),
    CONSTRAINT chk_booking_endpoints CHECK (source_station_id <> destination_station_id)
);
