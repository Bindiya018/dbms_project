import os
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from functools import wraps

from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, request, session, url_for
from mysql.connector import Error, pooling

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("SECRET_KEY", "railway-demo-secret")

DB_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "localhost"),
    "user": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", ""),
    "database": os.getenv("MYSQL_DATABASE", "smart_railway_db"),
}

pool = None


def get_pool():
    """Create one shared MySQL connection pool for the Flask app."""
    global pool
    if pool is None:
        pool = pooling.MySQLConnectionPool(pool_name="railway_pool", pool_size=5, **DB_CONFIG)
    return pool


def query_db(sql, params=None, fetch=True, many=False):
    """Run parameterized SQL and return rows as dictionaries."""
    connection = get_pool().get_connection()
    cursor = connection.cursor(dictionary=True)
    try:
        if many:
            cursor.executemany(sql, params or [])
        else:
            cursor.execute(sql, params or ())
        if fetch:
            return serialize_rows(cursor.fetchall())
        connection.commit()
        return cursor.lastrowid
    finally:
        cursor.close()
        connection.close()


def serialize_value(value):
    """Convert MySQL date, time and decimal values into JSON-friendly values."""
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, timedelta):
        total_seconds = int(value.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    if isinstance(value, Decimal):
        return float(value)
    return value


def serialize_rows(rows):
    return [{key: serialize_value(value) for key, value in row.items()} for row in rows]


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("admin"):
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    return wrapped


@app.errorhandler(Error)
def handle_mysql_error(error):
    return jsonify({"error": "Database error", "details": str(error)}), 500


@app.route("/")
def root():
    return redirect(url_for("dashboard") if session.get("admin") else url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    error = None
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()
        if username == os.getenv("ADMIN_USER", "admin") and password == os.getenv("ADMIN_PASSWORD", "admin123"):
            session["admin"] = username
            return redirect(url_for("dashboard"))
        error = "Invalid admin credentials"
    return render_template("login.html", error=error)


@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


@app.route("/dashboard")
@login_required
def dashboard():
    return render_template("index.html")


@app.get("/api/dashboard")
@login_required
def dashboard_stats():
    stats = query_db(
        """
        SELECT
            (SELECT COUNT(*) FROM trains) AS total_trains,
            (SELECT COUNT(*) FROM routes WHERE is_active = TRUE) AS active_routes,
            (SELECT COUNT(*) FROM live_tracking WHERE status = 'Delayed') AS delayed_trains,
            (SELECT COUNT(*) FROM stations) AS station_count
        """
    )[0]
    delay_report = query_db(
        """
        SELECT t.train_number, t.train_name, lt.delay_minutes, lt.status
        FROM live_tracking lt
        JOIN trains t ON t.train_id = lt.train_id
        WHERE lt.delay_minutes > 0
        ORDER BY lt.delay_minutes DESC
        LIMIT 6
        """
    )
    punctuality = query_db(
        """
        SELECT status, COUNT(*) AS total
        FROM live_tracking
        GROUP BY status
        ORDER BY total DESC
        """
    )
    return jsonify({"stats": stats, "delay_report": delay_report, "punctuality": punctuality})


@app.get("/api/trains")
@login_required
def get_trains():
    search = request.args.get("search", "")
    sql = """
        SELECT train_id, train_number, train_name, train_type, coach_count
        FROM trains
        WHERE train_number LIKE %s OR train_name LIKE %s OR train_type LIKE %s
        ORDER BY train_number
    """
    needle = f"%{search}%"
    return jsonify(query_db(sql, (needle, needle, needle)))


@app.post("/api/trains")
@login_required
def create_train():
    data = request.get_json()
    train_id = query_db(
        "INSERT INTO trains (train_number, train_name, train_type, coach_count) VALUES (%s, %s, %s, %s)",
        (data["train_number"], data["train_name"], data["train_type"], data["coach_count"]),
        fetch=False,
    )
    return jsonify({"message": "Train added", "train_id": train_id}), 201


@app.put("/api/trains/<int:train_id>")
@login_required
def update_train(train_id):
    data = request.get_json()
    query_db(
        """
        UPDATE trains
        SET train_number = %s, train_name = %s, train_type = %s, coach_count = %s
        WHERE train_id = %s
        """,
        (data["train_number"], data["train_name"], data["train_type"], data["coach_count"], train_id),
        fetch=False,
    )
    return jsonify({"message": "Train updated"})


@app.delete("/api/trains/<int:train_id>")
@login_required
def delete_train(train_id):
    query_db("DELETE FROM trains WHERE train_id = %s", (train_id,), fetch=False)
    return jsonify({"message": "Train deleted"})


@app.get("/api/stations")
@login_required
def get_stations():
    search = request.args.get("search", "")
    needle = f"%{search}%"
    return jsonify(
        query_db(
            """
            SELECT station_id, station_code, station_name, city, state
            FROM stations
            WHERE station_code LIKE %s OR station_name LIKE %s OR city LIKE %s
            ORDER BY station_name
            """,
            (needle, needle, needle),
        )
    )


@app.post("/api/stations")
@login_required
def create_station():
    data = request.get_json()
    station_id = query_db(
        "INSERT INTO stations (station_code, station_name, city, state) VALUES (%s, %s, %s, %s)",
        (data["station_code"], data["station_name"], data["city"], data["state"]),
        fetch=False,
    )
    return jsonify({"message": "Station added", "station_id": station_id}), 201


@app.get("/api/routes")
@login_required
def get_routes():
    return jsonify(
        query_db(
            """
            SELECT r.route_id, r.route_name, r.total_distance_km, r.is_active,
                   t.train_number, t.train_name,
                   src.station_name AS source_station,
                   dst.station_name AS destination_station
            FROM routes r
            JOIN trains t ON t.train_id = r.train_id
            JOIN stations src ON src.station_id = r.source_station_id
            JOIN stations dst ON dst.station_id = r.destination_station_id
            ORDER BY r.route_id
            """
        )
    )


@app.post("/api/routes")
@login_required
def create_route():
    data = request.get_json()
    route_id = query_db(
        """
        INSERT INTO routes (train_id, route_name, source_station_id, destination_station_id, total_distance_km)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (
            data["train_id"],
            data["route_name"],
            data["source_station_id"],
            data["destination_station_id"],
            data["total_distance_km"],
        ),
        fetch=False,
    )
    return jsonify({"message": "Route created", "route_id": route_id}), 201


@app.get("/api/routes/<int:route_id>/map")
@login_required
def route_map(route_id):
    return jsonify(
        query_db(
            """
            SELECT ts.stop_order, s.station_code, s.station_name, s.city,
                   ts.arrival_time, ts.departure_time, ts.platform_number, ts.distance_from_source_km
            FROM train_schedule ts
            JOIN stations s ON s.station_id = ts.station_id
            WHERE ts.route_id = %s
            ORDER BY ts.stop_order
            """,
            (route_id,),
        )
    )


@app.get("/api/schedules")
@login_required
def schedules():
    return jsonify(
        query_db(
            """
            SELECT ts.schedule_id, t.train_number, t.train_name, s.station_code, s.station_name,
                   ts.stop_order, ts.arrival_time, ts.departure_time, ts.platform_number,
                   ts.distance_from_source_km
            FROM train_schedule ts
            JOIN routes r ON r.route_id = ts.route_id
            JOIN trains t ON t.train_id = r.train_id
            JOIN stations s ON s.station_id = ts.station_id
            ORDER BY t.train_number, ts.stop_order
            """
        )
    )


@app.get("/api/live")
@login_required
def live_tracking():
    return jsonify(
        query_db(
            """
            SELECT lt.tracking_id, t.train_number, t.train_name, lt.status, lt.delay_minutes,
                   lt.progress_percent, cur.station_name AS current_station, nxt.station_name AS next_station,
                   lt.last_updated
            FROM live_tracking lt
            JOIN trains t ON t.train_id = lt.train_id
            LEFT JOIN stations cur ON cur.station_id = lt.current_station_id
            LEFT JOIN stations nxt ON nxt.station_id = lt.next_station_id
            ORDER BY lt.last_updated DESC
            """
        )
    )


@app.post("/api/live/simulate")
@login_required
def simulate_live_tracking():
    rows = query_db("SELECT tracking_id, progress_percent, delay_minutes FROM live_tracking")
    statuses = ["On Time", "Departed", "Arriving", "Delayed"]
    for index, row in enumerate(rows):
        progress = (row["progress_percent"] + 8 + index * 3) % 101
        status = "Delayed" if row["delay_minutes"] > 0 and progress % 3 == 0 else statuses[index % len(statuses)]
        query_db(
            """
            UPDATE live_tracking
            SET progress_percent = %s, status = %s, last_updated = %s
            WHERE tracking_id = %s
            """,
            (progress, status, datetime.now(), row["tracking_id"]),
            fetch=False,
        )
    return jsonify({"message": "Live tracking simulation advanced"})


@app.post("/api/bookings")
@login_required
def create_booking():
    data = request.get_json()
    passenger_id = query_db(
        """
        INSERT INTO passengers (full_name, age, gender, phone, email)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (data["full_name"], data["age"], data["gender"], data["phone"], data["email"]),
        fetch=False,
    )
    booking_id = query_db(
        """
        INSERT INTO bookings (passenger_id, train_id, source_station_id, destination_station_id, journey_date, seat_number, fare, booking_status)
        VALUES (%s, %s, %s, %s, %s, %s, %s, 'Confirmed')
        """,
        (
            passenger_id,
            data["train_id"],
            data["source_station_id"],
            data["destination_station_id"],
            data["journey_date"],
            data["seat_number"],
            data["fare"],
        ),
        fetch=False,
    )
    ticket = query_db(
        """
        SELECT b.booking_id, p.full_name, t.train_number, t.train_name,
               src.station_code AS source_code, dst.station_code AS destination_code,
               b.journey_date, b.seat_number, b.fare, b.booking_status
        FROM bookings b
        JOIN passengers p ON p.passenger_id = b.passenger_id
        JOIN trains t ON t.train_id = b.train_id
        JOIN stations src ON src.station_id = b.source_station_id
        JOIN stations dst ON dst.station_id = b.destination_station_id
        WHERE b.booking_id = %s
        """,
        (booking_id,),
    )[0]
    return jsonify(ticket), 201


@app.get("/api/bookings")
@login_required
def bookings():
    return jsonify(
        query_db(
            """
            SELECT b.booking_id, p.full_name, t.train_number, src.station_code AS source_code,
                   dst.station_code AS destination_code, b.journey_date, b.seat_number,
                   b.fare, b.booking_status
            FROM bookings b
            JOIN passengers p ON p.passenger_id = b.passenger_id
            JOIN trains t ON t.train_id = b.train_id
            JOIN stations src ON src.station_id = b.source_station_id
            JOIN stations dst ON dst.station_id = b.destination_station_id
            ORDER BY b.booking_id DESC
            """
        )
    )


if __name__ == "__main__":
    app.run(debug=True)
