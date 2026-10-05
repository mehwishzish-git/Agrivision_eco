"""
AgriVision AI - Database Module
Handles SQLite schema creation and seed data.
"""

import sqlite3
import json
import os
from datetime import datetime, timedelta
import random

DB_PATH = os.path.join(os.path.dirname(__file__), "agrivision.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    c = conn.cursor()

    # Farms table
    c.execute("""
        CREATE TABLE IF NOT EXISTS farms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            location TEXT,
            total_area_ha REAL,
            owner TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            is_demo INTEGER DEFAULT 0
        )
    """)

    # Zones / fields within a farm
    c.execute("""
        CREATE TABLE IF NOT EXISTS zones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farm_id INTEGER REFERENCES farms(id),
            name TEXT NOT NULL,
            area_ha REAL,
            crop_type TEXT,
            growth_stage TEXT,
            soil_type TEXT,
            irrigation_type TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # Soil readings per zone
    c.execute("""
        CREATE TABLE IF NOT EXISTS soil_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            zone_id INTEGER REFERENCES zones(id),
            ph REAL,
            nitrogen_ppm REAL,
            phosphorus_ppm REAL,
            potassium_ppm REAL,
            moisture_pct REAL,
            organic_matter_pct REAL,
            recorded_at TEXT DEFAULT (datetime('now')),
            is_simulated INTEGER DEFAULT 0
        )
    """)

    # Weather readings
    c.execute("""
        CREATE TABLE IF NOT EXISTS weather_readings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farm_id INTEGER REFERENCES farms(id),
            temperature_c REAL,
            humidity_pct REAL,
            rainfall_mm REAL,
            wind_speed_kmh REAL,
            solar_radiation REAL,
            recorded_at TEXT DEFAULT (datetime('now')),
            is_simulated INTEGER DEFAULT 0
        )
    """)

    # Crop analysis results (from image or manual entry)
    c.execute("""
        CREATE TABLE IF NOT EXISTS crop_analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            zone_id INTEGER REFERENCES zones(id),
            image_path TEXT,
            analysis_type TEXT DEFAULT 'rule_based',
            health_score INTEGER,
            disease_detected TEXT,
            confidence_pct REAL,
            ndvi_estimate REAL,
            symptoms TEXT,
            recommendations TEXT,
            analyzed_at TEXT DEFAULT (datetime('now')),
            is_simulated INTEGER DEFAULT 0
        )
    """)

    # Farm health scores (computed)
    c.execute("""
        CREATE TABLE IF NOT EXISTS health_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farm_id INTEGER REFERENCES farms(id),
            zone_id INTEGER,
            overall_score INTEGER,
            soil_score INTEGER,
            weather_score INTEGER,
            crop_score INTEGER,
            risk_level TEXT,
            risk_factors TEXT,
            computed_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # Recommendations
    c.execute("""
        CREATE TABLE IF NOT EXISTS recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farm_id INTEGER REFERENCES farms(id),
            zone_id INTEGER,
            category TEXT,
            priority TEXT,
            title TEXT,
            description TEXT,
            action TEXT,
            estimated_impact TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            status TEXT DEFAULT 'pending'
        )
    """)

    # What-if simulations
    c.execute("""
        CREATE TABLE IF NOT EXISTS simulations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farm_id INTEGER REFERENCES farms(id),
            zone_id INTEGER,
            scenario_name TEXT,
            parameters TEXT,
            results TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # AI Assistant messages
    c.execute("""
        CREATE TABLE IF NOT EXISTS assistant_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            farm_id INTEGER REFERENCES farms(id),
            role TEXT,
            content TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)

    # Performance and stability indexes
    c.execute("CREATE INDEX IF NOT EXISTS idx_zones_farm ON zones(farm_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_soil_zone_rec ON soil_readings(zone_id, recorded_at DESC)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_weather_farm_rec ON weather_readings(farm_id, recorded_at DESC)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_crop_analyses_zone ON crop_analyses(zone_id, analyzed_at DESC)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_health_zone ON health_scores(zone_id, computed_at DESC)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_health_farm ON health_scores(farm_id, computed_at DESC)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_recs_farm ON recommendations(farm_id, status, priority)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_sim_zone ON simulations(zone_id, created_at DESC)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_assistant_farm ON assistant_messages(farm_id, created_at DESC)")

    conn.commit()

    # Seed demo data if not already seeded
    existing = c.execute("SELECT COUNT(*) FROM farms WHERE is_demo=1").fetchone()[0]
    if existing == 0:
        _seed_demo_data(conn)
    else:
        # Self-healing: fix any corrupted seed data from previous runs
        _heal_demo_data(conn)

    conn.close()


def _heal_demo_data(conn):
    c = conn.cursor()
    # If crop_analyses has symptoms looking like ndvi float (e.g. '0.71'), fix it
    c.execute("""
        UPDATE crop_analyses
        SET symptoms = 'Yellow-orange pustules on lower leaves',
            recommendations = 'Apply fungicide within 7 days; increase spacing for airflow'
        WHERE disease_detected = 'Early Rust Spotting' AND symptoms LIKE '0.%'
    """)
    c.execute("""
        UPDATE crop_analyses
        SET symptoms = 'Healthy green canopy',
            recommendations = 'Continue current management; monitor weekly'
        WHERE disease_detected = 'None Detected' AND symptoms LIKE '0.%' AND health_score = 85
    """)
    c.execute("""
        UPDATE crop_analyses
        SET symptoms = 'White powdery deposits on leaves; wilting tips',
            recommendations = 'Reduce overhead watering; consider sulfur-based treatment'
        WHERE disease_detected = 'Powdery Mildew Suspected' AND symptoms LIKE '0.%'
    """)
    c.execute("""
        UPDATE crop_analyses
        SET symptoms = 'Uniform green growth, healthy root zone',
            recommendations = 'Optimal. Schedule nutrient top-dress in 10 days'
        WHERE disease_detected = 'None Detected' AND symptoms LIKE '0.%' AND health_score = 90
    """)
    conn.commit()


def _seed_demo_data(conn):
    c = conn.cursor()
    now = datetime.now()

    # Demo Farm
    c.execute("""
        INSERT INTO farms (name, location, total_area_ha, owner, is_demo)
        VALUES (?, ?, ?, ?, 1)
    """, ("Green Valley Demo Farm", "Maharashtra, India", 45.5, "Demo Farmer"))
    farm_id = c.lastrowid

    # Zones
    zones_data = [
        ("North Field - Wheat", 12.0, "Wheat", "Heading", "Loamy", "Drip"),
        ("South Field - Rice", 15.5, "Rice", "Tillering", "Clayey", "Flood"),
        ("East Orchard - Mango", 8.0, "Mango", "Flowering", "Sandy Loam", "Sprinkler"),
        ("West Plot - Vegetables", 10.0, "Mixed Vegetables", "Seedling", "Silt Loam", "Drip"),
    ]
    zone_ids = []
    for z in zones_data:
        c.execute("""
            INSERT INTO zones (farm_id, name, area_ha, crop_type, growth_stage, soil_type, irrigation_type)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (farm_id, *z))
        zone_ids.append(c.lastrowid)

    # Soil readings - last 14 days per zone
    soil_profiles = [
        (6.8, 180, 45, 220, 62, 2.8),   # Wheat - good
        (7.2, 140, 35, 180, 78, 2.1),   # Rice - slightly alkaline
        (6.5, 95, 28, 160, 45, 3.2),    # Mango - low N
        (6.9, 210, 52, 240, 55, 3.8),   # Vegetables - optimal
    ]
    for i, zid in enumerate(zone_ids):
        base = soil_profiles[i]
        for d in range(14):
            ts = (now - timedelta(days=13 - d)).strftime("%Y-%m-%d %H:%M:%S")
            noise = lambda v, r: round(v + random.uniform(-r, r), 2)
            c.execute("""
                INSERT INTO soil_readings
                (zone_id, ph, nitrogen_ppm, phosphorus_ppm, potassium_ppm, moisture_pct, organic_matter_pct, recorded_at, is_simulated)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            """, (zid, noise(base[0], 0.15), noise(base[1], 10),
                  noise(base[2], 3), noise(base[3], 15),
                  noise(base[4], 4), noise(base[5], 0.2), ts))

    # Weather readings - last 14 days
    for d in range(14):
        ts = (now - timedelta(days=13 - d)).strftime("%Y-%m-%d %H:%M:%S")
        temp = round(28 + 6 * (d / 13) + random.uniform(-2, 2), 1)
        hum = round(65 - 8 * (d / 13) + random.uniform(-5, 5), 1)
        rain = round(max(0, 8 - d * 0.5 + random.uniform(-2, 2)), 1)
        wind = round(12 + random.uniform(-4, 4), 1)
        solar = round(18 + random.uniform(-3, 3), 1)
        c.execute("""
            INSERT INTO weather_readings
            (farm_id, temperature_c, humidity_pct, rainfall_mm, wind_speed_kmh, solar_radiation, recorded_at, is_simulated)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        """, (farm_id, temp, hum, rain, wind, solar, ts))

    # Crop analyses (simulated, one per zone)
    analyses = [
        (zone_ids[0], 78, "Early Rust Spotting", 52.0, 0.71, "Yellow-orange pustules on lower leaves", "Apply fungicide within 7 days; increase spacing for airflow"),
        (zone_ids[1], 85, "None Detected", 88.0, 0.76, "Healthy green canopy", "Continue current management; monitor weekly"),
        (zone_ids[2], 62, "Powdery Mildew Suspected", 44.0, 0.58, "White powdery deposits on leaves; wilting tips", "Reduce overhead watering; consider sulfur-based treatment"),
        (zone_ids[3], 90, "None Detected", 92.0, 0.82, "Uniform green growth, healthy root zone", "Optimal. Schedule nutrient top-dress in 10 days"),
    ]
    for a in analyses:
        c.execute("""
            INSERT INTO crop_analyses
            (zone_id, analysis_type, health_score, disease_detected, confidence_pct, ndvi_estimate, symptoms, recommendations, is_simulated)
            VALUES (?, 'demo_rule_based', ?, ?, ?, ?, ?, ?, 1)
        """, (a[0], a[1], a[2], a[3], a[4], a[5], a[6]))

    # Health scores
    health_data = [
        (farm_id, zone_ids[0], 74, 78, 72, 78, "Medium", json.dumps(["Rust risk elevated", "Suboptimal humidity"])),
        (farm_id, zone_ids[1], 82, 70, 80, 85, "Low", json.dumps(["Alkaline pH borderline"])),
        (farm_id, zone_ids[2], 63, 65, 75, 62, "High", json.dumps(["Mildew risk", "Low nitrogen", "Water stress"])),
        (farm_id, zone_ids[3], 88, 90, 85, 90, "Low", json.dumps(["All parameters within range"])),
    ]
    for h in health_data:
        c.execute("""
            INSERT INTO health_scores
            (farm_id, zone_id, overall_score, soil_score, weather_score, crop_score, risk_level, risk_factors)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, h)

    # Recommendations
    recs = [
        (farm_id, zone_ids[0], "Disease", "High", "Apply Fungicide - Wheat Rust",
         "Early rust spotting detected in North Field. Risk of spread is high.",
         "Apply copper-based fungicide at manufacturer-recommended rates. Consult an agronomist for exact dosage.",
         "Prevent up to 30% yield loss"),
        (farm_id, zone_ids[0], "Irrigation", "Medium", "Optimize Wheat Irrigation",
         "Soil moisture at 62% is below optimal 70-80% for heading stage.",
         "Increase irrigation frequency by 20%. Run drip system for 30 extra minutes per session.",
         "Improve grain fill, +8% yield"),
        (farm_id, zone_ids[1], "Soil", "Medium", "pH Correction - Rice Field",
         "Soil pH 7.2 is slightly above optimal for rice (6.0–7.0).",
         "Apply agricultural sulfur or ferrous sulfate to lower pH. Test again in 3 weeks.",
         "Improve nutrient availability"),
        (farm_id, zone_ids[2], "Disease", "High", "Monitor Mango for Powdery Mildew",
         "Powdery mildew symptoms detected. Confidence is moderate - verify in field.",
         "Reduce overhead irrigation. Improve canopy airflow. Consider sulfur-based spray after agronomist consultation.",
         "Protect flowering, prevent 25% yield loss"),
        (farm_id, zone_ids[2], "Nutrition", "High", "Nitrogen Boost - Mango Orchard",
         "Nitrogen at 95 ppm is below optimal (120-200 ppm) for flowering mangoes.",
         "Apply slow-release nitrogen fertilizer. Fertigation recommended via sprinkler system.",
         "+15% fruit set improvement"),
        (farm_id, zone_ids[3], "Nutrition", "Low", "Scheduled Nutrient Top-Dress",
         "Vegetable field is in excellent condition. Proactive top-dress recommended in 10 days.",
         "Apply balanced NPK as per soil test ratios to sustain optimal growth.",
         "Maintain current yield trajectory"),
    ]
    for r in recs:
        c.execute("""
            INSERT INTO recommendations
            (farm_id, zone_id, category, priority, title, description, action, estimated_impact)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, r)

    conn.commit()
    print("[DB] Demo data seeded successfully.")
