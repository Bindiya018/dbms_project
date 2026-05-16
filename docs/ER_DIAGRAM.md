# ER Diagram and Relationship Explanation

## ER Diagram

```mermaid
erDiagram
    TRAINS ||--o{ ROUTES : operates
    STATIONS ||--o{ ROUTES : source
    STATIONS ||--o{ ROUTES : destination
    ROUTES ||--o{ TRAIN_SCHEDULE : contains
    STATIONS ||--o{ TRAIN_SCHEDULE : scheduled_at
    TRAINS ||--|| LIVE_TRACKING : tracked_by
    ROUTES ||--o{ LIVE_TRACKING : follows
    STATIONS ||--o{ LIVE_TRACKING : current_station
    STATIONS ||--o{ LIVE_TRACKING : next_station
    PASSENGERS ||--o{ BOOKINGS : makes
    TRAINS ||--o{ BOOKINGS : booked_on
    STATIONS ||--o{ BOOKINGS : boarding
    STATIONS ||--o{ BOOKINGS : destination

    TRAINS {
        int train_id PK
        varchar train_number UK
        varchar train_name
        enum train_type
        int coach_count
    }

    STATIONS {
        int station_id PK
        varchar station_code UK
        varchar station_name
        varchar city
        varchar state
    }

    ROUTES {
        int route_id PK
        int train_id FK
        int source_station_id FK
        int destination_station_id FK
        int total_distance_km
    }

    TRAIN_SCHEDULE {
        int schedule_id PK
        int route_id FK
        int station_id FK
        int stop_order
        time arrival_time
        time departure_time
        int platform_number
        int distance_from_source_km
    }

    LIVE_TRACKING {
        int tracking_id PK
        int train_id FK
        int route_id FK
        int current_station_id FK
        int next_station_id FK
        enum status
        int delay_minutes
        int progress_percent
    }

    PASSENGERS {
        int passenger_id PK
        varchar full_name
        int age
        enum gender
        varchar phone
        varchar email
    }

    BOOKINGS {
        int booking_id PK
        int passenger_id FK
        int train_id FK
        int source_station_id FK
        int destination_station_id FK
        date journey_date
        varchar seat_number
        decimal fare
        enum booking_status
    }
```

## Relationships

- One train can operate one or more routes.
- One route has one source station and one destination station.
- One route has many schedule stops through `train_schedule`.
- One station can appear in many schedules, routes and bookings.
- One train has one current live tracking record.
- One passenger can make many bookings.
- One booking belongs to one passenger and one train.
- Source and destination station IDs in `bookings` identify the passenger journey.

## Constraints Used

- Primary keys on every table.
- Unique train numbers and station codes.
- Foreign keys for all relationships.
- Check constraints for coach count, platform number, fare, distance and progress.
- Unique seat constraint for one train, one journey date and one seat number.
