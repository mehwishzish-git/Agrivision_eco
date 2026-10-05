"""
AgriVision AI - Rule-Based AI/ML Engine
Provides demo-quality analysis for crop health, disease detection,
risk assessment, and recommendations. Clearly labeled as rule-based/demo.
"""

import math
import json
import random
from datetime import datetime


def safe_num(d, key, default):
    """Safely extract a float/int number from a dictionary, handling None and type errors."""
    if not isinstance(d, dict):
        return default
    val = d.get(key)
    if val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


# ─── Farm Health Score ──────────────────────────────────────────────────────

def compute_health_score(soil, weather, crop_analysis):
    """
    Compute a 0-100 farm health score from soil, weather, and crop inputs.
    Returns dict with subscores and risk level.
    NOTE: This is a rule-based demo model, not a scientifically validated model.
    """

    # Soil score (0-100)
    soil_score = 100
    if soil:
        ph = safe_num(soil, "ph", 7.0)
        n = safe_num(soil, "nitrogen_ppm", 150)
        p = safe_num(soil, "phosphorus_ppm", 40)
        k = safe_num(soil, "potassium_ppm", 200)
        moisture = safe_num(soil, "moisture_pct", 60)
        om = safe_num(soil, "organic_matter_pct", 3.0)

        # pH penalty (optimal 6.0-7.0)
        if 6.0 <= ph <= 7.0:
            ph_score = 100
        elif ph < 5.5 or ph > 7.5:
            ph_score = 50
        else:
            ph_score = 75

        # Nitrogen (optimal 120-250 ppm)
        n_score = min(100, max(30, int(n / 2.5)))

        # Moisture (optimal 60-80%)
        if 60 <= moisture <= 80:
            m_score = 100
        elif moisture < 40 or moisture > 90:
            m_score = 40
        else:
            m_score = 70

        soil_score = int((ph_score * 0.3 + n_score * 0.35 + m_score * 0.35))
        soil_score = max(0, min(100, soil_score))

    # Weather score (0-100)
    weather_score = 75  # default
    if weather:
        temp = safe_num(weather, "temperature_c", 25)
        hum = safe_num(weather, "humidity_pct", 60)
        rain = safe_num(weather, "rainfall_mm", 5)

        # Temperature (optimal 20-32°C)
        if 20 <= temp <= 32:
            t_score = 100
        elif temp > 40 or temp < 10:
            t_score = 30
        else:
            t_score = 65

        # Humidity (optimal 50-75%)
        if 50 <= hum <= 75:
            h_score = 100
        elif hum > 90 or hum < 30:
            h_score = 40
        else:
            h_score = 70

        weather_score = int((t_score * 0.6 + h_score * 0.4))
        weather_score = max(0, min(100, weather_score))

    # Crop score (from analysis)
    crop_score = 75
    if crop_analysis:
        crop_score = int(safe_num(crop_analysis, "health_score", 75))
        crop_score = max(0, min(100, crop_score))

    # Overall weighted score
    overall = int(soil_score * 0.35 + weather_score * 0.25 + crop_score * 0.40)
    overall = max(0, min(100, overall))

    # Risk level
    if overall >= 80:
        risk_level = "Low"
    elif overall >= 65:
        risk_level = "Medium"
    elif overall >= 45:
        risk_level = "High"
    else:
        risk_level = "Critical"

    risk_factors = []
    if soil_score < 60:
        risk_factors.append("Poor soil nutrient levels")
    if weather_score < 60:
        risk_factors.append("Adverse weather conditions")
    if crop_score < 60:
        risk_factors.append("Crop health issues detected")
    if soil and safe_num(soil, "ph", 7.0) > 7.5:
        risk_factors.append("Alkaline soil pH reducing nutrient uptake")
    if soil and safe_num(soil, "nitrogen_ppm", 150) < 100:
        risk_factors.append("Low nitrogen – growth may be stunted")
    if weather and safe_num(weather, "temperature_c", 25) > 38:
        risk_factors.append("Heat stress risk for crops")
    if not risk_factors:
        risk_factors.append("All parameters within acceptable range")

    return {
        "overall_score": overall,
        "soil_score": soil_score,
        "weather_score": weather_score,
        "crop_score": crop_score,
        "risk_level": risk_level,
        "risk_factors": risk_factors,
        "model_type": "rule_based_demo",
        "disclaimer": "Scores are computed by a rule-based demo model. Not scientifically validated."
    }


# ─── Image Analysis (Rule-Based Demo) ────────────────────────────────────────

def analyze_crop_image(image_path, crop_type="Unknown", zone_context=None):
    """
    Demo rule-based image analysis. In production, replace with a real CNN model.
    Returns analysis dict with clear demo labeling.
    """

    # Simulate image-based metrics (demo)
    # Real implementation would run a model inference here
    demo_scenarios = [
        {
            "health_score": 85,
            "disease_detected": "None Detected",
            "confidence_pct": 82.0,
            "ndvi_estimate": 0.74,
            "symptoms": "Healthy green canopy with uniform color distribution. No visible lesions or discoloration.",
            "recommendations": "Crop appears healthy. Continue current management practices. Schedule next monitoring in 7 days."
        },
        {
            "health_score": 68,
            "disease_detected": "Possible Leaf Blight",
            "confidence_pct": 54.0,
            "ndvi_estimate": 0.61,
            "symptoms": "Brown edges detected on some leaves. Irregular dark patches visible. Could indicate early blight or environmental stress.",
            "recommendations": "Confidence is moderate. Field inspection recommended before treatment. Ensure adequate drainage. Monitor for spread."
        },
        {
            "health_score": 72,
            "disease_detected": "Nutrient Deficiency Suspected",
            "confidence_pct": 48.0,
            "ndvi_estimate": 0.65,
            "symptoms": "Yellowing between leaf veins (possible iron or magnesium deficiency). Lower leaves most affected.",
            "recommendations": "Conduct soil test to confirm deficiency. Consider foliar micronutrient spray after agronomist consultation."
        },
        {
            "health_score": 55,
            "disease_detected": "Fungal Infection Suspected",
            "confidence_pct": 61.0,
            "ndvi_estimate": 0.52,
            "symptoms": "White powdery coating on upper leaf surfaces. Affects approximately 30% of visible canopy.",
            "recommendations": "Suspected powdery mildew. Reduce humidity, improve airflow. Consult agronomist before applying any treatment."
        }
    ]

    # Pick scenario based on image hash (deterministic per image)
    try:
        with open(image_path, "rb") as f:
            data = f.read(1024)
        idx = sum(data[:10]) % len(demo_scenarios)
    except Exception:
        idx = 0

    result = demo_scenarios[idx].copy()
    result["crop_type"] = crop_type
    result["analysis_type"] = "demo_rule_based"
    result["disclaimer"] = (
        "⚠️ DEMO ANALYSIS: This is a rule-based simulation, not a real AI model. "
        "Results should NOT be used for actual agricultural decisions without field verification."
    )
    return result


# ─── Recommendations Engine ───────────────────────────────────────────────────

def generate_recommendations(farm_id, zone_id, soil, weather, health_score_data, crop_type="Unknown"):
    """
    Generate actionable recommendations from current farm data.
    Rule-based engine – clearly labeled as such.
    """
    recs = []
    score_data = health_score_data or {}

    if soil:
        ph = soil.get("ph", 7.0)
        n = soil.get("nitrogen_ppm", 150)
        p = soil.get("phosphorus_ppm", 40)
        k = soil.get("potassium_ppm", 200)
        moisture = soil.get("moisture_pct", 60)

        if ph < 5.8:
            recs.append({
                "category": "Soil",
                "priority": "High",
                "title": "Correct Acidic Soil pH",
                "description": f"Soil pH {ph} is below optimal range (6.0–7.0) for most crops. Nutrient availability is reduced.",
                "action": "Apply agricultural lime as per soil test recommendation. Re-test after 4 weeks.",
                "estimated_impact": "Improve nutrient uptake by 20-30%"
            })
        elif ph > 7.5:
            recs.append({
                "category": "Soil",
                "priority": "Medium",
                "title": "Reduce Alkaline pH",
                "description": f"Soil pH {ph} is above optimal. Iron and manganese may be deficient.",
                "action": "Apply elemental sulfur or acidifying fertilizers. Consult agronomist for rates.",
                "estimated_impact": "Improve micronutrient availability"
            })

        if n < 100:
            recs.append({
                "category": "Nutrition",
                "priority": "High",
                "title": f"Low Nitrogen – {crop_type}",
                "description": f"Nitrogen at {n} ppm is below optimal (120–250 ppm). Growth and yield may be impacted.",
                "action": "Apply nitrogen-rich fertilizer. Urea or ammonium sulfate recommended. Consult agronomist for dosage.",
                "estimated_impact": "Yield improvement of 10-20%"
            })
        elif n > 300:
            recs.append({
                "category": "Nutrition",
                "priority": "Low",
                "title": "Excess Nitrogen Detected",
                "description": f"Nitrogen at {n} ppm is elevated. Risk of lodging and pest attraction.",
                "action": "Reduce nitrogen application rates. Monitor crop for excessive vegetative growth.",
                "estimated_impact": "Reduce input costs, improve quality"
            })

        if moisture < 45:
            recs.append({
                "category": "Irrigation",
                "priority": "High",
                "title": "Water Stress Alert",
                "description": f"Soil moisture at {moisture}% is critically low. Immediate irrigation required.",
                "action": "Irrigate immediately. Ensure root zone receives at least 25mm of water.",
                "estimated_impact": "Prevent yield loss of 15-40%"
            })
        elif moisture > 85:
            recs.append({
                "category": "Irrigation",
                "priority": "Medium",
                "title": "Waterlogging Risk",
                "description": f"Soil moisture at {moisture}% is excessive. Root health may be affected.",
                "action": "Pause irrigation. Check drainage channels. Allow soil to dry to 70-75% before resuming.",
                "estimated_impact": "Prevent root rot and disease"
            })

    if weather:
        temp = weather.get("temperature_c", 25)
        hum = weather.get("humidity_pct", 60)

        if temp > 38:
            recs.append({
                "category": "Weather",
                "priority": "High",
                "title": "Heat Stress Risk",
                "description": f"Temperature {temp}°C exceeds stress threshold for most crops (>38°C).",
                "action": "Increase irrigation frequency. Apply mulch to reduce soil temperature. Avoid midday field operations.",
                "estimated_impact": "Reduce heat-related yield loss"
            })

        if hum > 85:
            recs.append({
                "category": "Disease",
                "priority": "Medium",
                "title": "High Humidity – Disease Risk",
                "description": f"Humidity at {hum}% creates favorable conditions for fungal diseases.",
                "action": "Increase canopy airflow. Monitor crops closely for disease symptoms. Preventive spray after agronomist consultation.",
                "estimated_impact": "Reduce fungal disease incidence"
            })

    risk = score_data.get("risk_level", "Low")
    if risk in ("High", "Critical") and not recs:
        recs.append({
            "category": "General",
            "priority": "High",
            "title": "Farm Health Review Required",
            "description": "Overall farm health score indicates elevated risk. Multiple factors may be contributing.",
            "action": "Conduct comprehensive field inspection. Consider consulting a local agronomist.",
            "estimated_impact": "Identify and address root causes"
        })

    if not recs:
        recs.append({
            "category": "General",
            "priority": "Low",
            "title": "Farm Health is Good",
            "description": "All monitored parameters are within acceptable ranges.",
            "action": "Continue current management practices. Schedule next routine check-up in 7 days.",
            "estimated_impact": "Maintain current yield trajectory"
        })

    return recs


# ─── What-If Simulation ───────────────────────────────────────────────────────

def run_simulation(zone_data, soil_baseline, weather_baseline, scenario_params):
    """
    Run a what-if scenario simulation.
    Clearly labeled as estimates, not predictions.
    """

    results = {}
    crop_type = zone_data.get("crop_type", "Unknown")
    base_health = scenario_params.get("base_health_score", 70)
    notes = []

    # Irrigation change
    irr_change = scenario_params.get("irrigation_change_pct", 0)
    moisture_delta = irr_change * 0.3
    new_moisture = (soil_baseline.get("moisture_pct", 60) if soil_baseline else 60) + moisture_delta
    new_moisture = max(10, min(100, new_moisture))

    irr_impact = 0
    if 60 <= new_moisture <= 80:
        irr_impact = 5
        notes.append("Optimal moisture achieved")
    elif new_moisture < 40:
        irr_impact = -15
        notes.append("Water stress likely")
    elif new_moisture > 90:
        irr_impact = -10
        notes.append("Waterlogging risk")

    # Fertilizer change
    fert_change = scenario_params.get("fertilizer_change_pct", 0)
    n_base = (soil_baseline.get("nitrogen_ppm", 150) if soil_baseline else 150)
    new_n = n_base * (1 + fert_change / 100)
    fert_impact = 0
    if 120 <= new_n <= 280:
        fert_impact = 8
        notes.append("Nitrogen in optimal range")
    elif new_n < 80:
        fert_impact = -12
        notes.append("Severe nitrogen deficiency projected")
    elif new_n > 350:
        fert_impact = -5
        notes.append("Excess nitrogen risk")

    # Temperature shift
    temp_shift = scenario_params.get("temperature_shift_c", 0)
    base_temp = (weather_baseline.get("temperature_c", 25) if weather_baseline else 25)
    new_temp = base_temp + temp_shift
    temp_impact = 0
    if 20 <= new_temp <= 32:
        temp_impact = 3
    elif new_temp > 40 or new_temp < 8:
        temp_impact = -20
        notes.append("Extreme temperature – severe stress")
    elif new_temp > 35:
        temp_impact = -8
        notes.append("Heat stress possible")

    # Disease treatment
    treatment = scenario_params.get("disease_treatment", False)
    treatment_impact = 0
    if treatment:
        treatment_impact = 10
        notes.append("Disease treatment applied – assumes effective intervention")

    total_impact = irr_impact + fert_impact + temp_impact + treatment_impact
    projected_health = min(100, max(0, base_health + total_impact))

    # Yield estimate (simple linear model)
    yield_change_pct = (projected_health - base_health) / base_health * 100 if base_health > 0 else 0

    return {
        "scenario_name": scenario_params.get("scenario_name", "Custom Scenario"),
        "crop_type": crop_type,
        "baseline_health": base_health,
        "projected_health": round(projected_health, 1),
        "health_change": round(projected_health - base_health, 1),
        "projected_moisture": round(new_moisture, 1),
        "projected_nitrogen": round(new_n, 1),
        "projected_temperature": round(new_temp, 1),
        "yield_change_pct": round(yield_change_pct, 1),
        "impact_breakdown": {
            "irrigation": irr_impact,
            "fertilizer": fert_impact,
            "temperature": temp_impact,
            "treatment": treatment_impact
        },
        "notes": notes,
        "disclaimer": "⚠️ SIMULATION ESTIMATE: These projections are based on simplified rules and are for planning purposes only. They are not predictions of actual outcomes.",
        "model_type": "rule_based_simulation"
    }


# ─── AI Assistant ─────────────────────────────────────────────────────────────

def generate_assistant_response(user_message, farm_context):
    """
    Rule-based AI assistant that answers questions using actual farm data.
    Does NOT invent values – all answers reference real DB data passed in context.
    """
    msg = user_message.lower().strip()
    farm = farm_context.get("farm", {})
    zones = farm_context.get("zones", [])
    latest_soil = farm_context.get("latest_soil", {})
    latest_weather = farm_context.get("latest_weather", {})
    health_scores = farm_context.get("health_scores", [])
    recommendations = farm_context.get("recommendations", [])

    farm_name = farm.get("name", "your farm")

    # Health score query
    if any(w in msg for w in ["health", "score", "overall"]):
        if health_scores:
            zone_map = {z.get("id"): z.get("name", "Zone") for z in zones if isinstance(z, dict)}
            scores = [h.get("overall_score", 0) for h in health_scores]
            avg = round(sum(scores) / len(scores)) if scores else 0
            best_h = max(health_scores, key=lambda h: h.get("overall_score", 0))
            worst_h = min(health_scores, key=lambda h: h.get("overall_score", 0))
            best_name = zone_map.get(best_h.get("zone_id"), "Zone")
            worst_name = zone_map.get(worst_h.get("zone_id"), "Zone")
            critical = [zone_map.get(h.get("zone_id"), "Zone") for h in health_scores if h.get("overall_score", 100) < 65]
            resp = f"**Farm Health Overview for {farm_name}:**\n\n"
            resp += f"- **Average Health Score:** {avg}/100\n"
            resp += f"- **Best Zone:** {best_name} ({best_h.get('overall_score', 0)}/100)\n"
            resp += f"- **Weakest Zone:** {worst_name} ({worst_h.get('overall_score', 0)}/100)\n"
            if critical:
                resp += f"\n⚠️ Zones needing attention: **{', '.join(critical)}**"
            return resp
        return "I don't have health score data available yet. Please run an analysis first."

    # Weather query
    if any(w in msg for w in ["weather", "temperature", "rain", "humidity", "wind"]):
        if latest_weather:
            w = latest_weather
            return (
                f"**Latest Weather Data (Simulated Demo):**\n\n"
                f"- 🌡️ Temperature: **{w.get('temperature_c', 'N/A')}°C**\n"
                f"- 💧 Humidity: **{w.get('humidity_pct', 'N/A')}%**\n"
                f"- 🌧️ Rainfall: **{w.get('rainfall_mm', 'N/A')} mm**\n"
                f"- 💨 Wind Speed: **{w.get('wind_speed_kmh', 'N/A')} km/h**\n"
                f"- ☀️ Solar Radiation: **{w.get('solar_radiation', 'N/A')} MJ/m²**\n\n"
                f"*Data is simulated for demo purposes.*"
            )
        return "No weather data available. Please add weather readings for your farm."

    # Soil query
    if any(w in msg for w in ["soil", "nitrogen", "ph", "phosphorus", "potassium", "moisture", "nutrient"]):
        if latest_soil:
            s = latest_soil
            return (
                f"**Latest Soil Readings (Demo Data):**\n\n"
                f"- 🧪 pH: **{s.get('ph', 'N/A')}**\n"
                f"- 🌿 Nitrogen: **{s.get('nitrogen_ppm', 'N/A')} ppm**\n"
                f"- 📊 Phosphorus: **{s.get('phosphorus_ppm', 'N/A')} ppm**\n"
                f"- 🔬 Potassium: **{s.get('potassium_ppm', 'N/A')} ppm**\n"
                f"- 💧 Moisture: **{s.get('moisture_pct', 'N/A')}%**\n"
                f"- 🌱 Organic Matter: **{s.get('organic_matter_pct', 'N/A')}%**\n\n"
                f"*Simulated demo data. Field verification recommended.*"
            )
        return "No soil data available. Please add soil readings for a zone."

    # Recommendations query
    if any(w in msg for w in ["recommend", "action", "advice", "suggest", "what should"]):
        high_prio = [r for r in recommendations if r.get("priority") == "High"]
        if high_prio:
            resp = f"**Top Priority Recommendations for {farm_name}:**\n\n"
            for i, r in enumerate(high_prio[:3], 1):
                resp += f"{i}. **{r['title']}** *(Zone: {r.get('zone_name', 'Farm-wide')})*\n"
                resp += f"   {r['description']}\n\n"
            return resp
        elif recommendations:
            r = recommendations[0]
            return f"**Current Recommendation:** {r['title']}\n\n{r['description']}\n\n**Action:** {r['action']}"
        return "No recommendations available yet. Run a farm analysis to generate recommendations."

    # Disease / crop health
    if any(w in msg for w in ["disease", "pest", "infection", "blight", "rust", "mildew", "fungal"]):
        diseased_zones = []
        for z in zones:
            if z.get("latest_analysis") and z["latest_analysis"].get("disease_detected") not in ("None Detected", None, ""):
                diseased_zones.append(f"**{z['name']}**: {z['latest_analysis']['disease_detected']} (confidence: {z['latest_analysis'].get('confidence_pct', 0):.0f}%)")
        if diseased_zones:
            resp = f"**Disease Alerts for {farm_name}:**\n\n"
            for d in diseased_zones:
                resp += f"- {d}\n"
            resp += "\n⚠️ Always verify in the field before applying any treatment. Consult a local agronomist."
            return resp
        return "No disease alerts currently detected across your zones. Continue regular monitoring."

    # Zone query
    if any(w in msg for w in ["zone", "field", "area", "crop"]):
        if zones:
            resp = f"**Zones in {farm_name}:**\n\n"
            for z in zones:
                resp += f"- **{z['name']}** | {z.get('crop_type', 'Unknown')} | {z.get('area_ha', 0)} ha | Stage: {z.get('growth_stage', 'N/A')}\n"
            return resp
        return "No zones configured for this farm yet."

    # Risk query
    if any(w in msg for w in ["risk", "alert", "danger", "critical"]):
        high_risk = [h for h in health_scores if h.get("risk_level") in ("High", "Critical")]
        if high_risk:
            resp = "**High-Risk Zones:**\n\n"
            for h in high_risk:
                zone_name = next((z["name"] for z in zones if z["id"] == h.get("zone_id")), "Unknown Zone")
                resp += f"- **{zone_name}**: Risk Level **{h['risk_level']}**, Score {h['overall_score']}/100\n"
                factors = h.get("risk_factors", [])
                if isinstance(factors, str):
                    try:
                        factors = json.loads(factors)
                    except Exception:
                        factors = [factors]
                for f in factors[:2]:
                    resp += f"  ↳ {f}\n"
            return resp
        return f"No high-risk zones currently detected for {farm_name}. All areas appear within acceptable limits."

    # Default / help
    return (
        f"Hello! I'm your AgriVision AI Assistant for **{farm_name}**.\n\n"
        "I can help you with:\n"
        "- 🌿 **Farm health scores** – 'What is my farm health score?'\n"
        "- 🌡️ **Weather conditions** – 'What is the current weather?'\n"
        "- 🧪 **Soil analysis** – 'What are my soil nutrient levels?'\n"
        "- 🦠 **Disease alerts** – 'Any disease detected?'\n"
        "- 📋 **Recommendations** – 'What actions should I take?'\n"
        "- ⚠️ **Risk areas** – 'Which zones are at risk?'\n"
        "- 🌾 **Zone overview** – 'List my farm zones'\n\n"
        "*All responses use actual data from your farm database.*"
    )
