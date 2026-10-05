"""
AgriVision AI - Flask REST API
Main application entry point with all API routes.
"""

import os
import json
import uuid
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

from database import get_db, init_db
from ai_engine import (
    compute_health_score,
    analyze_crop_image,
    generate_recommendations,
    run_simulation,
    generate_assistant_response,
)

app = Flask(__name__)

# Security: Allowed development and local origins
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:5000",
    "http://127.0.0.1:5000",
]
CORS(app, origins=ALLOWED_ORIGINS, supports_credentials=True)

# Upload config
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}
MAX_FILE_SIZE_MB = 10
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_FILE_SIZE_MB * 1024 * 1024


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def validate_float(val, name, min_val=None, max_val=None, default=None):
    """Safely validate and parse float values with boundary checks."""
    if val is None or val == "":
        return default
    try:
        f = float(val)
        if min_val is not None and f < min_val:
            raise ValueError(f"{name} must be at least {min_val}")
        if max_val is not None and f > max_val:
            raise ValueError(f"{name} cannot exceed {max_val}")
        return f
    except (ValueError, TypeError) as e:
        if isinstance(e, ValueError) and ("must be at least" in str(e) or "cannot exceed" in str(e)):
            raise
        raise ValueError(f"Invalid numeric value for {name}")


def validate_str(val, name, max_len=120, default=""):
    """Safely sanitize string length and null values."""
    if val is None:
        return default
    s = str(val).strip()
    return s[:max_len]


def row_to_dict(row):
    if row is None:
        return None
    return dict(row)


def rows_to_list(rows):
    return [dict(r) for r in rows]


def parse_json_field(data, field):
    val = data.get(field)
    if isinstance(val, str):
        try:
            return json.loads(val)
        except Exception:
            return val
    return val


# ─── Error Handlers ───────────────────────────────────────────────────────────

@app.errorhandler(400)
def bad_request(e):
    return jsonify({"error": "Bad request", "message": str(e)}), 400


@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Not found"}), 404


@app.errorhandler(413)
def file_too_large(e):
    return jsonify({"error": f"File too large. Maximum size is {MAX_FILE_SIZE_MB}MB."}), 413


@app.errorhandler(500)
def internal_error(e):
    # Never expose stack traces to frontend
    return jsonify({"error": "An internal error occurred. Please try again."}), 500


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.route("/api/health")
def api_health():
    return jsonify({"status": "ok", "version": "1.0.0", "app": "AgriVision AI"})


# ─── Farms ────────────────────────────────────────────────────────────────────

@app.route("/api/farms", methods=["GET"])
def get_farms():
    db = get_db()
    farms = rows_to_list(db.execute("SELECT * FROM farms ORDER BY created_at DESC").fetchall())
    db.close()
    return jsonify(farms)


@app.route("/api/farms/<int:farm_id>", methods=["GET"])
def get_farm(farm_id):
    db = get_db()
    farm = row_to_dict(db.execute("SELECT * FROM farms WHERE id=?", (farm_id,)).fetchone())
    if not farm:
        db.close()
        return jsonify({"error": "Farm not found"}), 404
    zones = rows_to_list(db.execute("SELECT * FROM zones WHERE farm_id=?", (farm_id,)).fetchall())
    farm["zones"] = zones
    db.close()
    return jsonify(farm)


@app.route("/api/farms", methods=["POST"])
def create_farm():
    data = request.get_json()
    if not data or not data.get("name") or not str(data["name"]).strip():
        return jsonify({"error": "Farm name is required"}), 400
    try:
        total_area = validate_float(data.get("total_area_ha"), "Total area", 0.0, 1000000.0, default=0.0)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    name = validate_str(data.get("name"), "Name", max_len=120)
    location = validate_str(data.get("location"), "Location", max_len=200)
    owner = validate_str(data.get("owner"), "Owner", max_len=120)

    db = get_db()
    c = db.cursor()
    c.execute(
        "INSERT INTO farms (name, location, total_area_ha, owner) VALUES (?,?,?,?)",
        (name, location, total_area, owner)
    )
    farm_id = c.lastrowid
    db.commit()
    farm = row_to_dict(db.execute("SELECT * FROM farms WHERE id=?", (farm_id,)).fetchone())
    db.close()
    return jsonify(farm), 201


@app.route("/api/farms/<int:farm_id>", methods=["PUT"])
def update_farm(farm_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400
    try:
        total_area = validate_float(data.get("total_area_ha"), "Total area", 0.0, 1000000.0, default=0.0)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    name = validate_str(data.get("name"), "Name", max_len=120)
    location = validate_str(data.get("location"), "Location", max_len=200)
    owner = validate_str(data.get("owner"), "Owner", max_len=120)

    db = get_db()
    db.execute(
        "UPDATE farms SET name=?, location=?, total_area_ha=?, owner=? WHERE id=?",
        (name, location, total_area, owner, farm_id)
    )
    db.commit()
    farm = row_to_dict(db.execute("SELECT * FROM farms WHERE id=?", (farm_id,)).fetchone())
    db.close()
    return jsonify(farm)


# ─── Zones ────────────────────────────────────────────────────────────────────

@app.route("/api/farms/<int:farm_id>/zones", methods=["GET"])
def get_zones(farm_id):
    db = get_db()
    zones = rows_to_list(db.execute("SELECT * FROM zones WHERE farm_id=?", (farm_id,)).fetchall())

    # Attach latest soil and analysis to each zone
    for z in zones:
        soil = row_to_dict(db.execute(
            "SELECT * FROM soil_readings WHERE zone_id=? ORDER BY recorded_at DESC LIMIT 1",
            (z["id"],)
        ).fetchone())
        z["latest_soil"] = soil

        analysis = row_to_dict(db.execute(
            "SELECT * FROM crop_analyses WHERE zone_id=? ORDER BY analyzed_at DESC LIMIT 1",
            (z["id"],)
        ).fetchone())
        z["latest_analysis"] = analysis

        health = row_to_dict(db.execute(
            "SELECT * FROM health_scores WHERE zone_id=? ORDER BY computed_at DESC LIMIT 1",
            (z["id"],)
        ).fetchone())
        z["latest_health"] = health

    db.close()
    return jsonify(zones)


@app.route("/api/zones/<int:zone_id>", methods=["GET"])
def get_zone(zone_id):
    db = get_db()
    zone = row_to_dict(db.execute("SELECT * FROM zones WHERE id=?", (zone_id,)).fetchone())
    if not zone:
        db.close()
        return jsonify({"error": "Zone not found"}), 404
    soil = rows_to_list(db.execute(
        "SELECT * FROM soil_readings WHERE zone_id=? ORDER BY recorded_at DESC LIMIT 14",
        (zone_id,)
    ).fetchall())
    zone["soil_history"] = soil
    zone["latest_soil"] = soil[0] if soil else None
    analyses = rows_to_list(db.execute(
        "SELECT * FROM crop_analyses WHERE zone_id=? ORDER BY analyzed_at DESC LIMIT 5",
        (zone_id,)
    ).fetchall())
    zone["analyses"] = analyses
    zone["latest_analysis"] = analyses[0] if analyses else None
    db.close()
    return jsonify(zone)


@app.route("/api/farms/<int:farm_id>/zones", methods=["POST"])
def create_zone(farm_id):
    data = request.get_json()
    if not data or not data.get("name") or not str(data["name"]).strip():
        return jsonify({"error": "Zone name is required"}), 400
    try:
        area_ha = validate_float(data.get("area_ha"), "Zone area", 0.0, 100000.0, default=0.0)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    name = validate_str(data.get("name"), "Zone name", max_len=120)
    crop_type = validate_str(data.get("crop_type"), "Crop type", max_len=100)
    growth_stage = validate_str(data.get("growth_stage"), "Growth stage", max_len=100)
    soil_type = validate_str(data.get("soil_type"), "Soil type", max_len=100)
    irrigation_type = validate_str(data.get("irrigation_type"), "Irrigation type", max_len=100)

    db = get_db()
    c = db.cursor()
    c.execute(
        "INSERT INTO zones (farm_id, name, area_ha, crop_type, growth_stage, soil_type, irrigation_type) VALUES (?,?,?,?,?,?,?)",
        (farm_id, name, area_ha, crop_type, growth_stage, soil_type, irrigation_type)
    )
    zone_id = c.lastrowid
    db.commit()
    zone = row_to_dict(db.execute("SELECT * FROM zones WHERE id=?", (zone_id,)).fetchone())
    db.close()
    return jsonify(zone), 201


@app.route("/api/zones/<int:zone_id>", methods=["PUT"])
def update_zone(zone_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400
    try:
        area_ha = validate_float(data.get("area_ha"), "Zone area", 0.0, 100000.0, default=0.0)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    name = validate_str(data.get("name"), "Zone name", max_len=120)
    crop_type = validate_str(data.get("crop_type"), "Crop type", max_len=100)
    growth_stage = validate_str(data.get("growth_stage"), "Growth stage", max_len=100)
    soil_type = validate_str(data.get("soil_type"), "Soil type", max_len=100)
    irrigation_type = validate_str(data.get("irrigation_type"), "Irrigation type", max_len=100)

    db = get_db()
    db.execute(
        "UPDATE zones SET name=?, area_ha=?, crop_type=?, growth_stage=?, soil_type=?, irrigation_type=? WHERE id=?",
        (name, area_ha, crop_type, growth_stage, soil_type, irrigation_type, zone_id)
    )
    db.commit()
    zone = row_to_dict(db.execute("SELECT * FROM zones WHERE id=?", (zone_id,)).fetchone())
    db.close()
    return jsonify(zone)


# ─── Soil Readings ────────────────────────────────────────────────────────────

@app.route("/api/zones/<int:zone_id>/soil", methods=["GET"])
def get_soil(zone_id):
    db = get_db()
    readings = rows_to_list(db.execute(
        "SELECT * FROM soil_readings WHERE zone_id=? ORDER BY recorded_at DESC LIMIT 30",
        (zone_id,)
    ).fetchall())
    db.close()
    return jsonify(readings)


@app.route("/api/zones/<int:zone_id>/soil", methods=["POST"])
def add_soil(zone_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400
    try:
        ph = validate_float(data.get("ph"), "pH", 0.0, 14.0)
        n = validate_float(data.get("nitrogen_ppm"), "Nitrogen", 0.0, 10000.0)
        p = validate_float(data.get("phosphorus_ppm"), "Phosphorus", 0.0, 10000.0)
        k = validate_float(data.get("potassium_ppm"), "Potassium", 0.0, 10000.0)
        m = validate_float(data.get("moisture_pct"), "Moisture", 0.0, 100.0)
        om = validate_float(data.get("organic_matter_pct"), "Organic Matter", 0.0, 100.0)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400

    db = get_db()
    c = db.cursor()
    c.execute("""
        INSERT INTO soil_readings
        (zone_id, ph, nitrogen_ppm, phosphorus_ppm, potassium_ppm, moisture_pct, organic_matter_pct)
        VALUES (?,?,?,?,?,?,?)
    """, (zone_id, ph, n, p, k, m, om))
    rid = c.lastrowid
    db.commit()
    row = row_to_dict(db.execute("SELECT * FROM soil_readings WHERE id=?", (rid,)).fetchone())
    db.close()
    return jsonify(row), 201


# ─── Weather ──────────────────────────────────────────────────────────────────

@app.route("/api/farms/<int:farm_id>/weather", methods=["GET"])
def get_weather(farm_id):
    db = get_db()
    readings = rows_to_list(db.execute(
        "SELECT * FROM weather_readings WHERE farm_id=? ORDER BY recorded_at DESC LIMIT 30",
        (farm_id,)
    ).fetchall())
    db.close()
    return jsonify(readings)


@app.route("/api/farms/<int:farm_id>/weather", methods=["POST"])
def add_weather(farm_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400
    try:
        temp = validate_float(data.get("temperature_c"), "Temperature", -50.0, 70.0)
        hum = validate_float(data.get("humidity_pct"), "Humidity", 0.0, 100.0)
        rain = validate_float(data.get("rainfall_mm"), "Rainfall", 0.0, 2000.0, default=0.0)
        wind = validate_float(data.get("wind_speed_kmh"), "Wind Speed", 0.0, 300.0)
        solar = validate_float(data.get("solar_radiation"), "Solar Radiation", 0.0, 100.0)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400

    db = get_db()
    c = db.cursor()
    c.execute("""
        INSERT INTO weather_readings
        (farm_id, temperature_c, humidity_pct, rainfall_mm, wind_speed_kmh, solar_radiation)
        VALUES (?,?,?,?,?,?)
    """, (farm_id, temp, hum, rain, wind, solar))
    rid = c.lastrowid
    db.commit()
    row = row_to_dict(db.execute("SELECT * FROM weather_readings WHERE id=?", (rid,)).fetchone())
    db.close()
    return jsonify(row), 201


# ─── Crop Analysis ────────────────────────────────────────────────────────────

@app.route("/api/zones/<int:zone_id>/analyze", methods=["POST"])
def analyze_zone(zone_id):
    db = get_db()
    zone = row_to_dict(db.execute("SELECT * FROM zones WHERE id=?", (zone_id,)).fetchone())
    if not zone:
        db.close()
        return jsonify({"error": "Zone not found"}), 404

    image_path = None
    saved_filename = None

    # Handle image upload if present
    if "image" in request.files:
        file = request.files["image"]
        if file and file.filename and allowed_file(file.filename):
            safe_basename = secure_filename(file.filename)
            saved_filename = f"{uuid.uuid4().hex}_{safe_basename}"
            image_path = os.path.join(UPLOAD_FOLDER, saved_filename)
            file.save(image_path)
        elif file and file.filename:
            db.close()
            return jsonify({"error": "Invalid file type. Allowed: PNG, JPG, JPEG, WebP, GIF"}), 400

    # Get latest soil and weather for scoring
    soil = row_to_dict(db.execute(
        "SELECT * FROM soil_readings WHERE zone_id=? ORDER BY recorded_at DESC LIMIT 1",
        (zone_id,)
    ).fetchone())

    weather = row_to_dict(db.execute(
        "SELECT * FROM weather_readings WHERE farm_id=? ORDER BY recorded_at DESC LIMIT 1",
        (zone.get("farm_id"),)
    ).fetchone())

    # Analyze image or use rule-based defaults
    if image_path:
        analysis = analyze_crop_image(image_path, zone.get("crop_type", "Unknown"))
    else:
        # Use rule-based analysis from form data / context
        form_data = request.form.to_dict() if request.form else {}
        health_score = int(form_data.get("health_score", 75))
        disease = form_data.get("disease_detected", "None Detected")
        symptoms = form_data.get("symptoms", "Manual entry - no image provided")
        recs = form_data.get("recommendations", "Continue current management")
        analysis = {
            "health_score": health_score,
            "disease_detected": disease,
            "confidence_pct": 0.0 if disease == "None Detected" else 50.0,
            "ndvi_estimate": round(health_score / 120, 2),
            "symptoms": symptoms,
            "recommendations": recs,
            "analysis_type": "manual_entry",
            "disclaimer": "Manual entry – no image analyzed."
        }

    # Save analysis with web-accessible relative image URL
    image_rel_url = f"/api/uploads/{saved_filename}" if saved_filename else ""
    c = db.cursor()
    c.execute("""
        INSERT INTO crop_analyses
        (zone_id, image_path, analysis_type, health_score, disease_detected, confidence_pct,
         ndvi_estimate, symptoms, recommendations, is_simulated)
        VALUES (?,?,?,?,?,?,?,?,?,?)
    """, (zone_id, image_rel_url, analysis.get("analysis_type", "demo"),
          analysis["health_score"], analysis["disease_detected"],
          analysis["confidence_pct"], analysis["ndvi_estimate"],
          analysis["symptoms"], analysis["recommendations"],
          0 if image_path else 1))
    analysis_id = c.lastrowid

    # Compute and save health score
    health_data = compute_health_score(soil, weather, analysis)
    c.execute("""
        INSERT INTO health_scores
        (farm_id, zone_id, overall_score, soil_score, weather_score, crop_score, risk_level, risk_factors)
        VALUES (?,?,?,?,?,?,?,?)
    """, (zone.get("farm_id"), zone_id, health_data["overall_score"],
          health_data["soil_score"], health_data["weather_score"],
          health_data["crop_score"], health_data["risk_level"],
          json.dumps(health_data["risk_factors"])))

    # Generate new recommendations
    db.execute("DELETE FROM recommendations WHERE zone_id=? AND status='pending'", (zone_id,))
    recs_list = generate_recommendations(
        zone.get("farm_id"), zone_id, soil, weather, health_data, zone.get("crop_type", "Unknown")
    )
    for rec in recs_list:
        c.execute("""
            INSERT INTO recommendations (farm_id, zone_id, category, priority, title, description, action, estimated_impact)
            VALUES (?,?,?,?,?,?,?,?)
        """, (zone.get("farm_id"), zone_id, rec["category"], rec["priority"],
              rec["title"], rec["description"], rec["action"], rec["estimated_impact"]))

    db.commit()

    result = {
        "analysis": analysis,
        "health_score": health_data,
        "recommendations_count": len(recs_list)
    }
    db.close()
    return jsonify(result), 200


@app.route("/api/zones/<int:zone_id>/analyses", methods=["GET"])
def get_analyses(zone_id):
    db = get_db()
    analyses = rows_to_list(db.execute(
        "SELECT * FROM crop_analyses WHERE zone_id=? ORDER BY analyzed_at DESC LIMIT 20",
        (zone_id,)
    ).fetchall())
    db.close()
    return jsonify(analyses)


# ─── Health Scores ────────────────────────────────────────────────────────────

@app.route("/api/farms/<int:farm_id>/health", methods=["GET"])
def get_farm_health(farm_id):
    db = get_db()
    zones = rows_to_list(db.execute("SELECT * FROM zones WHERE farm_id=?", (farm_id,)).fetchall())
    results = []
    for z in zones:
        h = row_to_dict(db.execute(
            "SELECT * FROM health_scores WHERE zone_id=? ORDER BY computed_at DESC LIMIT 1",
            (z["id"],)
        ).fetchone())
        if h:
            h["zone_name"] = z["name"]
            h["crop_type"] = z["crop_type"]
            factors = h.get("risk_factors")
            if isinstance(factors, str):
                try:
                    h["risk_factors"] = json.loads(factors)
                except Exception:
                    pass
            results.append(h)
    overall_avg = round(sum(r["overall_score"] for r in results) / len(results)) if results else 0
    db.close()
    return jsonify({"zones": results, "farm_average": overall_avg})


@app.route("/api/farms/<int:farm_id>/health/history", methods=["GET"])
def get_health_history(farm_id):
    db = get_db()
    history = rows_to_list(db.execute(
        "SELECT hs.*, z.name as zone_name FROM health_scores hs JOIN zones z ON hs.zone_id=z.id "
        "WHERE hs.farm_id=? ORDER BY hs.computed_at DESC LIMIT 50",
        (farm_id,)
    ).fetchall())
    db.close()
    return jsonify(history)


# ─── Recommendations ──────────────────────────────────────────────────────────

@app.route("/api/farms/<int:farm_id>/recommendations", methods=["GET"])
def get_recommendations(farm_id):
    db = get_db()
    recs = rows_to_list(db.execute(
        "SELECT r.*, z.name as zone_name FROM recommendations r "
        "LEFT JOIN zones z ON r.zone_id=z.id "
        "WHERE r.farm_id=? ORDER BY "
        "CASE r.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END, r.created_at DESC",
        (farm_id,)
    ).fetchall())
    db.close()
    return jsonify(recs)


@app.route("/api/recommendations/<int:rec_id>/status", methods=["PUT"])
def update_rec_status(rec_id):
    data = request.get_json()
    status = data.get("status", "pending")
    if status not in ("pending", "done", "dismissed"):
        return jsonify({"error": "Invalid status"}), 400
    db = get_db()
    db.execute("UPDATE recommendations SET status=? WHERE id=?", (status, rec_id))
    db.commit()
    db.close()
    return jsonify({"id": rec_id, "status": status})


# ─── What-If Simulation ───────────────────────────────────────────────────────

@app.route("/api/zones/<int:zone_id>/simulate", methods=["POST"])
def simulate(zone_id):
    data = request.get_json() or {}
    try:
        irr = validate_float(data.get("irrigation_change_pct"), "Irrigation change", -100.0, 100.0, default=0.0)
        fert = validate_float(data.get("fertilizer_change_pct"), "Fertilizer change", -100.0, 100.0, default=0.0)
        temp_shift = validate_float(data.get("temperature_shift_c"), "Temperature shift", -20.0, 20.0, default=0.0)
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400

    db = get_db()
    zone = row_to_dict(db.execute("SELECT * FROM zones WHERE id=?", (zone_id,)).fetchone())
    if not zone:
        db.close()
        return jsonify({"error": "Zone not found"}), 404

    soil = row_to_dict(db.execute(
        "SELECT * FROM soil_readings WHERE zone_id=? ORDER BY recorded_at DESC LIMIT 1",
        (zone_id,)
    ).fetchone())

    weather = row_to_dict(db.execute(
        "SELECT * FROM weather_readings WHERE farm_id=? ORDER BY recorded_at DESC LIMIT 1",
        (zone.get("farm_id"),)
    ).fetchone())

    health = row_to_dict(db.execute(
        "SELECT * FROM health_scores WHERE zone_id=? ORDER BY computed_at DESC LIMIT 1",
        (zone_id,)
    ).fetchone())

    base_health = health.get("overall_score", 70) if health else 70
    params = {
        **data,
        "base_health_score": base_health,
        "irrigation_change_pct": irr,
        "fertilizer_change_pct": fert,
        "temperature_shift_c": temp_shift
    }

    result = run_simulation(zone, soil, weather, params)

    # Save simulation
    db.execute("""
        INSERT INTO simulations (farm_id, zone_id, scenario_name, parameters, results)
        VALUES (?,?,?,?,?)
    """, (zone.get("farm_id"), zone_id,
          validate_str(data.get("scenario_name"), "Scenario name", max_len=100, default="Custom"),
          json.dumps(params), json.dumps(result)))
    db.commit()
    db.close()
    return jsonify(result)


@app.route("/api/zones/<int:zone_id>/simulations", methods=["GET"])
def get_simulations(zone_id):
    db = get_db()
    sims = rows_to_list(db.execute(
        "SELECT * FROM simulations WHERE zone_id=? ORDER BY created_at DESC LIMIT 10",
        (zone_id,)
    ).fetchall())
    for s in sims:
        if isinstance(s.get("parameters"), str):
            try:
                s["parameters"] = json.loads(s["parameters"])
            except Exception:
                pass
        if isinstance(s.get("results"), str):
            try:
                s["results"] = json.loads(s["results"])
            except Exception:
                pass
    db.close()
    return jsonify(sims)


# ─── AI Assistant ─────────────────────────────────────────────────────────────

@app.route("/api/farms/<int:farm_id>/assistant", methods=["POST"])
def assistant_chat(farm_id):
    data = request.get_json()
    user_message = data.get("message", "").strip()
    if not user_message:
        return jsonify({"error": "Message is required"}), 400
    if len(user_message) > 1000:
        return jsonify({"error": "Message too long (max 1000 characters)"}), 400

    db = get_db()

    # Build farm context from real DB data
    farm = row_to_dict(db.execute("SELECT * FROM farms WHERE id=?", (farm_id,)).fetchone())
    zones = rows_to_list(db.execute("SELECT * FROM zones WHERE farm_id=?", (farm_id,)).fetchall())

    for z in zones:
        analysis = row_to_dict(db.execute(
            "SELECT * FROM crop_analyses WHERE zone_id=? ORDER BY analyzed_at DESC LIMIT 1",
            (z["id"],)
        ).fetchone())
        z["latest_analysis"] = analysis

    latest_soil = row_to_dict(db.execute("""
        SELECT sr.* FROM soil_readings sr
        JOIN zones z ON sr.zone_id = z.id
        WHERE z.farm_id=?
        ORDER BY sr.recorded_at DESC LIMIT 1
    """, (farm_id,)).fetchone())

    latest_weather = row_to_dict(db.execute(
        "SELECT * FROM weather_readings WHERE farm_id=? ORDER BY recorded_at DESC LIMIT 1",
        (farm_id,)
    ).fetchone())

    health_scores = rows_to_list(db.execute(
        "SELECT hs.* FROM health_scores hs WHERE hs.farm_id=? "
        "GROUP BY hs.zone_id ORDER BY hs.computed_at DESC",
        (farm_id,)
    ).fetchall())

    recs = rows_to_list(db.execute(
        "SELECT r.*, z.name as zone_name FROM recommendations r "
        "LEFT JOIN zones z ON r.zone_id=z.id "
        "WHERE r.farm_id=? AND r.status='pending' "
        "ORDER BY CASE r.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END",
        (farm_id,)
    ).fetchall())

    context = {
        "farm": farm,
        "zones": zones,
        "latest_soil": latest_soil,
        "latest_weather": latest_weather,
        "health_scores": health_scores,
        "recommendations": recs
    }

    response = generate_assistant_response(user_message, context)

    # Save conversation
    db.execute("INSERT INTO assistant_messages (farm_id, role, content) VALUES (?,?,?)",
               (farm_id, "user", user_message))
    db.execute("INSERT INTO assistant_messages (farm_id, role, content) VALUES (?,?,?)",
               (farm_id, "assistant", response))
    db.commit()
    db.close()

    return jsonify({"response": response})


@app.route("/api/farms/<int:farm_id>/assistant/history", methods=["GET"])
def assistant_history(farm_id):
    db = get_db()
    messages = rows_to_list(db.execute(
        "SELECT * FROM assistant_messages WHERE farm_id=? ORDER BY created_at DESC LIMIT 50",
        (farm_id,)
    ).fetchall())
    db.close()
    return jsonify(list(reversed(messages)))


@app.route("/api/farms/<int:farm_id>/assistant/history", methods=["DELETE"])
def clear_assistant_history(farm_id):
    db = get_db()
    db.execute("DELETE FROM assistant_messages WHERE farm_id=?", (farm_id,))
    db.commit()
    db.close()
    return jsonify({"message": "Chat history cleared"})


# ─── Dashboard Summary ────────────────────────────────────────────────────────

@app.route("/api/farms/<int:farm_id>/dashboard", methods=["GET"])
def get_dashboard(farm_id):
    db = get_db()

    farm = row_to_dict(db.execute("SELECT * FROM farms WHERE id=?", (farm_id,)).fetchone())
    if not farm:
        db.close()
        return jsonify({"error": "Farm not found"}), 404

    zones = rows_to_list(db.execute("SELECT * FROM zones WHERE farm_id=?", (farm_id,)).fetchall())

    # Health scores per zone
    health_zones = []
    for z in zones:
        h = row_to_dict(db.execute(
            "SELECT * FROM health_scores WHERE zone_id=? ORDER BY computed_at DESC LIMIT 1",
            (z["id"],)
        ).fetchone())
        if h:
            h["zone_name"] = z["name"]
            h["crop_type"] = z["crop_type"]
            factors = h.get("risk_factors")
            if isinstance(factors, str):
                try:
                    h["risk_factors"] = json.loads(factors)
                except Exception:
                    pass
            health_zones.append(h)

    farm_avg = round(sum(h["overall_score"] for h in health_zones) / len(health_zones)) if health_zones else 0

    # Latest weather
    weather = row_to_dict(db.execute(
        "SELECT * FROM weather_readings WHERE farm_id=? ORDER BY recorded_at DESC LIMIT 1",
        (farm_id,)
    ).fetchone())

    # Pending recommendations count by priority
    high_recs = db.execute(
        "SELECT COUNT(*) FROM recommendations WHERE farm_id=? AND priority='High' AND status='pending'",
        (farm_id,)
    ).fetchone()[0]
    med_recs = db.execute(
        "SELECT COUNT(*) FROM recommendations WHERE farm_id=? AND priority='Medium' AND status='pending'",
        (farm_id,)
    ).fetchone()[0]

    # Disease alerts
    disease_alerts = []
    for z in zones:
        a = row_to_dict(db.execute(
            "SELECT * FROM crop_analyses WHERE zone_id=? ORDER BY analyzed_at DESC LIMIT 1",
            (z["id"],)
        ).fetchone())
        if a and a.get("disease_detected") not in ("None Detected", None, ""):
            disease_alerts.append({
                "zone_name": z["name"],
                "disease": a["disease_detected"],
                "confidence": a["confidence_pct"],
                "health_score": a["health_score"]
            })

    # Weather trend (last 7 days)
    weather_trend = rows_to_list(db.execute(
        "SELECT * FROM weather_readings WHERE farm_id=? ORDER BY recorded_at DESC LIMIT 7",
        (farm_id,)
    ).fetchall())

    # Soil trend for first zone
    soil_trend = []
    if zones:
        soil_trend = rows_to_list(db.execute(
            "SELECT * FROM soil_readings WHERE zone_id=? ORDER BY recorded_at DESC LIMIT 7",
            (zones[0]["id"],)
        ).fetchall())

    db.close()
    return jsonify({
        "farm": farm,
        "zones_count": len(zones),
        "farm_health_average": farm_avg,
        "zone_health": health_zones,
        "latest_weather": weather,
        "high_priority_recs": high_recs,
        "medium_priority_recs": med_recs,
        "disease_alerts": disease_alerts,
        "weather_trend": list(reversed(weather_trend)),
        "soil_trend": list(reversed(soil_trend))
    })


# ─── Uploads ──────────────────────────────────────────────────────────────────

@app.route("/api/uploads/<path:filename>")
def serve_upload(filename):
    safe_name = secure_filename(os.path.basename(filename))
    if not safe_name or not allowed_file(safe_name):
        return jsonify({"error": "Invalid file request"}), 400
    file_path = os.path.abspath(os.path.join(UPLOAD_FOLDER, safe_name))
    if not file_path.startswith(os.path.abspath(UPLOAD_FOLDER)):
        return jsonify({"error": "Access denied"}), 403
    if not os.path.exists(file_path):
        return jsonify({"error": "File not found"}), 404
    return send_from_directory(UPLOAD_FOLDER, safe_name)


# ─── App Init ─────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("[AgriVision] Initializing database...")
    init_db()
    print("[AgriVision] Starting Flask server on http://localhost:5000")
    app.run(debug=False, host="0.0.0.0", port=5000)
