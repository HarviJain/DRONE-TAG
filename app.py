from flask import Flask, render_template, request, jsonify, redirect, session, url_for, flash
from functools import wraps
from datetime import datetime, timedelta
from dateutil.parser import parse as parse_datetime
from config import Config
from models import db, User, Login, DroneInfo, DroneTagData
import requests
import json
import logging
import re
import random

# -----------------------------
# Flask App Setup
# -----------------------------
app = Flask(__name__)
AWS_SENSOR_API = "https://7jipuwa6t9.execute-api.ap-south-1.amazonaws.com/json/data"

app.secret_key = 'supersecretkey123'
app.config.from_object(Config)
db.init_app(app)

logging.basicConfig(level=logging.DEBUG)

# Guest mode configuration
GUEST_MODE_ENABLED = True
GUEST_TRACKERS = ['3001', '3002', '3003', '3004', '3005']
GUEST_GROUP_NAME = "Group 1"

# -----------------------------
# Helper Functions
# -----------------------------
def is_guest_user():
    """Check if current session is guest user"""
    return session.get('guest') == True

def validate_guest_tracker(tracker_id):
    """Validate if tracker is allowed in guest mode"""
    if not is_guest_user():
        return True
    return str(tracker_id) in GUEST_TRACKERS

# -----------------------------
# Decorators
# -----------------------------
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Allow access to guest users
        if 'user_id' not in session and not is_guest_user():
            flash('Please login or use guest access', 'warning')
            return redirect(url_for('cover'))
        return f(*args, **kwargs)
    return decorated_function

def login_required_no_guest(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please login to access this page', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# -----------------------------
# Public Routes
# -----------------------------
@app.route('/')
def cover():
    """Landing page with map"""
    return render_template('cover.html')

@app.route('/guest')
def guest_access():
    """Guest access route"""
    if not GUEST_MODE_ENABLED:
        flash('Guest mode is currently disabled. Please register or login.', 'warning')
        return redirect(url_for('cover'))
    
    # Clear any existing session
    session.clear()
    session['guest'] = True
    session['guest_id'] = f"guest_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
    flash('Welcome to Guest Mode! You have limited access to trackers 2001-2005.', 'info')
    return redirect(url_for('dashboard'))

@app.route('/aboutus')
def aboutus():
    return render_template('aboutus.html')

@app.route('/help')
def help_page():
    return render_template('help.html')

@app.route('/support')
def support_page():
    return render_template('support.html')

# -----------------------------
# Auth Routes
# -----------------------------
@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        phone = request.form.get('phone')
        password = request.form.get('password')
        tracker_id = request.form.get('tracker_id')
        uin = request.form.get('uin')
        category = request.form.get('category')
        application = request.form.get('application')

        # Check existing user
        if User.query.filter((User.phone == phone) | (User.email == email)).first():
            flash('User with this phone or email already exists.', 'danger')
            return render_template('register.html')

        # Check existing drone
        if DroneInfo.query.filter_by(tracker_id=tracker_id).first():
            flash('Drone with this tracker ID already exists.', 'danger')
            return render_template('register.html')

        try:
            # Create user
            new_user = User(
                username=username,
                email=email,
                phone=phone,
                password=password,
                tracker_id=tracker_id,
                uin=uin,
                category=category,
                application=application
            )
            db.session.add(new_user)
            db.session.flush()

            # Register drone
            new_drone = DroneInfo(
                tracker_id=tracker_id,
                uin=uin,
                category=category,
                application=application,
                registered_on=datetime.utcnow()
            )
            db.session.add(new_drone)

            # Log login
            login_log = Login(phone=phone, password=password, login_time=datetime.utcnow())
            db.session.add(login_log)

            db.session.commit()
            session['user_id'] = new_user.id
            session.pop('guest', None)  # Remove guest session if exists
            flash('Registration successful!', 'success')
            return redirect(url_for('dashboard'))

        except Exception as e:
            db.session.rollback()
            logging.error("Registration Error: %s", e)
            flash('Registration failed. Please try again.', 'danger')
            return render_template('register.html')

    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        phone = request.form.get('phone')
        password = request.form.get('password')

        user = User.query.filter_by(phone=phone).first()
        if user and user.password == password:
            session['user_id'] = user.id
            session.pop('guest', None)  # Remove guest session if exists
            login_log = Login(phone=phone, password=password, login_time=datetime.utcnow())
            db.session.add(login_log)
            db.session.commit()
            flash('Login successful!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash("Invalid phone number or password.", "danger")

    return render_template("login.html")

@app.route('/logout')
def logout():
    user_type = "Guest" if is_guest_user() else "User"
    session.clear()
    flash(f'{user_type} logged out successfully!', 'info')
    return redirect(url_for('cover'))

# -----------------------------
# Dashboard Route
# -----------------------------
@app.route('/dashboard')
@login_required
def dashboard():
    """Main dashboard for both logged in users and guests"""
    tracker_id = request.args.get('tracker_id')
    
    if is_guest_user():
        return render_template('guest.html',
                              tracker_id=tracker_id,
                              guest_mode=True,
                              guest_trackers=GUEST_TRACKERS,
                              guest_group_name=GUEST_GROUP_NAME)
    else:
        user = User.query.get(session['user_id'])
        return render_template('dashboard.html',
                              tracker_id=tracker_id,
                              guest_mode=False,
                              user=user)

# -----------------------------
# Account & Settings
# -----------------------------
@app.route('/account')
@login_required_no_guest
def account():
    user = User.query.get(session['user_id'])
    return render_template('account.html', user=user)

@app.route('/settings', methods=['GET', 'POST'])
@login_required_no_guest
def settings_page():
    user = db.session.get(User, session['user_id'])
    message = None

    if request.method == 'POST':
        new_email = request.form.get('email')
        new_phone = request.form.get('phone')
        new_password = request.form.get('password')

        if new_email and new_email != user.email:
            user.email = new_email

        if new_phone and new_phone != user.phone:
            user.phone = new_phone

        if new_password:
            user.password = new_password

        db.session.commit()
        message = "Settings updated successfully."

    return render_template("settings.html", user=user, message=message)

# -----------------------------
# API Routes (Guest Mode Compatible)
# -----------------------------
@app.route('/api/trajectory/all', methods=['POST'])
@login_required
def get_all_trajectory():
    try:
        payload = request.get_json(force=True)
        tracker_id = (payload.get('tracker_id') or '').strip()
        
        if not tracker_id:
            return jsonify({"error": "Tracker ID is required"}), 400
        
        # Guest mode validation
        if is_guest_user() and not validate_guest_tracker(tracker_id):
            return jsonify({
                "error": f"Guest users can only access trackers: {', '.join(GUEST_TRACKERS)}"
            }), 403

        # Fetch data from AWS
        api_response = requests.post(
            "https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data",
            json={"TrackerId": tracker_id},
            timeout=10
        )
        api_response.raise_for_status()
        data = api_response.json()

        body = data.get('body')
        if isinstance(body, str):
            body = json.loads(body)

        telemetry = body.get('Telemetry', []) or []
        images = body.get('Images', []) or []

        drone_info = body.get('DroneInfo', {})
        uin = drone_info.get('UIN') or "N/A"
        category = drone_info.get('Category') or "N/A"
        application = drone_info.get('Application') or "N/A"
        default_altitude = float(drone_info.get('Altitude') or 0)

        def parse_ts(ts_str):
            if not ts_str:
                return None
            try:
                return parse_datetime(ts_str)
            except Exception:
                try:
                    return datetime.strptime(ts_str, "%d-%m-%Y %H:%M:%S")
                except Exception:
                    return None

        # Process ALL telemetry data without downsampling
        points = []
        for row in telemetry:
            ts = parse_ts(row.get('Timestamp'))
            if not ts:
                continue
            try:
                lat = float(row.get('Latitude'))
                lon = float(row.get('Longitude'))
            except (TypeError, ValueError):
                continue

            # Correct Altitude
            altitude_val = row.get('Altitude')
            if altitude_val is None or altitude_val == '' or float(altitude_val) == 0:
                altitude_val = default_altitude
            altitude_val = float(altitude_val)

            # Extract additional fields
            drone_uin = row.get('DroneUINNumber') or uin
            drone_category = row.get('DroneCategory') or category
            drone_application = row.get('DroneApplication') or application
            
            points.append({
                "lat": lat,
                "lon": lon,
                "altitude": altitude_val,
                "timestamp": ts.isoformat(),
                "uin_no": drone_uin,
                "category": drone_category,
                "application": drone_application
            })

        # Sort by timestamp (ascending - oldest first)
        points.sort(key=lambda x: x["timestamp"])

        return jsonify({
            "tracker_id": tracker_id,
            "points": points,
            "images": images,
            "UIN": uin,
            "Category": category,
            "Application": application,
            "total_points": len(points),
            "first_timestamp": points[0]["timestamp"] if points else None,
            "last_timestamp": points[-1]["timestamp"] if points else None
        })

    except Exception as e:
        logging.exception("All Trajectory API failed")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@app.route('/api/trajectory/latest', methods=['POST'])
@login_required
def get_latest_trajectory():
    try:
        payload = request.get_json(force=True)
        tracker_id = (payload.get('tracker_id') or '').strip()
        last_timestamp = payload.get('last_timestamp')
        
        if not tracker_id:
            return jsonify({"error": "Tracker ID is required"}), 400
        
        # Guest mode validation
        if is_guest_user() and not validate_guest_tracker(tracker_id):
            return jsonify({
                "error": f"Guest users can only access trackers: {', '.join(GUEST_TRACKERS)}"
            }), 403

        # Fetch data from AWS
        api_response = requests.post(
            "https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data",
            json={"TrackerId": tracker_id},
            timeout=10
        )
        api_response.raise_for_status()
        data = api_response.json()

        body = data.get('body')
        if isinstance(body, str):
            body = json.loads(body)

        telemetry = body.get('Telemetry', []) or []
        
        drone_info = body.get('DroneInfo', {})
        uin = drone_info.get('UIN') or "N/A"
        category = drone_info.get('Category') or "N/A"
        application = drone_info.get('Application') or "N/A"
        default_altitude = float(drone_info.get('Altitude') or 0)

        def parse_ts(ts_str):
            if not ts_str:
                return None
            try:
                return parse_datetime(ts_str)
            except Exception:
                try:
                    return datetime.strptime(ts_str, "%d-%m-%Y %H:%M:%S")
                except Exception:
                    return None

        # Get only points after last_timestamp
        new_points = []
        for row in telemetry:
            ts = parse_ts(row.get('Timestamp'))
            if not ts:
                continue
                
            # If we have last_timestamp, only get newer points
            if last_timestamp:
                point_time = ts.isoformat()
                if point_time <= last_timestamp:
                    continue
            
            try:
                lat = float(row.get('Latitude'))
                lon = float(row.get('Longitude'))
            except (TypeError, ValueError):
                continue

            # Correct Altitude
            altitude_val = row.get('Altitude')
            if altitude_val is None or altitude_val == '' or float(altitude_val) == 0:
                altitude_val = default_altitude
            altitude_val = float(altitude_val)

            new_points.append({
                "lat": lat,
                "lon": lon,
                "altitude": altitude_val,
                "timestamp": ts.isoformat(),
                "uin_no": row.get('DroneUINNumber') or uin,
                "category": row.get('DroneCategory') or category,
                "application": row.get('DroneApplication') or application
            })

        # Sort by timestamp (descending - newest first)
        new_points.sort(key=lambda x: x["timestamp"], reverse=True)
        
        # Take only the most recent points (limit to 10)
        latest_points = new_points[:10]

        return jsonify({
            "tracker_id": tracker_id,
            "points": latest_points,
            "new_points_count": len(latest_points),
            "last_timestamp": latest_points[0]["timestamp"] if latest_points else None
        })

    except Exception as e:
        logging.exception("Latest Trajectory API failed")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

@app.route('/api/trajectory', methods=['POST'])
@login_required
def get_trajectory():
    try:
        payload = request.get_json(force=True)
        tracker_id = (payload.get('tracker_id') or '').strip()
        
        if not tracker_id:
            return jsonify({"error": "Tracker ID is required"}), 400
        
        # Guest mode validation
        if is_guest_user() and not validate_guest_tracker(tracker_id):
            return jsonify({
                "error": f"Guest users can only access trackers: {', '.join(GUEST_TRACKERS)}"
            }), 403

        start_time = payload.get('start_time')
        end_time = payload.get('end_time')
        interval_seconds = int(payload.get('interval_seconds') or 30)
        max_gap_seconds = int(payload.get('max_gap_seconds') or 120)
        
        # Check if client wants all data (interval_seconds = 0)
        get_all_data = (interval_seconds == 0)

        # Fetch data from AWS
        api_response = requests.post(
            "https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data",
            json={"TrackerId": tracker_id},
            timeout=10
        )
        api_response.raise_for_status()
        data = api_response.json()

        body = data.get('body')
        if isinstance(body, str):
            body = json.loads(body)

        telemetry = body.get('Telemetry', []) or []
        images = body.get('Images', []) or []

        drone_info = body.get('DroneInfo', {})
        uin = drone_info.get('UIN') or "N/A"
        category = drone_info.get('Category') or "N/A"
        application = drone_info.get('Application') or "N/A"
        default_altitude = float(drone_info.get('Altitude') or 0)

        def parse_ts(ts_str):
            if not ts_str:
                return None
            try:
                return parse_datetime(ts_str)
            except Exception:
                try:
                    return datetime.strptime(ts_str, "%d-%m-%Y %H:%M:%S")
                except Exception:
                    return None

        start_dt = parse_datetime(start_time) if start_time else None
        end_dt = parse_datetime(end_time) if end_time else None

        norm = []
        for row in telemetry:
            ts = parse_ts(row.get('Timestamp'))
            if not ts:
                continue
            if start_dt and ts < start_dt:
                continue
            if end_dt and ts > end_dt:
                continue
            try:
                lat = float(row.get('Latitude'))
                lon = float(row.get('Longitude'))
            except (TypeError, ValueError):
                continue

            # Correct Altitude
            altitude_val = row.get('Altitude')
            if altitude_val is None or altitude_val == '' or float(altitude_val) == 0:
                altitude_val = default_altitude
            altitude_val = float(altitude_val)

            norm.append({
                "lat": lat,
                "lon": lon,
                "timestamp": ts,
                "altitude": altitude_val,
                "DroneUINNumber": row.get('DroneUINNumber') or uin,
                "DroneCategory": row.get('DroneCategory') or category,
                "DroneApplication": row.get('DroneApplication') or application
            })

        # Sort by time
        norm.sort(key=lambda x: x["timestamp"])

        # Check if we want all data (no downsampling)
        if get_all_data:
            # Return all points without downsampling
            sampled = norm
        else:
            # Downsample with interval
            sampled = []
            last_kept = None
            for p in norm:
                if last_kept is None or (p["timestamp"] - last_kept) >= timedelta(seconds=interval_seconds):
                    sampled.append(p)
                    last_kept = p["timestamp"]

        points = [{
            "lat": p["lat"],
            "lon": p["lon"],
            "altitude": p["altitude"],
            "timestamp": p["timestamp"].isoformat(),
            "uin_no": p["DroneUINNumber"],
            "category": p["DroneCategory"],
            "application": p["DroneApplication"]
        } for p in sampled]

        return jsonify({
            "tracker_id": tracker_id,
            "points": points,
            "images": images,
            "interval_seconds": interval_seconds,
            "max_gap_seconds": max_gap_seconds,
            "UIN": uin,
            "Category": category,
            "Application": application,
            "downsampling_applied": not get_all_data
        })

    except Exception as e:
        logging.exception("Trajectory API failed")
        return jsonify({"error": f"Internal server error: {str(e)}"}), 500

# added by Henil Patel
@app.route("/api/sensor/data", methods=["GET"])
def get_sensor_data():
    sensor_id = request.args.get("sensor_id")

    if not sensor_id:
        return jsonify({"error": "sensor_id is required"}), 400

    try:
        aws_response = requests.post(
            AWS_SENSOR_API,
            headers={
                "Content-Type": "application/json",
                "SensorId": sensor_id   # ✅ REQUIRED BY AWS
            },
            timeout=10
        )

        aws_response.raise_for_status()
        raw = aws_response.json()

        # Handle Lambda proxy format
        if isinstance(raw, dict) and "body" in raw:
            data = json.loads(raw["body"])
        else:
            data = raw

        return jsonify(data), 200

    except Exception as e:
        logging.exception("Sensor API failed")
        return jsonify({"error": str(e)}), 500

# -----------------------------
# Template Context Processor
# -----------------------------
@app.context_processor
def inject_template_vars():
    """Inject variables into all templates"""
    return {
        'guest_mode_enabled': GUEST_MODE_ENABLED,
        'is_guest': is_guest_user(),
        'guest_trackers': GUEST_TRACKERS,
        'guest_group_name': GUEST_GROUP_NAME
    }

# -----------------------------
# Run App
# -----------------------------
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=5000)