# from flask import Flask, render_template, request, jsonify, redirect, session, url_for, flash
# from functools import wraps
# from datetime import datetime
# from config import Config
# from models import db, User, Login, DroneInfo, DroneTagData
# import requests
# import json
# import logging
# import psycopg2

# # Flask App Setup
# app = Flask(__name__)
# app.secret_key = 'supersecretkey123'
# app.config.from_object(Config)
# db.init_app(app)

# # Configure logging
# logging.basicConfig(level=logging.DEBUG)

# # ----------------------------------------
# # Login Required Decorator
# # ----------------------------------------
# def login_required(f):
#     @wraps(f)
#     def decorated_function(*args, **kwargs):
#         if 'user_id' not in session:
#             return redirect(url_for('login', next=request.url))
#         return f(*args, **kwargs)
#     return decorated_function

# # ----------------------------------------
# # Routes
# # ----------------------------------------
# @app.route('/')
# def home():
#     return render_template('cover.html')

# @app.route('/cover')
# def cover():
#     return render_template('cover.html')

# @app.route('/index')
# @login_required
# def index():
#     return render_template('index.html')

# @app.route('/aboutus')
# def aboutus():
#     return render_template('aboutus.html')

# @app.route('/help')
# def help_page():
#     return render_template('help.html')

# @app.route('/support')
# def support_page():
#     return render_template('support.html')

# @app.route('/settings', methods=['GET', 'POST'])
# def settings_page():
#     if 'user_id' not in session:
#         return redirect('/login')

#     user = db.session.get(User, session['user_id'])
#     message = None

#     if request.method == 'POST':
#         new_email = request.form.get('email')
#         new_phone = request.form.get('phone')
#         new_password = request.form.get('password')

#         if new_email and new_email != user.email:
#             user.email = new_email

#         if new_phone and new_phone != user.phone:
#             user.phone = new_phone

#         if new_password:
#             user.password = new_password  # plain-text

#         db.session.commit()
#         message = "Settings updated successfully."

#     return render_template("settings.html", user=user, message=message)

# @app.route('/dashboard')
# @login_required
# def dashboard():
#     tracker_id = request.args.get('tracker_id')
#     if not tracker_id:
#         flash("No tracker ID provided", "warning")
#         return redirect(url_for('index'))
#     return render_template('dashboard.html', tracker_id=tracker_id)

# @app.route('/register', methods=['GET', 'POST'])
# def register():
#     if request.method == 'POST':
#         username = request.form.get('username')
#         email = request.form.get('email')
#         phone = request.form.get('phone')
#         password = request.form.get('password')
#         tracker_id = request.form.get('tracker_id')
#         uin = request.form.get('uin')
#         category = request.form.get('category')
#         application = request.form.get('application')

#         existing_user = User.query.filter((User.phone == phone) | (User.email == email)).first()
#         if existing_user:
#             flash('User with this phone or email already exists.', 'danger')
#             return render_template('register.html')

#         existing_drone = DroneInfo.query.filter_by(tracker_id=tracker_id).first()
#         if existing_drone:
#             flash('Drone with this tracker ID already exists.', 'danger')
#             return render_template('register.html')

#         try:
#             new_user = User(
#                 username=username,
#                 email=email,
#                 phone=phone,
#                 password=password,
#                 tracker_id=tracker_id,
#                 uin=uin,
#                 category=category,
#                 application=application
#             )
#             db.session.add(new_user)
#             db.session.flush()

#             new_drone = DroneInfo(
#                 tracker_id=tracker_id,
#                 uin=uin,
#                 category=category,
#                 application=application,
#                 registered_on=datetime.utcnow()
#             )
#             db.session.add(new_drone)

#             login_log = Login(phone=phone, password=password, login_time=datetime.utcnow())
#             db.session.add(login_log)

#             db.session.commit()
#             session['user_id'] = new_user.id
#             flash('Registration successful! Please log in.', 'success')
#             return redirect(url_for('login'))

#         except Exception as e:
#             db.session.rollback()
#             logging.error("Registration Error: %s", e)
#             flash('Registration failed. Please try again.', 'danger')
#             return render_template('register.html')

#     return render_template('register.html')

# @app.route('/login', methods=['GET', 'POST'])
# def login():
#     if request.method == 'POST':
#         phone = request.form.get('phone')
#         password = request.form.get('password')

#         user = User.query.filter_by(phone=phone).first()

#         if user and user.password == password:
#             session['user_id'] = user.id
#             login_log = Login(phone=phone, password=password, login_time=datetime.utcnow())
#             db.session.add(login_log)
#             db.session.commit()
#             next_page = request.args.get('next')
#             return redirect(next_page or url_for('index'))
#         else:
#             flash("Invalid phone number or password.", "danger")

#     return render_template("login.html")

# # ----------------------------------------
# # 🛰️ Trajectory API with timestamp fix
# # ----------------------------------------
# @app.route("/api/trajectory", methods=["POST"])
# def get_trajectory():
#     try:
#         data = request.get_json()
#         tracker_id = data.get("tracker_id")
#         interval_seconds = data.get("interval_seconds", 30)

#         if not tracker_id:
#             return jsonify({"error": "Tracker ID is required"}), 400

#         aws_response = requests.post(
#             "https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data",
#             json={"TrackerId": tracker_id},
#             timeout=10
#         )
#         aws_response.raise_for_status()
#         aws_data = aws_response.json()

#         body = aws_data.get("body")
#         if isinstance(body, str):
#             body = json.loads(body)

#         raw_points = body.get("Telemetry", [])
#         image_urls = body.get("Images", [])

#         # ✅ Flexible timestamp parser
#         def parse_dt(ts):
#             if not ts:
#                 return None
#             try:
#                 return datetime.fromisoformat(ts.replace("Z", "+00:00"))
#             except ValueError:
#                 try:
#                     return datetime.strptime(ts, "%d-%m-%Y %H:%M:%S")
#                 except ValueError:
#                     logging.error("Unknown timestamp format: %s", ts)
#                     return None

#         sampled = []
#         last = None

#         for p in raw_points:
#             ts = parse_dt(p.get("Timestamp"))
#             if ts is None:
#                 continue
#             if last is None or (ts - last).total_seconds() >= interval_seconds:
#                 sampled.append({
#                     "lat": p.get("Latitude"),
#                     "lon": p.get("Longitude"),
#                     "timestamp": p.get("Timestamp"),
#                     "altitude": p.get("Altitude"),
#                     "uin": p.get("DroneUINNumber"),
#                     "category": p.get("DroneCategory"),
#                     "application": p.get("DroneApplication")
#                 })
#                 last = ts

#         return jsonify({
#             "points": sampled,
#             "images": image_urls
#         })

#     except Exception as e:
#         logging.error("AWS API Error: %s", e)
#         return jsonify({"error": str(e)}), 500



# # # ----------------------------------------
# # # 🛰️ Existing API: Full Data from AWS
# # # ----------------------------------------
# # @app.route('/api/data', methods=['POST'])
# # @login_required
# # def get_data():
# #     try:
# #         payload = request.get_json() if request.is_json else json.loads(request.data.decode('utf-8'))
# #         tracker_id = payload.get('tracker_id', '').strip()
# #         if not tracker_id:
# #             return jsonify({"error": "Tracker ID is required"}), 400

# #         api_response = requests.post(
# #             "https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data",
# #             json={"TrackerId": tracker_id},
# #             timeout=10
# #         )
# #         api_response.raise_for_status()
# #         data = api_response.json()

# #         telemetry = []
# #         images = []

# #         if isinstance(data.get('body'), str):
# #             try:
# #                 body_data = json.loads(data['body'])
# #                 telemetry = body_data.get('Telemetry', [])
# #                 images = body_data.get('Images', [])
# #             except json.JSONDecodeError:
# #                 return jsonify({"error": "Invalid JSON in API response body"}), 502
# #         elif isinstance(data.get('body'), dict):
# #             telemetry = data['body'].get('Telemetry', [])
# #             images = data['body'].get('Images', [])

# #         return jsonify({
# #             "TrackerId": tracker_id,
# #             "Telemetry": telemetry,
# #             "Images": images
# #         })

# #     except requests.RequestException as e:
# #         return jsonify({"error": f"API request failed: {str(e)}"}), 502
# #     except Exception as e:
# #         return jsonify({"error": f"Internal server error: {str(e)}"}), 500

# # # ----------------------------------------
# # # 📍 NEW: Trajectory API (sorted + 30s downsample, optional time window)
# # # ----------------------------------------
# # @app.route('/api/trajectory', methods=['POST'])
# # @login_required
# # def get_trajectory():
# #     """
# #     Request JSON:
# #       {
# #         "tracker_id": "ABC123",
# #         "start_time": "2025-08-23T10:00:00",   # optional
# #         "end_time":   "2025-08-23T11:00:00",   # optional
# #         "interval_seconds": 30,                # optional (default 30)
# #         "max_gap_seconds": 120                 # optional (default 120)
# #       }
# #     Response:
# #       {
# #         "tracker_id": "...",
# #         "points": [{"lat":..., "lon":..., "timestamp":"..."}, ...],
# #         "images": [...]
# #       }
# #     """
# #     try:
# #         payload = request.get_json(force=True)
# #         tracker_id = (payload.get('tracker_id') or '').strip()
# #         if not tracker_id:
# #             return jsonify({"error": "Tracker ID is required"}), 400

# #         start_time = payload.get('start_time')
# #         end_time = payload.get('end_time')
# #         interval_seconds = int(payload.get('interval_seconds') or 30)
# #         max_gap_seconds = int(payload.get('max_gap_seconds') or 120)

# #         # Reuse the AWS call from /api/data
# #         api_response = requests.post(
# #             "https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data",
# #             json={"TrackerId": tracker_id},
# #             timeout=10
# #         )
# #         api_response.raise_for_status()
# #         data = api_response.json()

# #         if isinstance(data.get('body'), str):
# #             body = json.loads(data['body'])
# #         else:
# #             body = data.get('body', {})

# #         telemetry = body.get('Telemetry', []) or []
# #         images = body.get('Images', []) or []

# #         # Normalize + optional window filter
# #         def parse_ts(ts_str):
# #             # Accept ISO or "dd-mm-yyyy HH:MM:SS"
# #             try:
# #                 return parse_datetime(ts_str)
# #             except Exception:
# #                 try:
# #                     return datetime.strptime(ts_str, "%d-%m-%Y %H:%M:%S")
# #                 except Exception:
# #                     return None

# #         start_dt = parse_datetime(start_time) if start_time else None
# #         end_dt = parse_datetime(end_time) if end_time else None

# #         norm = []
# #         for row in telemetry:
# #             ts = parse_ts(row.get('Timestamp'))
# #             if not ts:
# #                 continue
# #             if start_dt and ts < start_dt:
# #                 continue
# #             if end_dt and ts > end_dt:
# #                 continue
# #             try:
# #                 lat = float(row.get('Latitude'))
# #                 lon = float(row.get('Longitude'))
# #             except (TypeError, ValueError):
# #                 continue
# #             norm.append({"lat": lat, "lon": lon, "timestamp": ts})

# #         # Sort by time
# #         norm.sort(key=lambda x: x["timestamp"])

# #         # Downsample by fixed 30s (or provided interval)
# #         sampled = []
# #         last_kept = None
# #         for p in norm:
# #             if last_kept is None or (p["timestamp"] - last_kept) >= timedelta(seconds=interval_seconds):
# #                 sampled.append(p)
# #                 last_kept = p["timestamp"]

# #         # Return ISO timestamps
# #         points = [{"lat": p["lat"], "lon": p["lon"], "timestamp": p["timestamp"].isoformat()} for p in sampled]

# #         return jsonify({
# #             "tracker_id": tracker_id,
# #             "points": points,
# #             "images": images,
# #             "max_gap_seconds": max_gap_seconds,
# #             "interval_seconds": interval_seconds
# #         })

# #     except Exception as e:
# #         logging.exception("Trajectory API failed")
# #         return jsonify({"error": f"Internal server error: {str(e)}"}), 500

# # ----------------------------------------
# # DB Filter
# # ----------------------------------------
# from dateutil.parser import parse as parse_datetime

# @app.route('/api/data/filter', methods=['POST'])
# def filter_telemetry_data():
#     try:
#         data = request.get_json()
#         tracker_id = data.get('tracker_id')
#         start_time_str = data.get('start_time')
#         end_time_str = data.get('end_time')

#         if not tracker_id or not start_time_str or not end_time_str:
#             return jsonify({'error': 'Missing parameters'}), 400

#         start_time = parse_datetime(start_time_str)
#         end_time = parse_datetime(end_time_str)

#         filtered_data = DroneTagData.query.filter(
#             DroneTagData.TrackerId == tracker_id,
#             DroneTagData.Timestamp >= start_time,
#             DroneTagData.Timestamp <= end_time
#         ).order_by(DroneTagData.Timestamp.asc()).all()

#         result = [{
#             'TrackerId': row.TrackerId,
#             'Latitude': row.Latitude,
#             'Longitude': row.Longitude,
#             'Timestamp': row.Timestamp.strftime("%Y-%m-%d %H:%M:%S"),
#             'Altitude': row.Altitude,
#             'DroneUINNumber': row.DroneUINNumber,
#             'DroneCategory': row.DroneCategory,
#             'DroneApplication': row.DroneApplication
#         } for row in filtered_data]

#         return jsonify(result)

#     except Exception as e:
#         logging.error("Error in /api/data/filter: %s", e)
#         return jsonify({'error': str(e)}), 500

# # ----------------------------------------
# # Other routes (account, logout, store/fetch drone data)
# # ----------------------------------------
# @app.route('/test_db')
# def test_db():
#     try:
#         conn = psycopg2.connect(
#             dbname="Drone-Tag",
#             user="postgres",
#             password="Harvi@57",
#             host="localhost",
#             port="5432"
#         )
#         cur = conn.cursor()
#         cur.execute("SELECT * FROM registration;")
#         rows = cur.fetchall()
#         cur.close()
#         conn.close()
#         return "<h2>Connection successful!</h2><pre>{}</pre>".format(rows)
#     except Exception as e:
#         return f"<h2>Connection failed:</h2><pre>{e}</pre>"

# @app.route('/account')
# @login_required
# def account():
#     user = User.query.get(session['user_id'])
#     return render_template('account.html', user=user)

# @app.route('/logout')
# def logout():
#     session.clear()
#     flash('Logged out successfully!', 'info')
#     return redirect(url_for('cover'))

# @app.route('/api/drone-data', methods=['POST'])
# def store_drone_data():
#     data = request.json
#     new_entry = DroneTagData(
#         altitude=data.get('altitude'),
#         drone_application=data.get('drone_application'),
#         drone_category=data.get('drone_category'),
#         drone_uin_number=data.get('drone_uin_number'),
#         latitude=data.get('latitude'),
#         longitude=data.get('longitude'),
#         maplink=data.get('maplink'),
#         timestamp=datetime.strptime(data.get('timestamp'), "%Y-%m-%d %H:%M:%S"),
#         tracker_id=data.get('tracker_id')
#     )
#     db.session.add(new_entry)
#     db.session.commit()
#     return jsonify({"message": "Data stored successfully"}), 201

# @app.route('/api/drone-data', methods=['GET'])
# def fetch_drone_data():
#     start_date = request.args.get('start_date')
#     end_date = request.args.get('end_date')
#     tracker_id = request.args.get('tracker_id')

#     query = DroneTagData.query

#     if start_date and end_date:
#         start_dt = datetime.strptime(start_date, "%Y-%m-%d")
#         end_dt = datetime.strptime(end_date, "%Y-%m-%d")
#         query = query.filter(DroneTagData.timestamp.between(start_dt, end_dt))

#     if tracker_id:
#         query = query.filter_by(tracker_id=tracker_id)

#     results = query.all()
#     output = [{
#         "id": row.id,
#         "altitude": float(row.altitude),
#         "drone_application": row.drone_application,
#         "drone_category": row.drone_category,
#         "drone_uin_number": row.drone_uin_number,
#         "latitude": row.latitude,
#         "longitude": row.longitude,
#         "maplink": row.maplink,
#         "timestamp": row.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
#         "tracker_id": row.tracker_id
#     } for row in results]

#     return jsonify(output)

# # ----------------------------------------
# # Start App
# # ----------------------------------------
# if __name__ == '__main__':
#     with app.app_context():
#         db.create_all()
#     app.run(debug=True) 








#  ---------------------testing code---------------------------------------------------------------------


# from flask import Flask, render_template, request, jsonify, redirect, session, url_for, flash
# from functools import wraps
# from datetime import datetime, timedelta
# from dateutil.parser import parse as parse_datetime
# from config import Config
# from models import db, User, Login, DroneInfo, DroneTagData
# import requests
# import json
# import logging
# import psycopg2

# # -----------------------------
# # Flask App Setup
# # -----------------------------
# app = Flask(__name__)
# app.secret_key = 'supersecretkey123'
# app.config.from_object(Config)
# db.init_app(app)

# logging.basicConfig(level=logging.DEBUG)

# # -----------------------------
# # Login Required Decorator
# # -----------------------------
# def login_required(f):
#     @wraps(f)
#     def decorated_function(*args, **kwargs):
#         if 'user_id' not in session:
#             return redirect(url_for('login', next=request.url))
#         return f(*args, **kwargs)
#     return decorated_function

# # -----------------------------
# # Public Routes
# # -----------------------------
# @app.route('/')
# @app.route('/cover')
# def cover():
#     return render_template('cover.html')

# @app.route('/aboutus')
# def aboutus():
#     return render_template('aboutus.html')

# @app.route('/help')
# def help_page():
#     return render_template('help.html')

# @app.route('/support')
# def support_page():
#     return render_template('support.html')

# # -----------------------------
# # Auth Routes
# # -----------------------------
# @app.route('/register', methods=['GET', 'POST'])
# def register():
#     if request.method == 'POST':
#         username = request.form.get('username')
#         email = request.form.get('email')
#         phone = request.form.get('phone')
#         password = request.form.get('password')
#         tracker_id = request.form.get('tracker_id')
#         uin = request.form.get('uin')
#         category = request.form.get('category')
#         application = request.form.get('application')

#         # Check existing user
#         if User.query.filter((User.phone == phone) | (User.email == email)).first():
#             flash('User with this phone or email already exists.', 'danger')
#             return render_template('register.html')

#         # Check existing drone
#         if DroneInfo.query.filter_by(tracker_id=tracker_id).first():
#             flash('Drone with this tracker ID already exists.', 'danger')
#             return render_template('register.html')

#         try:
#             # Create user
#             new_user = User(
#                 username=username,
#                 email=email,
#                 phone=phone,
#                 password=password,
#                 tracker_id=tracker_id,
#                 uin=uin,
#                 category=category,
#                 application=application
#             )
#             db.session.add(new_user)
#             db.session.flush()

#             # Register drone
#             new_drone = DroneInfo(
#                 tracker_id=tracker_id,
#                 uin=uin,
#                 category=category,
#                 application=application,
#                 registered_on=datetime.utcnow()
#             )
#             db.session.add(new_drone)

#             # Log login
#             login_log = Login(phone=phone, password=password, login_time=datetime.utcnow())
#             db.session.add(login_log)

#             db.session.commit()
#             session['user_id'] = new_user.id
#             flash('Registration successful! Please log in.', 'success')
#             return redirect(url_for('login'))

#         except Exception as e:
#             db.session.rollback()
#             logging.error("Registration Error: %s", e)
#             flash('Registration failed. Please try again.', 'danger')
#             return render_template('register.html')

#     return render_template('register.html')


# @app.route('/login', methods=['GET', 'POST'])
# def login():
#     if request.method == 'POST':
#         phone = request.form.get('phone')
#         password = request.form.get('password')

#         user = User.query.filter_by(phone=phone).first()
#         if user and user.password == password:
#             session['user_id'] = user.id
#             login_log = Login(phone=phone, password=password, login_time=datetime.utcnow())
#             db.session.add(login_log)
#             db.session.commit()
#             next_page = request.args.get('next')
#             return redirect(next_page or url_for('index'))
#         else:
#             flash("Invalid phone number or password.", "danger")

#     return render_template("login.html")


# @app.route('/logout')
# def logout():
#     session.clear()
#     flash('Logged out successfully!', 'info')
#     return redirect(url_for('cover'))

# # -----------------------------
# # User Dashboard & Settings
# # -----------------------------
# @app.route('/index')
# @login_required
# def index():
#     return render_template('index.html')


# @app.route('/dashboard')
# @login_required
# def dashboard():
#     tracker_id = request.args.get('tracker_id')
#     if not tracker_id:
#         flash("No tracker ID provided", "warning")
#         return redirect(url_for('index'))
#     return render_template('dashboard.html', tracker_id=tracker_id)


# @app.route('/account')
# @login_required
# def account():
#     user = User.query.get(session['user_id'])
#     return render_template('account.html', user=user)


# @app.route('/settings', methods=['GET', 'POST'])
# @login_required
# def settings_page():
#     user = db.session.get(User, session['user_id'])
#     message = None

#     if request.method == 'POST':
#         new_email = request.form.get('email')
#         new_phone = request.form.get('phone')
#         new_password = request.form.get('password')

#         if new_email and new_email != user.email:
#             user.email = new_email

#         if new_phone and new_phone != user.phone:
#             user.phone = new_phone

#         if new_password:
#             user.password = new_password  # plain-text

#         db.session.commit()
#         message = "Settings updated successfully."

#     return render_template("settings.html", user=user, message=message)

# # -----------------------------
# # API: Fetch Drone Data from AWS
# # -----------------------------
# @app.route('/api/data', methods=['POST'])
# @login_required
# def get_data():
#     try:
#         payload = request.get_json(force=True)
#         tracker_id = (payload.get('tracker_id') or '').strip()
#         if not tracker_id:
#             return jsonify({"error": "Tracker ID is required"}), 400

#         api_response = requests.post(
#             "https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data",
#             json={"TrackerId": tracker_id},
#             timeout=10
#         )
#         api_response.raise_for_status()
#         data = api_response.json()

#         body = data.get('body')
#         if isinstance(body, str):
#             try:
#                 body = json.loads(body)
#             except json.JSONDecodeError:
#                 return jsonify({"error": "Invalid JSON in API response body"}), 502

#         telemetry = body.get('Telemetry', []) or []
#         images = body.get('Images', []) or []
        
#          # Add drone info if available
#         drone_info = body.get('DroneInfo', {})  # AWS should send these fields
#         uin = drone_info.get('UIN') or "N/A"
#         category = drone_info.get('Category') or "N/A"
#         application = drone_info.get('Application') or "N/A"

#         return jsonify({
#             "TrackerId": tracker_id,
#             "Telemetry": telemetry,
#             "Images": images,
#             "UIN": uin,
#             "Category": category,
#             "Application": application
            
#         })

#     except requests.RequestException as e:
#         return jsonify({"error": f"API request failed: {str(e)}"}), 502
#     except Exception as e:
#         return jsonify({"error": f"Internal server error: {str(e)}"}), 500

# # -----------------------------
# # API: Trajectory (Downsample + Time Window)
# # -----------------------------
# @app.route('/api/trajectory', methods=['POST'])
# @login_required
# def get_trajectory():
#     try:
#         payload = request.get_json(force=True)
#         tracker_id = (payload.get('tracker_id') or '').strip()
#         if not tracker_id:
#             return jsonify({"error": "Tracker ID is required"}), 400

#         start_time = payload.get('start_time')
#         end_time = payload.get('end_time')
#         interval_seconds = int(payload.get('interval_seconds') or 30)
#         max_gap_seconds = int(payload.get('max_gap_seconds') or 120)

#         # Fetch data from AWS
#         api_response = requests.post(
#             "https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data",
#             json={"TrackerId": tracker_id},
#             timeout=10
#         )
#         api_response.raise_for_status()
#         data = api_response.json()

#         body = data.get('body')
#         if isinstance(body, str):
#             body = json.loads(body)
#         telemetry = body.get('Telemetry', []) or []
#         images = body.get('Images', []) or []

#         def parse_ts(ts_str):
#             if not ts_str:
#                 return None
#             try:
#                 return parse_datetime(ts_str)
#             except Exception:
#                 try:
#                     return datetime.strptime(ts_str, "%d-%m-%Y %H:%M:%S")
#                 except Exception:
#                     return None

#         start_dt = parse_datetime(start_time) if start_time else None
#         end_dt = parse_datetime(end_time) if end_time else None

#         norm = []
#         for row in telemetry:
#             ts = parse_ts(row.get('Timestamp'))
#             if not ts:
#                 continue
#             if start_dt and ts < start_dt:
#                 continue
#             if end_dt and ts > end_dt:
#                 continue
#             try:
#                 lat = float(row.get('Latitude'))
#                 lon = float(row.get('Longitude'))
#             except (TypeError, ValueError):
#                 continue
#             norm.append({"lat": lat, "lon": lon, "timestamp": ts})

#         norm.sort(key=lambda x: x["timestamp"])

#         # Downsample
#         sampled = []
#         last_kept = None
#         for p in norm:
#             if last_kept is None or (p["timestamp"] - last_kept) >= timedelta(seconds=interval_seconds):
#                 sampled.append(p)
#                 last_kept = p["timestamp"]

#         points = [{"lat": p["lat"], "lon": p["lon"], "timestamp": p["timestamp"].isoformat()} for p in sampled]

#         return jsonify({
#             "tracker_id": tracker_id,
#             "points": points,
#             "images": images,
#             "interval_seconds": interval_seconds,
#             "max_gap_seconds": max_gap_seconds
#         })

#     except Exception as e:
#         logging.exception("Trajectory API failed")
#         return jsonify({"error": f"Internal server error: {str(e)}"}), 500

# # -----------------------------
# # API: Store/Fetch Drone Data (DB)
# # -----------------------------
# @app.route('/api/drone-data', methods=['POST'])
# def store_drone_data():
#     data = request.json
    
#      # Fetch from AWS if not present in payload
#     uin = data.get('drone_uin_number')
#     category = data.get('drone_category')
#     application = data.get('drone_application')

#     # If missing, fetch from AWS API
#     if not uin or not category or not application:
#         tracker_id = data.get('tracker_id')
#         if tracker_id:
#             try:
#                 aws_resp = requests.post(
#                     "https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data",
#                     json={"TrackerId": tracker_id},
#                     timeout=10
#                 )
#                 body = aws_resp.json().get('body', {})
#                 if isinstance(body, str):
#                     body = json.loads(body)
#                 drone_info = body.get('DroneInfo', {})
#                 uin = uin or drone_info.get('UIN')
#                 category = category or drone_info.get('Category')
#                 application = application or drone_info.get('Application')
#             except:
#                 pass  # fallback to None
            
            
#     new_entry = DroneTagData(
#         altitude=data.get('altitude'),
#         drone_application=data.get('drone_application'),
#         drone_category=data.get('drone_category'),
#         drone_uin_number=data.get('drone_uin_number'),
#         latitude=data.get('latitude'),
#         longitude=data.get('longitude'),
#         maplink=data.get('maplink'),
#         timestamp=datetime.strptime(data.get('timestamp'), "%Y-%m-%d %H:%M:%S"),
#         tracker_id=data.get('tracker_id')
#     )
#     db.session.add(new_entry)
#     db.session.commit()
#     return jsonify({"message": "Data stored successfully"}), 201


# @app.route('/api/drone-data', methods=['GET'])
# def fetch_drone_data():
#     start_date = request.args.get('start_date')
#     end_date = request.args.get('end_date')
#     tracker_id = request.args.get('tracker_id')

#     query = DroneTagData.query

#     if start_date and end_date:
#         start_dt = datetime.strptime(start_date, "%Y-%m-%d")
#         end_dt = datetime.strptime(end_date, "%Y-%m-%d")
#         query = query.filter(DroneTagData.timestamp.between(start_dt, end_dt))

#     if tracker_id:
#         query = query.filter_by(tracker_id=tracker_id)

#     results = query.all()
#     output = [{
#         "id": row.id,
#         "altitude": float(row.altitude),
#         "drone_application": row.drone_application,
#         "drone_category": row.drone_category,
#         "drone_uin_number": row.drone_uin_number,
#         "latitude": row.latitude,
#         "longitude": row.longitude,
#         "maplink": row.maplink,
#         "timestamp": row.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
#         "tracker_id": row.tracker_id
#     } for row in results]

#     return jsonify(output)

# # -----------------------------
# # DB Test Route
# # -----------------------------
# @app.route('/test_db')
# def test_db():
#     try:
#         conn = psycopg2.connect(
#             dbname="Drone-Tag",
#             user="postgres",
#             password="Harvi@57",
#             host="localhost",
#             port="5432"
#         )
#         cur = conn.cursor()
#         cur.execute("SELECT * FROM registration;")
#         rows = cur.fetchall()
#         cur.close()
#         conn.close()
#         return "<h2>Connection successful!</h2><pre>{}</pre>".format(rows)
#     except Exception as e:
#         return f"<h2>Connection failed:</h2><pre>{e}</pre>"

# # -----------------------------
# # DB Filter API
# # -----------------------------
# @app.route('/api/data/filter', methods=['POST'])
# def filter_telemetry_data():
#     try:
#         data = request.get_json()
#         tracker_id = data.get('tracker_id')
#         start_time_str = data.get('start_time')
#         end_time_str = data.get('end_time')

#         if not tracker_id or not start_time_str or not end_time_str:
#             return jsonify({'error': 'Missing parameters'}), 400

#         start_time = parse_datetime(start_time_str)
#         end_time = parse_datetime(end_time_str)

#         filtered_data = DroneTagData.query.filter(
#             DroneTagData.TrackerId == tracker_id,
#             DroneTagData.Timestamp >= start_time,
#             DroneTagData.Timestamp <= end_time
#         ).order_by(DroneTagData.Timestamp.asc()).all()

#         result = [{
#             'TrackerId': row.TrackerId,
#             'Latitude': row.Latitude,
#             'Longitude': row.Longitude,
#             'Timestamp': row.Timestamp.strftime("%Y-%m-%d %H:%M:%S"),
#             'Altitude': row.Altitude,
#             'DroneUINNumber': row.DroneUINNumber,
#             'DroneCategory': row.DroneCategory,
#             'DroneApplication': row.DroneApplication
#         } for row in filtered_data]

#         return jsonify(result)

#     except Exception as e:
#         logging.error("Error in /api/data/filter: %s", e)
#         return jsonify({'error': str(e)}), 500

# # -----------------------------
# # Run App
# # -----------------------------
# if __name__ == '__main__':
#     with app.app_context():
#         db.create_all()
#     app.run(debug=True)


























# from flask import Flask, render_template, request, jsonify, redirect, session, url_for, flash
# from functools import wraps
# from datetime import datetime, timedelta
# from dateutil.parser import parse as parse_datetime
# from config import Config
# from models import db, User, Login, DroneInfo, DroneTagData
# import requests
# import json
# import logging

# # -----------------------------
# # Flask App Setup
# # -----------------------------
# app = Flask(__name__)
# app.secret_key = 'supersecretkey123'
# app.config.from_object(Config)
# db.init_app(app)

# logging.basicConfig(level=logging.DEBUG)

# # -----------------------------
# # Login Required Decorator
# # -----------------------------
# def login_required(f):
#     @wraps(f)
#     def decorated_function(*args, **kwargs):
#         if 'user_id' not in session:
#             return redirect(url_for('login', next=request.url))
#         return f(*args, **kwargs)
#     return decorated_function

# # -----------------------------
# # Public Routes
# # -----------------------------
# @app.route('/')
# @app.route('/cover')
# def cover():
#     return render_template('cover.html')

# @app.route('/aboutus')
# def aboutus():
#     return render_template('aboutus.html')

# @app.route('/help')
# def help_page():
#     return render_template('help.html')

# @app.route('/support')
# def support_page():
#     return render_template('support.html')

# # -----------------------------
# # Auth Routes
# # -----------------------------
# @app.route('/register', methods=['GET', 'POST'])
# def register():
#     if request.method == 'POST':
#         username = request.form.get('username')
#         email = request.form.get('email')
#         phone = request.form.get('phone')
#         password = request.form.get('password')
#         tracker_id = request.form.get('tracker_id')
#         uin = request.form.get('uin')
#         category = request.form.get('category')
#         application = request.form.get('application')

#         # Check existing user
#         if User.query.filter((User.phone == phone) | (User.email == email)).first():
#             flash('User with this phone or email already exists.', 'danger')
#             return render_template('register.html')

#         # Check existing drone
#         if DroneInfo.query.filter_by(tracker_id=tracker_id).first():
#             flash('Drone with this tracker ID already exists.', 'danger')
#             return render_template('register.html')

#         try:
#             # Create user
#             new_user = User(
#                 username=username,
#                 email=email,
#                 phone=phone,
#                 password=password,
#                 tracker_id=tracker_id,
#                 uin=uin,
#                 category=category,
#                 application=application
#             )
#             db.session.add(new_user)
#             db.session.flush()

#             # Register drone
#             new_drone = DroneInfo(
#                 tracker_id=tracker_id,
#                 uin=uin,
#                 category=category,
#                 application=application,
#                 registered_on=datetime.utcnow()
#             )
#             db.session.add(new_drone)

#             # Log login
#             login_log = Login(phone=phone, password=password, login_time=datetime.utcnow())
#             db.session.add(login_log)

#             db.session.commit()
#             session['user_id'] = new_user.id
#             flash('Registration successful! Please log in.', 'success')
#             return redirect(url_for('login'))

#         except Exception as e:
#             db.session.rollback()
#             logging.error("Registration Error: %s", e)
#             flash('Registration failed. Please try again.', 'danger')
#             return render_template('register.html')

#     return render_template('register.html')


# @app.route('/login', methods=['GET', 'POST'])
# def login():
#     if request.method == 'POST':
#         phone = request.form.get('phone')
#         password = request.form.get('password')

#         user = User.query.filter_by(phone=phone).first()
#         if user and user.password == password:
#             session['user_id'] = user.id
#             login_log = Login(phone=phone, password=password, login_time=datetime.utcnow())
#             db.session.add(login_log)
#             db.session.commit()
#             next_page = request.args.get('next')
#             return redirect(next_page or url_for('index'))
#         else:
#             flash("Invalid phone number or password.", "danger")

#     return render_template("login.html")


# @app.route('/logout')
# def logout():
#     session.clear()
#     flash('Logged out successfully!', 'info')
#     return redirect(url_for('cover'))

# # -----------------------------
# # User Dashboard & Settings
# # -----------------------------
# @app.route('/index')
# @login_required
# def index():
#     return render_template('index.html')


# @app.route('/dashboard')
# @login_required
# def dashboard():
#     tracker_id = request.args.get('tracker_id')
#     if not tracker_id:
#         flash("No tracker ID provided", "warning")
#         return redirect(url_for('index'))
#     return render_template('dashboard.html', tracker_id=tracker_id)


# @app.route('/account')
# @login_required
# def account():
#     user = User.query.get(session['user_id'])
#     return render_template('account.html', user=user)


# @app.route('/settings', methods=['GET', 'POST'])
# @login_required
# def settings_page():
#     user = db.session.get(User, session['user_id'])
#     message = None

#     if request.method == 'POST':
#         new_email = request.form.get('email')
#         new_phone = request.form.get('phone')
#         new_password = request.form.get('password')

#         if new_email and new_email != user.email:
#             user.email = new_email

#         if new_phone and new_phone != user.phone:
#             user.phone = new_phone

#         if new_password:
#             user.password = new_password  # plain-text

#         db.session.commit()
#         message = "Settings updated successfully."

#     return render_template("settings.html", user=user, message=message)

# # -----------------------------
# # API: Fetch Drone Data from AWS
# # -----------------------------
# @app.route('/api/data', methods=['POST'])
# @login_required
# def get_data():
#     try:
#         payload = request.get_json(force=True)
#         tracker_id = (payload.get('tracker_id') or '').strip()
#         if not tracker_id:
#             return jsonify({"error": "Tracker ID is required"}), 400

#         api_response = requests.post(
#             "https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data",
#             json={"TrackerId": tracker_id},
#             timeout=10
#         )
#         api_response.raise_for_status()
#         data = api_response.json()

#         body = data.get('body')
#         if isinstance(body, str):
#             body = json.loads(body)

#         telemetry = body.get('Telemetry', []) or []
#         images = body.get('Images', []) or []

#         drone_info = body.get('DroneInfo', {})
#         uin = drone_info.get('UIN') or "N/A"
#         category = drone_info.get('Category') or "N/A"
#         application = drone_info.get('Application') or "N/A"
#         default_altitude = float(drone_info.get('Altitude') or 0)

#         # Correct Altitude & drone info
#         for t in telemetry:
#             # Fetch altitude properly from AWS payload
#             altitude_val = t.get('Altitude')
#             if altitude_val is None or altitude_val == '' or float(altitude_val) == 0:
#                 altitude_val = default_altitude
#             t['Altitude'] = float(altitude_val)

#             t['DroneUINNumber'] = t.get('DroneUINNumber') or uin
#             t['DroneCategory'] = t.get('DroneCategory') or category
#             t['DroneApplication'] = t.get('DroneApplication') or application

#         return jsonify({
#             "TrackerId": tracker_id,
#             "Telemetry": telemetry,
#             "Images": images,
#             "UIN": uin,
#             "Category": category,
#             "Application": application
#         })

#     except requests.RequestException as e:
#         return jsonify({"error": f"API request failed: {str(e)}"}), 502
#     except Exception as e:
#         logging.exception("Error in /api/data")
#         return jsonify({"error": f"Internal server error: {str(e)}"}), 500

# # -----------------------------
# # API: Trajectory (Downsample + Time Window + UIN info + Correct Altitude)
# # -----------------------------
# @app.route('/api/trajectory', methods=['POST'])
# @login_required
# def get_trajectory():
#     try:
#         payload = request.get_json(force=True)
#         tracker_id = (payload.get('tracker_id') or '').strip()
#         if not tracker_id:
#             return jsonify({"error": "Tracker ID is required"}), 400

#         start_time = payload.get('start_time')
#         end_time = payload.get('end_time')
#         interval_seconds = int(payload.get('interval_seconds') or 30)
#         max_gap_seconds = int(payload.get('max_gap_seconds') or 120)

#         # Fetch data from AWS
#         api_response = requests.post(
#             "https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data",
#             json={"TrackerId": tracker_id},
#             timeout=10
#         )
#         api_response.raise_for_status()
#         data = api_response.json()

#         body = data.get('body')
#         if isinstance(body, str):
#             body = json.loads(body)

#         telemetry = body.get('Telemetry', []) or []
#         images = body.get('Images', []) or []

#         drone_info = body.get('DroneInfo', {})
#         uin = drone_info.get('UIN') or "N/A"
#         category = drone_info.get('Category') or "N/A"
#         application = drone_info.get('Application') or "N/A"
#         default_altitude = float(drone_info.get('Altitude') or 0)

#         def parse_ts(ts_str):
#             if not ts_str:
#                 return None
#             try:
#                 return parse_datetime(ts_str)
#             except Exception:
#                 try:
#                     return datetime.strptime(ts_str, "%d-%m-%Y %H:%M:%S")
#                 except Exception:
#                     return None

#         start_dt = parse_datetime(start_time) if start_time else None
#         end_dt = parse_datetime(end_time) if end_time else None

#         norm = []
#         for row in telemetry:
#             ts = parse_ts(row.get('Timestamp'))
#             if not ts:
#                 continue
#             if start_dt and ts < start_dt:
#                 continue
#             if end_dt and ts > end_dt:
#                 continue
#             try:
#                 lat = float(row.get('Latitude'))
#                 lon = float(row.get('Longitude'))
#             except (TypeError, ValueError):
#                 continue

#             # Correct Altitude
#             altitude_val = row.get('Altitude')
#             if altitude_val is None or altitude_val == '' or float(altitude_val) == 0:
#                 altitude_val = default_altitude
#             altitude_val = float(altitude_val)

#             norm.append({
#                 "lat": lat,
#                 "lon": lon,
#                 "timestamp": ts,
#                 "altitude": altitude_val,
#                 "DroneUINNumber": row.get('DroneUINNumber') or uin,
#                 "DroneCategory": row.get('DroneCategory') or category,
#                 "DroneApplication": row.get('DroneApplication') or application
#             })

#         # Sort by time
#         norm.sort(key=lambda x: x["timestamp"])

#         # Downsample
#         sampled = []
#         last_kept = None
#         for p in norm:
#             if last_kept is None or (p["timestamp"] - last_kept) >= timedelta(seconds=interval_seconds):
#                 sampled.append(p)
#                 last_kept = p["timestamp"]

#         points = [{
#             "lat": p["lat"],
#             "lon": p["lon"],
#             "altitude": p["altitude"],
#             "timestamp": p["timestamp"].isoformat(),
#             "DroneUINNumber": p["DroneUINNumber"],
#             "DroneCategory": p["DroneCategory"],
#             "DroneApplication": p["DroneApplication"]
#         } for p in sampled]

#         return jsonify({
#             "tracker_id": tracker_id,
#             "points": points,
#             "images": images,
#             "interval_seconds": interval_seconds,
#             "max_gap_seconds": max_gap_seconds,
#             "UIN": uin,
#             "Category": category,
#             "Application": application
#         })

#     except Exception as e:
#         logging.exception("Trajectory API failed")
#         return jsonify({"error": f"Internal server error: {str(e)}"}), 500

# # -----------------------------
# # Store/Fetch Drone Data in DB
# # -----------------------------
# @app.route('/api/drone-data', methods=['POST'])
# def store_drone_data():
#     data = request.json

#     # Fill missing drone info from AWS
#     uin = data.get('drone_uin_number')
#     category = data.get('drone_category')
#     application = data.get('drone_application')
#     altitude = data.get('altitude')

#     if not uin or not category or not application or not altitude:
#         tracker_id = data.get('tracker_id')
#         if tracker_id:
#             try:
#                 aws_resp = requests.post(
#                     "https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data",
#                     json={"TrackerId": tracker_id},
#                     timeout=10
#                 )
#                 body = aws_resp.json().get('body', {})
#                 if isinstance(body, str):
#                     body = json.loads(body)
#                 drone_info = body.get('DroneInfo', {})
#                 uin = uin or drone_info.get('UIN')
#                 category = category or drone_info.get('Category')
#                 application = application or drone_info.get('Application')
#                 altitude = altitude or float(drone_info.get('Altitude') or 0)
#             except:
#                 altitude = altitude or 0

#     new_entry = DroneTagData(
#         altitude=altitude,
#         drone_application=application,
#         drone_category=category,
#         drone_uin_number=uin,
#         latitude=data.get('latitude'),
#         longitude=data.get('longitude'),
#         maplink=data.get('maplink'),
#         timestamp=datetime.strptime(data.get('timestamp'), "%Y-%m-%d %H:%M:%S"),
#         tracker_id=data.get('tracker_id')
#     )
#     db.session.add(new_entry)
#     db.session.commit()
#     return jsonify({"message": "Data stored successfully"}), 201


# @app.route('/api/drone-data', methods=['GET'])
# def fetch_drone_data():
#     start_date = request.args.get('start_date')
#     end_date = request.args.get('end_date')
#     tracker_id = request.args.get('tracker_id')

#     query = DroneTagData.query

#     if start_date and end_date:
#         start_dt = datetime.strptime(start_date, "%Y-%m-%d")
#         end_dt = datetime.strptime(end_date, "%Y-%m-%d")
#         query = query.filter(DroneTagData.timestamp.between(start_dt, end_dt))

#     if tracker_id:
#         query = query.filter_by(tracker_id=tracker_id)

#     results = query.all()
#     output = [{
#         "id": row.id,
#         "altitude": float(row.altitude),
#         "drone_application": row.drone_application,
#         "drone_category": row.drone_category,
#         "drone_uin_number": row.drone_uin_number,
#         "latitude": row.latitude,
#         "longitude": row.longitude,
#         "maplink": row.maplink,
#         "timestamp": row.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
#         "tracker_id": row.tracker_id
#     } for row in results]

#     return jsonify(output)


# # -----------------------------
# # sensor fetch
# # -----------------------------
# @app.route('/api/sensor_proxy/<sensor_id>')
# def sensor_proxy(sensor_id):
#     api_url = 'https://pg2y9zc74l.execute-api.ap-south-1.amazonaws.com/data/json'
#     try:
#         r = requests.get(api_url, params={'SensorId': sensor_id}, timeout=10)
#         r.raise_for_status()
#         data = r.json()
#         # Ensure array
#         if not isinstance(data, list):
#             data = [data]
#         return jsonify(data)
#     except requests.exceptions.RequestException as e:
#         return jsonify({'error': str(e)}), 500


# # -----------------------------
# # Run App
# # -----------------------------
# if __name__ == '__main__':
#     with app.app_context():
#         db.create_all()
#     app.run(debug=True)
# if __name__ == "__main__":
#     app.run(host="0.0.0.0", port=5000, debug=True)






























#working for multiple tracker data fetching and displaying not for senor and not for guest mode(before guest mode)
# from flask import Flask, render_template, request, jsonify, redirect, session, url_for, flash
# from functools import wraps
# from datetime import datetime, timedelta
# from dateutil.parser import parse as parse_datetime
# from config import Config
# from models import db, User, Login, DroneInfo, DroneTagData
# import requests
# import json
# import logging
# import re

# # -----------------------------
# # Flask App Setup
# # -----------------------------
# app = Flask(__name__)
# app.secret_key = 'supersecretkey123'
# app.config.from_object(Config)
# db.init_app(app)

# logging.basicConfig(level=logging.DEBUG)

# # -----------------------------
# # Login Required Decorator
# # -----------------------------
# def login_required(f):
#     @wraps(f)
#     def decorated_function(*args, **kwargs):
#         if 'user_id' not in session:
#             return redirect(url_for('login', next=request.url))
#         return f(*args, **kwargs)
#     return decorated_function

# # -----------------------------
# # Public Routes
# # -----------------------------
# @app.route('/')
# @app.route('/cover')
# def cover():
#     return render_template('cover.html')



# @app.route('/aboutus')
# def aboutus():
#     return render_template('aboutus.html')

# @app.route('/help')
# def help_page():
#     return render_template('help.html')

# @app.route('/support')
# def support_page():
#     return render_template('support.html')

# # -----------------------------
# # Auth Routes
# # -----------------------------
# @app.route('/register', methods=['GET', 'POST'])
# def register():
#     if request.method == 'POST':
#         username = request.form.get('username')
#         email = request.form.get('email')
#         phone = request.form.get('phone')
#         password = request.form.get('password')
#         tracker_id = request.form.get('tracker_id')
#         uin = request.form.get('uin')
#         category = request.form.get('category')
#         application = request.form.get('application')

#         # Check existing user
#         if User.query.filter((User.phone == phone) | (User.email == email)).first():
#             flash('User with this phone or email already exists.', 'danger')
#             return render_template('register.html')

#         # Check existing drone
#         if DroneInfo.query.filter_by(tracker_id=tracker_id).first():
#             flash('Drone with this tracker ID already exists.', 'danger')
#             return render_template('register.html')

#         try:
#             # Create user
#             new_user = User(
#                 username=username,
#                 email=email,
#                 phone=phone,
#                 password=password,
#                 tracker_id=tracker_id,
#                 uin=uin,
#                 category=category,
#                 application=application
#             )
#             db.session.add(new_user)
#             db.session.flush()

#             # Register drone
#             new_drone = DroneInfo(
#                 tracker_id=tracker_id,
#                 uin=uin,
#                 category=category,
#                 application=application,
#                 registered_on=datetime.utcnow()
#             )
#             db.session.add(new_drone)

#             # Log login
#             login_log = Login(phone=phone, password=password, login_time=datetime.utcnow())
#             db.session.add(login_log)

#             db.session.commit()
#             session['user_id'] = new_user.id
#             flash('Registration successful! Please log in.', 'success')
#             return redirect(url_for('login'))

#         except Exception as e:
#             db.session.rollback()
#             logging.error("Registration Error: %s", e)
#             flash('Registration failed. Please try again.', 'danger')
#             return render_template('register.html')

#     return render_template('register.html')


# @app.route('/login', methods=['GET', 'POST'])
# def login():
#     if request.method == 'POST':
#         phone = request.form.get('phone')
#         password = request.form.get('password')

#         user = User.query.filter_by(phone=phone).first()
#         if user and user.password == password:
#             session['user_id'] = user.id
#             login_log = Login(phone=phone, password=password, login_time=datetime.utcnow())
#             db.session.add(login_log)
#             db.session.commit()
#             next_page = request.args.get('next')
#             return redirect(next_page or url_for('index'))
#         else:
#             flash("Invalid phone number or password.", "danger")

#     return render_template("login.html")


# @app.route('/logout')
# def logout():
#     session.clear()
#     flash('Logged out successfully!', 'info')
#     return redirect(url_for('cover'))

# # -----------------------------
# # User Dashboard & Settings
# # -----------------------------
# @app.route('/index')
# @login_required
# def index():
#     return render_template('dashboard.html')


# @app.route('/dashboard')
# @login_required
# def dashboard():
#     tracker_id = request.args.get('tracker_id')
#     if not tracker_id:
#         flash("No tracker ID provided", "warning")
#         return redirect(url_for('index'))
#     return render_template('dashboard.html', tracker_id=tracker_id)


# @app.route('/account')
# @login_required
# def account():
#     user = User.query.get(session['user_id'])
#     return render_template('account.html', user=user)


# @app.route('/settings', methods=['GET', 'POST'])
# @login_required
# def settings_page():
#     user = db.session.get(User, session['user_id'])
#     message = None

#     if request.method == 'POST':
#         new_email = request.form.get('email')
#         new_phone = request.form.get('phone')
#         new_password = request.form.get('password')

#         if new_email and new_email != user.email:
#             user.email = new_email

#         if new_phone and new_phone != user.phone:
#             user.phone = new_phone

#         if new_password:
#             user.password = new_password  # plain-text

#         db.session.commit()
#         message = "Settings updated successfully."

#     return render_template("settings.html", user=user, message=message)

# # -----------------------------
# # API: Fetch Drone Data from AWS
# # -----------------------------
# # @app.route('/api/data', methods=['POST'])
# # @login_required
# # def get_data():
# #     try:
# #         payload = request.get_json(force=True)
# #         tracker_id = (payload.get('tracker_id') or '').strip()
# #         if not tracker_id:
# #             return jsonify({"error": "Tracker ID is required"}), 400

# #         api_response = requests.post(
# #             "https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data",
# #             json={"TrackerId": tracker_id},
# #             timeout=10
# #         )
# #         api_response.raise_for_status()
# #         data = api_response.json()

# #         body = data.get('body')
# #         if isinstance(body, str):
# #             body = json.loads(body)

# #         telemetry = body.get('Telemetry', []) or []
# #         images = body.get('Images', []) or []

# #         drone_info = body.get('DroneInfo', {})
# #         uin = drone_info.get('UIN') or "N/A"
# #         category = drone_info.get('Category') or "N/A"
# #         application = drone_info.get('Application') or "N/A"
# #         default_altitude = float(drone_info.get('Altitude') or 0)

# #         # Correct Altitude & drone info
# #         for t in telemetry:
# #             # Fetch altitude properly from AWS payload
# #             altitude_val = t.get('Altitude')
# #             if altitude_val is None or altitude_val == '' or float(altitude_val) == 0:
# #                 altitude_val = default_altitude
# #             t['Altitude'] = float(altitude_val)

# #             t['DroneUINNumber'] = t.get('DroneUINNumber') or uin
# #             t['DroneCategory'] = t.get('DroneCategory') or category
# #             t['DroneApplication'] = t.get('DroneApplication') or application

# #         return jsonify({
# #             "TrackerId": tracker_id,
# #             "Telemetry": telemetry,
# #             "Images": images,
# #             "UIN": uin,
# #             "Category": category,
# #             "Application": application
# #         })

# #     except requests.RequestException as e:
# #         return jsonify({"error": f"API request failed: {str(e)}"}), 502
# #     except Exception as e:
# #         logging.exception("Error in /api/data")
# #         return jsonify({"error": f"Internal server error: {str(e)}"}), 500

# # # -----------------------------
# # # API: Trajectory (Downsample + Time Window + UIN info + Correct Altitude)
# # # -----------------------------
# # @app.route('/api/trajectory', methods=['POST'])
# # @login_required
# # def get_trajectory():
# #     try:
# #         payload = request.get_json(force=True)
# #         tracker_id = (payload.get('tracker_id') or '').strip()
# #         if not tracker_id:
# #             return jsonify({"error": "Tracker ID is required"}), 400

# #         start_time = payload.get('start_time')
# #         end_time = payload.get('end_time')
# #         interval_seconds = int(payload.get('interval_seconds') or 30)
# #         max_gap_seconds = int(payload.get('max_gap_seconds') or 120)

# #         # Fetch data from AWS
# #         api_response = requests.post(
# #             "https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data",
# #             json={"TrackerId": tracker_id},
# #             timeout=10
# #         )
# #         api_response.raise_for_status()
# #         data = api_response.json()

# #         body = data.get('body')
# #         if isinstance(body, str):
# #             body = json.loads(body)

# #         telemetry = body.get('Telemetry', []) or []
# #         images = body.get('Images', []) or []

# #         drone_info = body.get('DroneInfo', {})
# #         uin = drone_info.get('UIN') or "N/A"
# #         category = drone_info.get('Category') or "N/A"
# #         application = drone_info.get('Application') or "N/A"
# #         default_altitude = float(drone_info.get('Altitude') or 0)

# #         def parse_ts(ts_str):
# #             if not ts_str:
# #                 return None
# #             try:
# #                 return parse_datetime(ts_str)
# #             except Exception:
# #                 try:
# #                     return datetime.strptime(ts_str, "%d-%m-%Y %H:%M:%S")
# #                 except Exception:
# #                     return None

# #         start_dt = parse_datetime(start_time) if start_time else None
# #         end_dt = parse_datetime(end_time) if end_time else None

# #         norm = []
# #         for row in telemetry:
# #             ts = parse_ts(row.get('Timestamp'))
# #             if not ts:
# #                 continue
# #             if start_dt and ts < start_dt:
# #                 continue
# #             if end_dt and ts > end_dt:
# #                 continue
# #             try:
# #                 lat = float(row.get('Latitude'))
# #                 lon = float(row.get('Longitude'))
# #             except (TypeError, ValueError):
# #                 continue

# #             # Correct Altitude
# #             altitude_val = row.get('Altitude')
# #             if altitude_val is None or altitude_val == '' or float(altitude_val) == 0:
# #                 altitude_val = default_altitude
# #             altitude_val = float(altitude_val)

# #             norm.append({
# #                 "lat": lat,
# #                 "lon": lon,
# #                 "timestamp": ts,
# #                 "altitude": altitude_val,
# #                 "DroneUINNumber": row.get('DroneUINNumber') or uin,
# #                 "DroneCategory": row.get('DroneCategory') or category,
# #                 "DroneApplication": row.get('DroneApplication') or application
# #             })

# #         # Sort by time
# #         norm.sort(key=lambda x: x["timestamp"])

# #         # Downsample
# #         sampled = []
# #         last_kept = None
# #         for p in norm:
# #             if last_kept is None or (p["timestamp"] - last_kept) >= timedelta(seconds=interval_seconds):
# #                 sampled.append(p)
# #                 last_kept = p["timestamp"]

# #         points = [{
# #             "lat": p["lat"],
# #             "lon": p["lon"],
# #             "altitude": p["altitude"],
# #             "timestamp": p["timestamp"].isoformat(),
# #             "DroneUINNumber": p["DroneUINNumber"],
# #             "DroneCategory": p["DroneCategory"],
# #             "DroneApplication": p["DroneApplication"]
# #         } for p in sampled]

# #         return jsonify({
# #             "tracker_id": tracker_id,
# #             "points": points,
# #             "images": images,
# #             "interval_seconds": interval_seconds,
# #             "max_gap_seconds": max_gap_seconds,
# #             "UIN": uin,
# #             "Category": category,
# #             "Application": application
# #         })

# #     except Exception as e:
# #         logging.exception("Trajectory API failed")
# #         return jsonify({"error": f"Internal server error: {str(e)}"}), 500


# # -----------------------------
# # API: Get ALL Historical Data for Tracker (No Downsampling)
# # -----------------------------
# @app.route('/api/trajectory/all', methods=['POST'])
# @login_required
# def get_all_trajectory():
#     try:
#         payload = request.get_json(force=True)
#         tracker_id = (payload.get('tracker_id') or '').strip()
#         if not tracker_id:
#             return jsonify({"error": "Tracker ID is required"}), 400

#         # Fetch data from AWS
#         api_response = requests.post(
#             "https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data",
#             json={"TrackerId": tracker_id},
#             timeout=10
#         )
#         api_response.raise_for_status()
#         data = api_response.json()

#         body = data.get('body')
#         if isinstance(body, str):
#             body = json.loads(body)

#         telemetry = body.get('Telemetry', []) or []
#         images = body.get('Images', []) or []

#         drone_info = body.get('DroneInfo', {})
#         uin = drone_info.get('UIN') or "N/A"
#         category = drone_info.get('Category') or "N/A"
#         application = drone_info.get('Application') or "N/A"
#         default_altitude = float(drone_info.get('Altitude') or 0)

#         def parse_ts(ts_str):
#             if not ts_str:
#                 return None
#             try:
#                 return parse_datetime(ts_str)
#             except Exception:
#                 try:
#                     return datetime.strptime(ts_str, "%d-%m-%Y %H:%M:%S")
#                 except Exception:
#                     return None

#         # Process ALL telemetry data without downsampling
#         points = []
#         for row in telemetry:
#             ts = parse_ts(row.get('Timestamp'))
#             if not ts:
#                 continue
#             try:
#                 lat = float(row.get('Latitude'))
#                 lon = float(row.get('Longitude'))
#             except (TypeError, ValueError):
#                 continue

#             # Correct Altitude
#             altitude_val = row.get('Altitude')
#             if altitude_val is None or altitude_val == '' or float(altitude_val) == 0:
#                 altitude_val = default_altitude
#             altitude_val = float(altitude_val)

#             # Extract additional fields if available
#             drone_uin = row.get('DroneUINNumber') or uin
#             drone_category = row.get('DroneCategory') or category
#             drone_application = row.get('DroneApplication') or application
            
#             # # Get speed if available (from velocity data)
#             # speed = 0
#             # if 'Velocity' in row and row['Velocity']:
#             #     try:
#             #         # Assuming velocity is in m/s, convert to km/h
#             #         speed = float(row['Velocity']) * 3.6
#             #     except:
#             #         pass
            
#             # # Get heading if available (from direction data)
#             # heading = 0
#             # if 'Direction' in row and row['Direction']:
#             #     try:
#             #         heading = float(row['Direction'])
#             #     except:
#             #         pass
            
#             # # Battery and signal strength if available
#             # battery = row.get('Battery') or 'N/A'
#             # signal_strength = row.get('SignalStrength') or 'N/A'

#             # points.append({
#             #     "lat": lat,
#             #     "lon": lon,
#             #     "altitude": altitude_val,
#             #     "timestamp": ts.isoformat(),
#             #     "uin_no": drone_uin,
#             #     "category": drone_category,
#             #     "application": drone_application,
#             #     "speed": speed,
#             #     "heading": heading,
#             #     "battery": battery,
#             #     "signal_strength": signal_strength
#             # })

#         # Sort by timestamp (ascending - oldest first)
#         points.sort(key=lambda x: x["timestamp"])

#         return jsonify({
#             "tracker_id": tracker_id,
#             "points": points,
#             "images": images,
#             "UIN": uin,
#             "Category": category,
#             "Application": application,
#             "total_points": len(points),
#             "first_timestamp": points[0]["timestamp"] if points else None,
#             "last_timestamp": points[-1]["timestamp"] if points else None
#         })

#     except Exception as e:
#         logging.exception("All Trajectory API failed")
#         return jsonify({"error": f"Internal server error: {str(e)}"}), 500


# # -----------------------------
# # API: Get Latest Tracker Data (for real-time updates)
# # -----------------------------
# @app.route('/api/trajectory/latest', methods=['POST'])
# @login_required
# def get_latest_trajectory():
#     try:
#         payload = request.get_json(force=True)
#         tracker_id = (payload.get('tracker_id') or '').strip()
#         last_timestamp = payload.get('last_timestamp')
        
#         if not tracker_id:
#             return jsonify({"error": "Tracker ID is required"}), 400

#         # Fetch data from AWS
#         api_response = requests.post(
#             "https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data",
#             json={"TrackerId": tracker_id},
#             timeout=10
#         )
#         api_response.raise_for_status()
#         data = api_response.json()

#         body = data.get('body')
#         if isinstance(body, str):
#             body = json.loads(body)

#         telemetry = body.get('Telemetry', []) or []
        
#         drone_info = body.get('DroneInfo', {})
#         uin = drone_info.get('UIN') or "N/A"
#         category = drone_info.get('Category') or "N/A"
#         application = drone_info.get('Application') or "N/A"
#         default_altitude = float(drone_info.get('Altitude') or 0)

#         def parse_ts(ts_str):
#             if not ts_str:
#                 return None
#             try:
#                 return parse_datetime(ts_str)
#             except Exception:
#                 try:
#                     return datetime.strptime(ts_str, "%d-%m-%Y %H:%M:%S")
#                 except Exception:
#                     return None

#         # Get only points after last_timestamp
#         new_points = []
#         for row in telemetry:
#             ts = parse_ts(row.get('Timestamp'))
#             if not ts:
#                 continue
                
#             # If we have last_timestamp, only get newer points
#             if last_timestamp:
#                 point_time = ts.isoformat()
#                 if point_time <= last_timestamp:
#                     continue
            
#             try:
#                 lat = float(row.get('Latitude'))
#                 lon = float(row.get('Longitude'))
#             except (TypeError, ValueError):
#                 continue

#             # Correct Altitude
#             altitude_val = row.get('Altitude')
#             if altitude_val is None or altitude_val == '' or float(altitude_val) == 0:
#                 altitude_val = default_altitude
#             altitude_val = float(altitude_val)

#             new_points.append({
#                 "lat": lat,
#                 "lon": lon,
#                 "altitude": altitude_val,
#                 "timestamp": ts.isoformat(),
#                 "uin_no": row.get('DroneUINNumber') or uin,
#                 "category": row.get('DroneCategory') or category,
#                 "application": row.get('DroneApplication') or application
#             })

#         # Sort by timestamp (descending - newest first)
#         new_points.sort(key=lambda x: x["timestamp"], reverse=True)
        
#         # Take only the most recent points (limit to 10)
#         latest_points = new_points[:10]

#         return jsonify({
#             "tracker_id": tracker_id,
#             "points": latest_points,
#             "new_points_count": len(latest_points),
#             "last_timestamp": latest_points[0]["timestamp"] if latest_points else None
#         })

#     except Exception as e:
#         logging.exception("Latest Trajectory API failed")
#         return jsonify({"error": f"Internal server error: {str(e)}"}), 500


# # -----------------------------
# # API: Get Trajectory with Extended Fields (for detailed view)
# # -----------------------------
# @app.route('/api/trajectory/detailed', methods=['POST'])
# @login_required
# def get_detailed_trajectory():
#     try:
#         payload = request.get_json(force=True)
#         tracker_id = (payload.get('tracker_id') or '').strip()
        
#         if not tracker_id:
#             return jsonify({"error": "Tracker ID is required"}), 400

#         start_time = payload.get('start_time')
#         end_time = payload.get('end_time')
#         limit = int(payload.get('limit') or 1000)  # Default limit to 1000 points

#         # Fetch data from AWS
#         api_response = requests.post(
#             "https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data",
#             json={"TrackerId": tracker_id},
#             timeout=10
#         )
#         api_response.raise_for_status()
#         data = api_response.json()

#         body = data.get('body')
#         if isinstance(body, str):
#             body = json.loads(body)

#         telemetry = body.get('Telemetry', []) or []
#         images = body.get('Images', []) or []

#         drone_info = body.get('DroneInfo', {})
#         uin = drone_info.get('UIN') or "N/A"
#         category = drone_info.get('Category') or "N/A"
#         application = drone_info.get('Application') or "N/A"
#         default_altitude = float(drone_info.get('Altitude') or 0)

#         def parse_ts(ts_str):
#             if not ts_str:
#                 return None
#             try:
#                 return parse_datetime(ts_str)
#             except Exception:
#                 try:
#                     return datetime.strptime(ts_str, "%d-%m-%Y %H:%M:%S")
#                 except Exception:
#                     return None

#         start_dt = parse_datetime(start_time) if start_time else None
#         end_dt = parse_datetime(end_time) if end_time else None

#         # Process telemetry data
#         points = []
#         for row in telemetry:
#             ts = parse_ts(row.get('Timestamp'))
#             if not ts:
#                 continue
#             if start_dt and ts < start_dt:
#                 continue
#             if end_dt and ts > end_dt:
#                 continue
#             try:
#                 lat = float(row.get('Latitude'))
#                 lon = float(row.get('Longitude'))
#             except (TypeError, ValueError):
#                 continue

#             # Correct Altitude
#             altitude_val = row.get('Altitude')
#             if altitude_val is None or altitude_val == '' or float(altitude_val) == 0:
#                 altitude_val = default_altitude
#             altitude_val = float(altitude_val)

#             # Extract all available fields
#             point_data = {
#                 "lat": lat,
#                 "lon": lon,
#                 "altitude": altitude_val,
#                 "timestamp": ts.isoformat(),
#                 "uin_no": row.get('DroneUINNumber') or uin,
#                 "category": row.get('DroneCategory') or category,
#                 "application": row.get('DroneApplication') or application
#             }
            
#             # # Add any additional fields that might be present
#             # additional_fields = ['Speed', 'Velocity', 'Direction', 'Heading', 
#             #                    'Battery', 'SignalStrength', 'Temperature',
#             #                    'Humidity', 'Pressure', 'Satellites']
            
#             # for field in additional_fields:
#             #     if field in row and row[field] not in [None, '']:
#             #         try:
#             #             point_data[field.lower()] = float(row[field])
#             #         except:
#             #             point_data[field.lower()] = row[field]

#             # points.append(point_data)

#         # Sort by timestamp (ascending)
#         points.sort(key=lambda x: x["timestamp"])
        
#         # Apply limit
#         if len(points) > limit:
#             points = points[:limit]

#         return jsonify({
#             "tracker_id": tracker_id,
#             "points": points,
#             "images": images,
#             "UIN": uin,
#             "Category": category,
#             "Application": application,
#             "total_points": len(points),
#             "limit_applied": limit
#         })

#     except Exception as e:
#         logging.exception("Detailed Trajectory API failed")
#         return jsonify({"error": f"Internal server error: {str(e)}"}), 500


# # -----------------------------
# # Modified Original Trajectory Endpoint (for backward compatibility)
# # -----------------------------
# @app.route('/api/trajectory', methods=['POST'])
# @login_required
# def get_trajectory():
#     try:
#         payload = request.get_json(force=True)
#         tracker_id = (payload.get('tracker_id') or '').strip()
#         if not tracker_id:
#             return jsonify({"error": "Tracker ID is required"}), 400

#         start_time = payload.get('start_time')
#         end_time = payload.get('end_time')
#         interval_seconds = int(payload.get('interval_seconds') or 30)
#         max_gap_seconds = int(payload.get('max_gap_seconds') or 120)
        
#         # Check if client wants all data (interval_seconds = 0)
#         get_all_data = (interval_seconds == 0)

#         # Fetch data from AWS
#         api_response = requests.post(
#             "https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data",
#             json={"TrackerId": tracker_id},
#             timeout=10
#         )
#         api_response.raise_for_status()
#         data = api_response.json()

#         body = data.get('body')
#         if isinstance(body, str):
#             body = json.loads(body)

#         telemetry = body.get('Telemetry', []) or []
#         images = body.get('Images', []) or []

#         drone_info = body.get('DroneInfo', {})
#         uin = drone_info.get('UIN') or "N/A"
#         category = drone_info.get('Category') or "N/A"
#         application = drone_info.get('Application') or "N/A"
#         default_altitude = float(drone_info.get('Altitude') or 0)

#         def parse_ts(ts_str):
#             if not ts_str:
#                 return None
#             try:
#                 return parse_datetime(ts_str)
#             except Exception:
#                 try:
#                     return datetime.strptime(ts_str, "%d-%m-%Y %H:%M:%S")
#                 except Exception:
#                     return None

#         start_dt = parse_datetime(start_time) if start_time else None
#         end_dt = parse_datetime(end_time) if end_time else None

#         norm = []
#         for row in telemetry:
#             ts = parse_ts(row.get('Timestamp'))
#             if not ts:
#                 continue
#             if start_dt and ts < start_dt:
#                 continue
#             if end_dt and ts > end_dt:
#                 continue
#             try:
#                 lat = float(row.get('Latitude'))
#                 lon = float(row.get('Longitude'))
#             except (TypeError, ValueError):
#                 continue

#             # Correct Altitude
#             altitude_val = row.get('Altitude')
#             if altitude_val is None or altitude_val == '' or float(altitude_val) == 0:
#                 altitude_val = default_altitude
#             altitude_val = float(altitude_val)

#             norm.append({
#                 "lat": lat,
#                 "lon": lon,
#                 "timestamp": ts,
#                 "altitude": altitude_val,
#                 "DroneUINNumber": row.get('DroneUINNumber') or uin,
#                 "DroneCategory": row.get('DroneCategory') or category,
#                 "DroneApplication": row.get('DroneApplication') or application
#             })

#         # Sort by time
#         norm.sort(key=lambda x: x["timestamp"])

#         # Check if we want all data (no downsampling)
#         if get_all_data:
#             # Return all points without downsampling
#             sampled = norm
#         else:
#             # Downsample with interval
#             sampled = []
#             last_kept = None
#             for p in norm:
#                 if last_kept is None or (p["timestamp"] - last_kept) >= timedelta(seconds=interval_seconds):
#                     sampled.append(p)
#                     last_kept = p["timestamp"]

#         points = [{
#             "lat": p["lat"],
#             "lon": p["lon"],
#             "altitude": p["altitude"],
#             "timestamp": p["timestamp"].isoformat(),
#             "uin_no": p["DroneUINNumber"],
#             "category": p["DroneCategory"],
#             "application": p["DroneApplication"]
#         } for p in sampled]

#         return jsonify({
#             "tracker_id": tracker_id,
#             "points": points,
#             "images": images,
#             "interval_seconds": interval_seconds,
#             "max_gap_seconds": max_gap_seconds,
#             "UIN": uin,
#             "Category": category,
#             "Application": application,
#             "downsampling_applied": not get_all_data
#         })

#     except Exception as e:
#         logging.exception("Trajectory API failed")
#         return jsonify({"error": f"Internal server error: {str(e)}"}), 500

# # -----------------------------
# # Store/Fetch Drone Data in DB
# # -----------------------------
# @app.route('/api/drone-data', methods=['POST'])
# def store_drone_data():
#     data = request.json

#     # Fill missing drone info from AWS
#     uin = data.get('drone_uin_number')
#     category = data.get('drone_category')
#     application = data.get('drone_application')
#     altitude = data.get('altitude')

#     if not uin or not category or not application or not altitude:
#         tracker_id = data.get('tracker_id')
#         if tracker_id:
#             try:
#                 aws_resp = requests.post(
#                     "https://7mmfy9xgk9.execute-api.ap-south-1.amazonaws.com/json/data",
#                     json={"TrackerId": tracker_id},
#                     timeout=10
#                 )
#                 body = aws_resp.json().get('body', {})
#                 if isinstance(body, str):
#                     body = json.loads(body)
#                 drone_info = body.get('DroneInfo', {})
#                 uin = uin or drone_info.get('UIN')
#                 category = category or drone_info.get('Category')
#                 application = application or drone_info.get('Application')
#                 altitude = altitude or float(drone_info.get('Altitude') or 0)
#             except:
#                 altitude = altitude or 0

#     new_entry = DroneTagData(
#         altitude=altitude,
#         drone_application=application,
#         drone_category=category,
#         drone_uin_number=uin,
#         latitude=data.get('latitude'),
#         longitude=data.get('longitude'),
#         maplink=data.get('maplink'),
#         timestamp=datetime.strptime(data.get('timestamp'), "%Y-%m-%d %H:%M:%S"),
#         tracker_id=data.get('tracker_id')
#     )
#     db.session.add(new_entry)
#     db.session.commit()
#     return jsonify({"message": "Data stored successfully"}), 201


# @app.route('/api/drone-data', methods=['GET'])
# def fetch_drone_data():
#     start_date = request.args.get('start_date')
#     end_date = request.args.get('end_date')
#     tracker_id = request.args.get('tracker_id')

#     query = DroneTagData.query

#     if start_date and end_date:
#         start_dt = datetime.strptime(start_date, "%Y-%m-%d")
#         end_dt = datetime.strptime(end_date, "%Y-%m-%d")
#         query = query.filter(DroneTagData.timestamp.between(start_dt, end_dt))

#     if tracker_id:
#         query = query.filter_by(tracker_id=tracker_id)

#     results = query.all()
#     output = [{
#         "id": row.id,
#         "altitude": float(row.altitude),
#         "drone_application": row.drone_application,
#         "drone_category": row.drone_category,
#         "drone_uin_number": row.drone_uin_number,
#         "latitude": row.latitude,
#         "longitude": row.longitude,
#         "maplink": row.maplink,
#         "timestamp": row.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
#         "tracker_id": row.tracker_id
#     } for row in results]

#     return jsonify(output)



# # -----------------------------
# # GET ALL HISTORICAL SENSOR DATA
# # -----------------------------
# @app.route('/api/sensor/all', methods=['POST'])
# @login_required
# def get_all_sensor_data():
#     """
#     Get ALL historical sensor data for a specific sensor ID
#     """
#     try:
#         data = request.get_json()
#         sensor_id = data.get('sensor_id')
        
#         if not sensor_id:
#             return jsonify({"error": "sensor_id is required"}), 400
        
#         logging.info(f"Fetching ALL historical data for sensor: {sensor_id}")
        
#         # Format sensor ID as 3 digits
#         sensor_id_str = str(sensor_id).zfill(3)
        
#         # For now, create multiple test data points with different timestamps
#         # In production, replace with actual database query
#         from datetime import datetime, timedelta
#         import random
        
#         all_sensor_data = []
        
#         # Create 20 historical data points with different timestamps
#         for i in range(20):
#             # Create timestamp from 30 days ago to now
#             days_ago = random.randint(0, 30)
#             hours_ago = random.randint(0, 23)
#             minutes_ago = random.randint(0, 59)
            
#             timestamp = datetime.now() - timedelta(days=days_ago, hours=hours_ago, minutes=minutes_ago)
            
#             # Create realistic variations in sensor readings
#             base_lat = 23.0225
#             base_lon = 72.5714
            
#             # Add small random variations to location
#             lat_variation = (random.random() - 0.5) * 0.01  # ±0.005 degrees
#             lon_variation = (random.random() - 0.5) * 0.01  # ±0.005 degrees
            
#             sensor_data = {
#                 "SensorId": sensor_id_str,
#                 "Timestamp": timestamp.isoformat(),
#                 "Latitude": round(base_lat + lat_variation, 6),
#                 "Longitude": round(base_lon + lon_variation, 6),
#                 "Moisture": round(random.uniform(20, 80), 2),
#                 "Temperature": round(random.uniform(20, 35), 2),
#                 "EC": round(random.uniform(1, 4), 2),
#                 "PHValue": round(random.uniform(6.0, 8.0), 2),
#                 "Nitrogen": round(random.uniform(10, 50), 2),
#                 "Phosphorous": round(random.uniform(5, 40), 2),
#                 "Potassium": round(random.uniform(15, 45), 2),
#                 "SatelliteFix": random.choice(["GPS", "GLONASS", "Galileo", "GPS+GLONASS"]),
#                 "Id": f"{sensor_id_str}_{i:03d}",
#                 "Battery": round(random.uniform(3.5, 4.2), 2) if i % 2 == 0 else None,
#                 "SignalStrength": random.randint(1, 5) if i % 3 == 0 else None
#             }
            
#             all_sensor_data.append(sensor_data)
        
#         # Sort by timestamp (oldest first)
#         all_sensor_data.sort(key=lambda x: x["Timestamp"])
        
#         return jsonify({
#             "sensor_id": sensor_id_str,
#             "total_points": len(all_sensor_data),
#             "points": all_sensor_data
#         })
        
#     except Exception as e:
#         logging.exception(f"Error in get_all_sensor_data: {e}")
#         return jsonify({"error": str(e)}), 500


# # -----------------------------
# # GET SENSOR DATA WITH RANGE (Optional)
# # -----------------------------
# @app.route('/api/sensor/range', methods=['POST'])
# @login_required
# def get_sensor_data_range():
#     """
#     Get sensor data within a specific time range
#     """
#     try:
#         data = request.get_json()
#         sensor_id = data.get('sensor_id')
#         start_date = data.get('start_date')
#         end_date = data.get('end_date')
        
#         if not sensor_id:
#             return jsonify({"error": "sensor_id is required"}), 400
        
#         # In production, query database with date range
#         # For now, return all data
#         return get_all_sensor_data()
        
#     except Exception as e:
#         logging.exception(f"Error in get_sensor_data_range: {e}")
#         return jsonify({"error": str(e)}), 500
# # -----------------------------
# # Run App
# # -----------------------------
# if __name__ == '__main__':
#     with app.app_context():
#         db.create_all()
#     app.run(debug=True)
# # if __name__ == "__main__":
# #      app.run(host="0.0.0.0", port=5000, debug=True)





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
app.secret_key = 'supersecretkey123'
app.config.from_object(Config)
db.init_app(app)

logging.basicConfig(level=logging.DEBUG)

# Guest mode configuration
GUEST_MODE_ENABLED = True
GUEST_TRACKERS = ['2001', '2002', '2003', '2004', '2005']
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

@app.route('/api/sensor/all', methods=['POST'])
@login_required
def get_all_sensor_data():
    """Get historical sensor data for a specific sensor ID (mock + API)"""
    try:
        data = request.get_json()
        sensor_id = data.get('sensor_id')
        
        if not sensor_id:
            return jsonify({"error": "sensor_id is required"}), 400
        
        logging.info(f"Fetching ALL historical data for sensor: {sensor_id}")
        
        # Format sensor ID as 3 digits
        sensor_id_str = str(sensor_id).zfill(3)
        
        # --- Step 1: Fetch data from external API ---
        try:
            api_response = requests.get(
                "https://pg2y9zc74l.execute-api.ap-south-1.amazonaws.com/data/json",
                params={"SensorId": sensor_id_str},
                timeout=5
            )
            raw_api = api_response.json() if api_response.status_code == 200 else []
        except Exception as e:
            logging.warning(f"Failed to fetch API data: {e}")
            raw_api = []
        
        # --- Normalize API data ---
        api_data = []
        if isinstance(raw_api, dict):
            # if API sends data under a key like "Items" or "Data"
            if "data" in raw_api and isinstance(raw_api["data"], list):
                api_data = raw_api["data"]
            else:
                # treat dict as a single item
                api_data = [raw_api]
        elif isinstance(raw_api, list):
            api_data = raw_api
        
        # --- Step 2: Generate mock historical sensor data ---
        all_sensor_data = []
        base_lat, base_lon = 23.0225, 72.5714
        
        for i in range(20):
            timestamp = datetime.now() - timedelta(
                days=random.randint(0, 30),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59),
            )
            
            sensor_data = {
                "SensorId": sensor_id_str,
                "Timestamp": timestamp.isoformat(),
                "Latitude": round(base_lat + (random.random() - 0.5) * 0.01, 6),
                "Longitude": round(base_lon + (random.random() - 0.5) * 0.01, 6),
                "Moisture": round(random.uniform(20, 80), 2),
                "Temperature": round(random.uniform(20, 35), 2),
                "EC": round(random.uniform(1, 4), 2),
                "PHValue": round(random.uniform(6.0, 8.0), 2),
                "Nitrogen": round(random.uniform(10, 50), 2),
                "Phosphorous": round(random.uniform(5, 40), 2),
                "Potassium": round(random.uniform(15, 45), 2),
                "SatelliteFix": random.choice(["GPS", "GLONASS", "Galileo", "GPS+GLONASS"]),
                "Id": f"{sensor_id_str}_{i:03d}",
                "Battery": round(random.uniform(3.5, 4.2), 2) if i % 2 == 0 else None,
                "SignalStrength": random.randint(1, 5) if i % 3 == 0 else None
            }
            all_sensor_data.append(sensor_data)
        
        # --- Step 3: Merge API + Mock ---
        combined_data = all_sensor_data + api_data
        
        # --- Step 4: Sort by timestamp (oldest first) ---
        try:
            combined_data.sort(key=lambda x: x.get("Timestamp", datetime.now().isoformat()))
        except Exception as e:
            logging.warning(f"Timestamp sorting failed: {e}")
        
        return jsonify({
            "sensor_id": sensor_id_str,
            "total_points": len(combined_data),
            "points": combined_data
        })
    
    except Exception as e:
        logging.exception(f"Error in get_all_sensor_data: {e}")
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
# if __name__ == '__main__':
#     with app.app_context():
#         db.create_all()
#     app.run(debug=True, port=5000)
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
