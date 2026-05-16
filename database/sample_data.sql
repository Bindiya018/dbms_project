USE smart_railway_db;

INSERT INTO trains (train_number, train_name, train_type, coach_count) VALUES
('12951', 'Mumbai Rajdhani', 'Rajdhani', 20),
('12002', 'Shatabdi Central', 'Superfast', 16),
('12627', 'Karnataka Express', 'Express', 22),
('22913', 'Humsafar Link', 'Superfast', 18),
('11077', 'Deccan Intercity', 'Intercity', 14);

INSERT INTO stations (station_code, station_name, city, state) VALUES
('NDLS', 'New Delhi', 'New Delhi', 'Delhi'),
('BCT', 'Mumbai Central', 'Mumbai', 'Maharashtra'),
('JP', 'Jaipur Junction', 'Jaipur', 'Rajasthan'),
('KOTA', 'Kota Junction', 'Kota', 'Rajasthan'),
('BPL', 'Bhopal Junction', 'Bhopal', 'Madhya Pradesh'),
('PUNE', 'Pune Junction', 'Pune', 'Maharashtra'),
('SBC', 'KSR Bengaluru', 'Bengaluru', 'Karnataka'),
('MAS', 'MGR Chennai Central', 'Chennai', 'Tamil Nadu');

INSERT INTO routes (train_id, route_name, source_station_id, destination_station_id, total_distance_km) VALUES
(1, 'Delhi to Mumbai Corridor', 1, 2, 1384),
(2, 'Mumbai to Pune Executive Line', 2, 6, 192),
(3, 'Bengaluru to Delhi Main Line', 7, 1, 2406),
(4, 'Jaipur to Chennai Link', 3, 8, 2180),
(5, 'Pune to Bhopal Intercity', 6, 5, 787);

INSERT INTO train_schedule (route_id, station_id, stop_order, arrival_time, departure_time, platform_number, distance_from_source_km) VALUES
(1, 1, 1, NULL, '16:55:00', 3, 0),
(1, 3, 2, '21:25:00', '21:35:00', 2, 308),
(1, 4, 3, '01:10:00', '01:20:00', 5, 557),
(1, 2, 4, '08:35:00', NULL, 7, 1384),
(2, 2, 1, NULL, '06:20:00', 1, 0),
(2, 6, 2, '09:40:00', NULL, 4, 192),
(3, 7, 1, NULL, '19:20:00', 6, 0),
(3, 5, 2, '13:50:00', '14:00:00', 8, 1498),
(3, 1, 3, '07:40:00', NULL, 4, 2406),
(4, 3, 1, NULL, '05:30:00', 2, 0),
(4, 4, 2, '09:15:00', '09:25:00', 4, 249),
(4, 8, 3, '23:50:00', NULL, 9, 2180),
(5, 6, 1, NULL, '07:10:00', 3, 0),
(5, 5, 2, '18:25:00', NULL, 5, 787);

INSERT INTO live_tracking (train_id, route_id, current_station_id, next_station_id, status, delay_minutes, progress_percent) VALUES
(1, 1, 3, 4, 'On Time', 0, 45),
(2, 2, 2, 6, 'Departed', 0, 32),
(3, 3, 5, 1, 'Delayed', 35, 68),
(4, 4, 4, 8, 'Arriving', 5, 82),
(5, 5, 6, 5, 'Delayed', 18, 54);

INSERT INTO passengers (full_name, age, gender, phone, email) VALUES
('Aarav Sharma', 21, 'Male', '9876543210', 'aarav@example.com'),
('Neha Iyer', 24, 'Female', '9876543211', 'neha@example.com'),
('Rohan Verma', 35, 'Male', '9876543212', 'rohan@example.com');

INSERT INTO bookings (passenger_id, train_id, source_station_id, destination_station_id, journey_date, seat_number, fare, booking_status) VALUES
(1, 1, 1, 2, '2026-05-22', 'A1-21', 2890.00, 'Confirmed'),
(2, 3, 7, 1, '2026-05-23', 'B2-18', 2140.00, 'Confirmed'),
(3, 5, 6, 5, '2026-05-24', 'C1-07', 760.00, 'Waiting');
