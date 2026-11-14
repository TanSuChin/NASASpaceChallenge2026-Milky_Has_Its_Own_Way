"""
SQLite Local Persistence Layer and Synthetic Demonstration Data Seeder for TARSCARE AI.
Stores historical telemetry, user-entered measurements, psychological self-assessments,
store-and-forward Earth synchronization queues, and configurable hazard thresholds.
"""

from __future__ import annotations
import json
import os
import sqlite3
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from models import (
    AstronautBaseline,
    RadiationConfigLimits,
    EnvironmentalConfigLimits,
    DataProvenance,
    MissionPhase,
    RiskLevel,
)

DB_PATH = os.path.join(os.path.dirname(__file__), "tarscare_local.db")


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_conn()
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS telemetry_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            mission_day INTEGER NOT NULL,
            mission_phase TEXT NOT NULL,
            gravity_g REAL NOT NULL,
            provenance TEXT NOT NULL,
            absorbed_dose_mgy REAL NOT NULL,
            absorbed_dose_rate_mgy_hr REAL NOT NULL,
            equivalent_dose_msv REAL NOT NULL,
            equivalent_dose_rate_msv_day REAL NOT NULL,
            cumulative_effective_dose_msv REAL NOT NULL,
            radiation_source TEXT NOT NULL,
            radiation_event_type TEXT NOT NULL,
            mood_score REAL NOT NULL,
            stress_level REAL NOT NULL,
            emotional_wellbeing REAL NOT NULL,
            fatigue_level REAL NOT NULL,
            workload_score REAL NOT NULL,
            social_interaction_score REAL NOT NULL,
            sleep_duration_hrs REAL NOT NULL,
            sleep_quality_pct REAL NOT NULL,
            sleep_schedule_window TEXT NOT NULL,
            sleep_irregularities INTEGER NOT NULL,
            feeling_isolated INTEGER NOT NULL,
            concentration_difficulty INTEGER NOT NULL,
            motivation_level REAL NOT NULL,
            heart_rate_bpm REAL NOT NULL,
            systolic_bp_mmhg REAL NOT NULL,
            diastolic_bp_mmhg REAL NOT NULL,
            spo2_pct REAL NOT NULL,
            respiratory_rate_bpm REAL NOT NULL DEFAULT 16.0,
            body_temp_c REAL NOT NULL,
            dizziness_severity INTEGER NOT NULL,
            faintness_presyncope INTEGER NOT NULL,
            physical_activity_mins REAL NOT NULL,
            exercise_performance_pct REAL NOT NULL,
            muscle_strength_idx REAL NOT NULL,
            exercise_adherence_pct REAL NOT NULL,
            musculoskeletal_discomfort INTEGER NOT NULL,
            balance_score REAL NOT NULL,
            coordination_score REAL NOT NULL,
            spatial_disorientation INTEGER NOT NULL,
            visual_disturbance_sans INTEGER NOT NULL,
            cabin_temp_c REAL NOT NULL,
            cabin_pressure_kpa REAL NOT NULL,
            oxygen_pct REAL NOT NULL,
            co2_mmhg REAL NOT NULL,
            co2_ppm REAL NOT NULL,
            humidity_pct REAL NOT NULL,
            air_quality_index REAL NOT NULL,
            env_warning_event TEXT NOT NULL,
            respiratory_symptoms TEXT NOT NULL,
            infection_symptoms TEXT NOT NULL,
            hygiene_adherence_pct REAL NOT NULL,
            notes TEXT NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS psych_questionnaires (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            mission_day INTEGER NOT NULL,
            emotional_condition_rating INTEGER NOT NULL,
            psychological_stress_rating INTEGER NOT NULL,
            motivation_rating INTEGER NOT NULL,
            fatigue_rating INTEGER NOT NULL,
            sleep_difficulty_rating INTEGER NOT NULL,
            isolation_feeling_rating INTEGER NOT NULL,
            concentration_workload_rating INTEGER NOT NULL,
            journal_reflection TEXT NOT NULL,
            provenance TEXT NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS store_forward_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_uid TEXT NOT NULL,
            created_at TEXT NOT NULL,
            synced_at TEXT,
            mission_day INTEGER NOT NULL,
            title TEXT NOT NULL,
            summary TEXT NOT NULL,
            risk_level TEXT NOT NULL,
            hazard_triggers TEXT NOT NULL,
            transmission_status TEXT NOT NULL,
            provenance TEXT NOT NULL,
            payload_json TEXT NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS system_state (
            key TEXT PRIMARY KEY,
            value_json TEXT NOT NULL
        )
        """
    )

    conn.commit()

    # Schema migration guard for existing tarscare_local.db
    cur.execute("PRAGMA table_info(telemetry_records)")
    cols = {r["name"] for r in cur.fetchall()}
    if "respiratory_rate_bpm" not in cols:
        cur.execute(
            "ALTER TABLE telemetry_records ADD COLUMN respiratory_rate_bpm REAL NOT NULL DEFAULT 16.0"
        )
        conn.commit()

    # Seed if empty, and backfill Sols 155-170 if upgrading from 14-Sol DB
    cur.execute("SELECT COUNT(*) as cnt FROM telemetry_records")
    row = cur.fetchone()
    if row["cnt"] == 0:
        seed_synthetic_data(conn)
    _ensure_30_sol_synthetic_history(conn)

    # Upgrade legacy demo astronaut name in existing local DB if present
    cur.execute("SELECT value_json FROM system_state WHERE key = 'baseline'")
    brow = cur.fetchone()
    if brow and "Elena Vance-Chen" in brow["value_json"]:
        bdata = json.loads(brow["value_json"])
        bdata["name"] = "SuChai"
        bdata["astronaut_id"] = "ARES-IV-SUCHAI"
        cur.execute(
            "INSERT OR REPLACE INTO system_state (key, value_json) VALUES ('baseline', ?)",
            (json.dumps(bdata),),
        )
        conn.commit()

    conn.close()


def _ensure_30_sol_synthetic_history(conn: sqlite3.Connection) -> None:
    """Guarantees 30 Sols (155-184) of synthetic history for 7/14/30-day charts without overwriting user records."""
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) as cnt FROM telemetry_records WHERE mission_day = 155")
    if cur.fetchone()["cnt"] > 0:
        return
    early_sols = [
        # day, phase, grav, abs_mgy, eq_msv, cum_msv, rad_evt, mood, stress, fatigue, work, sleep_h, sleep_q, hr, sys_bp, dia_bp, spo2, resp_rate, temp, dizz, strength, bal, co2_mmhg, humid, aqi, notes
        (155, "MICROGRAVITY_TRANSIT", 0.0, 0.43, 1.04, 135.2, "GCR_BACKGROUND", 8.2, 2.4, 2.9, 5.2, 7.4, 87.0, 58.0, 111.0, 70.0, 98.5, 15.0, 36.6, 0, 98.1, 94.0, 2.2, 46.0, 18.0, "Transit Day 155: nominal deep-space cruise; baseline cardiovascular stability."),
        (156, "MICROGRAVITY_TRANSIT", 0.0, 0.43, 1.05, 136.2, "GCR_BACKGROUND", 8.3, 2.5, 3.0, 5.3, 7.5, 88.0, 58.0, 110.0, 69.0, 98.4, 15.0, 36.6, 0, 98.0, 93.8, 2.2, 46.0, 18.0, "Transit Day 156: routine ARED lower-body loading completed."),
        (157, "MICROGRAVITY_TRANSIT", 0.0, 0.44, 1.06, 137.3, "GCR_BACKGROUND", 8.1, 2.6, 3.1, 5.4, 7.3, 86.0, 59.0, 111.0, 70.0, 98.5, 15.2, 36.6, 0, 97.9, 93.6, 2.3, 45.0, 19.0, "Transit Day 157: sleep hygiene schedule steady."),
        (158, "MICROGRAVITY_TRANSIT", 0.0, 0.44, 1.06, 138.4, "GCR_BACKGROUND", 8.0, 2.7, 3.2, 5.6, 7.2, 85.0, 59.0, 111.0, 70.0, 98.4, 15.1, 36.6, 0, 97.8, 93.5, 2.3, 45.0, 19.0, "Transit Day 158: weekly cabin swab & water quality check nominal."),
        (159, "MICROGRAVITY_TRANSIT", 0.0, 0.45, 1.07, 139.4, "GCR_BACKGROUND", 8.2, 2.5, 3.0, 5.1, 7.6, 88.0, 58.0, 110.0, 70.0, 98.5, 14.9, 36.6, 0, 97.8, 93.6, 2.2, 46.0, 18.0, "Transit Day 159: crew social conference & Earth video family exchange."),
        (160, "MICROGRAVITY_TRANSIT", 0.0, 0.44, 1.06, 140.5, "GCR_BACKGROUND", 8.1, 2.6, 3.1, 5.4, 7.4, 86.0, 59.0, 111.0, 70.0, 98.4, 15.0, 36.6, 0, 97.7, 93.4, 2.3, 45.0, 19.0, "Transit Day 160: nominal optic nerve ultrasound & tonometry check."),
        (161, "MICROGRAVITY_TRANSIT", 0.0, 0.46, 1.09, 141.6, "GCR_BACKGROUND", 7.9, 2.9, 3.3, 5.7, 7.1, 84.0, 60.0, 112.0, 71.0, 98.3, 15.3, 36.6, 0, 97.6, 93.2, 2.4, 45.0, 20.0, "Transit Day 161: ECLSS filter maintenance shift."),
        (162, "MICROGRAVITY_TRANSIT", 0.0, 0.45, 1.08, 142.7, "GCR_BACKGROUND", 8.0, 2.8, 3.2, 5.5, 7.3, 85.0, 59.0, 111.0, 70.0, 98.4, 15.1, 36.6, 0, 97.6, 93.2, 2.3, 46.0, 19.0, "Transit Day 162: nominal cardio ergometer session."),
        (163, "MICROGRAVITY_TRANSIT", 0.0, 0.44, 1.07, 143.7, "GCR_BACKGROUND", 8.1, 2.6, 3.0, 5.3, 7.5, 87.0, 58.0, 110.0, 69.0, 98.5, 15.0, 36.6, 0, 97.5, 93.1, 2.2, 46.0, 18.0, "Transit Day 163: restful sleep window achieved."),
        (164, "MICROGRAVITY_TRANSIT", 0.0, 0.45, 1.08, 144.8, "GCR_BACKGROUND", 8.0, 2.7, 3.1, 5.5, 7.4, 86.0, 59.0, 111.0, 70.0, 98.4, 15.1, 36.6, 0, 97.5, 93.0, 2.3, 45.0, 19.0, "Transit Day 164: orbital navigation course correction check."),
        (165, "MICROGRAVITY_TRANSIT", 0.0, 0.46, 1.09, 145.9, "GCR_BACKGROUND", 7.9, 2.8, 3.3, 5.6, 7.2, 85.0, 59.0, 111.0, 70.0, 98.4, 15.2, 36.6, 0, 97.4, 93.0, 2.4, 45.0, 19.0, "Transit Day 165: nominal flight physiology."),
        (166, "MICROGRAVITY_TRANSIT", 0.0, 0.45, 1.08, 147.0, "GCR_BACKGROUND", 8.0, 2.7, 3.2, 5.4, 7.4, 86.0, 59.0, 110.0, 70.0, 98.4, 15.0, 36.6, 0, 97.4, 93.1, 2.3, 46.0, 19.0, "Transit Day 166: crew cognitive reaction task baseline on target."),
        (167, "MICROGRAVITY_TRANSIT", 0.0, 0.44, 1.07, 148.1, "GCR_BACKGROUND", 8.1, 2.6, 3.1, 5.3, 7.5, 87.0, 58.0, 110.0, 70.0, 98.5, 15.0, 36.6, 0, 97.3, 93.1, 2.2, 46.0, 18.0, "Transit Day 167: off-duty recovery & music journaling."),
        (168, "MICROGRAVITY_TRANSIT", 0.0, 0.45, 1.08, 149.1, "GCR_BACKGROUND", 8.0, 2.7, 3.1, 5.4, 7.4, 86.0, 59.0, 111.0, 70.0, 98.4, 15.1, 36.6, 0, 97.3, 93.0, 2.3, 45.0, 19.0, "Transit Day 168: landing suit sizing & stowage verification."),
        (169, "MICROGRAVITY_TRANSIT", 0.0, 0.44, 1.07, 150.2, "GCR_BACKGROUND", 8.1, 2.6, 3.0, 5.4, 7.5, 87.0, 59.0, 111.0, 70.0, 98.5, 15.0, 36.6, 0, 97.2, 93.0, 2.3, 46.0, 19.0, "Transit Day 169: approach navigation simulation."),
        (170, "MICROGRAVITY_TRANSIT", 0.0, 0.44, 1.08, 151.0, "GCR_BACKGROUND", 8.1, 2.6, 3.1, 5.5, 7.5, 87.0, 59.0, 111.0, 70.0, 98.4, 15.0, 36.6, 0, 97.2, 93.0, 2.3, 46.0, 19.0, "Transit Day 170: nominal pre-insertion readiness."),
    ]
    for row in early_sols:
        (
            day, phase, grav, abs_mgy, eq_msv, cum_msv, rad_evt,
            mood, stress, fatigue, work, sleep_h, sleep_q,
            hr, sys_bp, dia_bp, spo2, resp_rate, temp, dizz, strength, bal,
            co2_mmhg, humid, aqi, notes
        ) = row
        ts = f"2026-10-{day - 139:02d}T08:00:00Z"
        cur.execute(
            """
            INSERT INTO telemetry_records (
                timestamp, mission_day, mission_phase, gravity_g, provenance,
                absorbed_dose_mgy, absorbed_dose_rate_mgy_hr, equivalent_dose_msv,
                equivalent_dose_rate_msv_day, cumulative_effective_dose_msv,
                radiation_source, radiation_event_type,
                mood_score, stress_level, emotional_wellbeing, fatigue_level,
                workload_score, social_interaction_score,
                sleep_duration_hrs, sleep_quality_pct, sleep_schedule_window,
                sleep_irregularities, feeling_isolated, concentration_difficulty, motivation_level,
                heart_rate_bpm, systolic_bp_mmhg, diastolic_bp_mmhg, spo2_pct, respiratory_rate_bpm, body_temp_c,
                dizziness_severity, faintness_presyncope,
                physical_activity_mins, exercise_performance_pct, muscle_strength_idx,
                exercise_adherence_pct, musculoskeletal_discomfort,
                balance_score, coordination_score, spatial_disorientation, visual_disturbance_sans,
                cabin_temp_c, cabin_pressure_kpa, oxygen_pct, co2_mmhg, co2_ppm,
                humidity_pct, air_quality_index, env_warning_event,
                respiratory_symptoms, infection_symptoms, hygiene_adherence_pct, notes
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?
            )
            """,
            (
                ts, day, phase, grav, DataProvenance.SYNTHETIC_DEMO.value,
                abs_mgy, round(abs_mgy / 24.0, 4), eq_msv, eq_msv, cum_msv,
                "HABITAT_TEPC_PLUS_CREW_DOSIMETER (SYNTHETIC)", rad_evt,
                mood, stress, round((mood + (10 - stress)) / 2.0, 1), fatigue,
                work, 7.8, sleep_h, sleep_q, "22:30 - 05:30 UTC-MARS",
                1, 0, 0, 8.1,
                hr, sys_bp, dia_bp, spo2, resp_rate, temp,
                dizz, 0, 110.0, 95.0, strength, 95.0, 0,
                bal, round(bal + 2.5, 1), 0, 0,
                21.5, 70.3, 21.1, co2_mmhg, round(co2_mmhg * 1315.0, 0),
                humid, aqi, "NONE", json.dumps([]), json.dumps([]), 97.0, notes,
            ),
        )
    conn.commit()


def seed_synthetic_data(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()

    # 1. Seed system_state (baseline, limits, comm state)
    baseline = AstronautBaseline()
    rad_limits = RadiationConfigLimits()
    env_limits = EnvironmentalConfigLimits()
    comm_state = {
        "earth_comm_status": "NOMINAL_DELAYED",
        "one_way_delay_minutes": 14.2,
        "distance_million_km": 255.4,
        "last_sync_timestamp": "2026-11-14T04:15:00Z",
        "offline_mode_forced": False,
        "dsn_note": "Simulated store-and-forward deep-space telemetry queue (does not implement NASA's actual Deep Space Network).",
    }

    for k, v in [
        ("baseline", baseline.model_dump()),
        ("rad_limits", rad_limits.model_dump()),
        ("env_limits", env_limits.model_dump()),
        ("comm_state", comm_state),
    ]:
        cur.execute(
            "INSERT OR REPLACE INTO system_state (key, value_json) VALUES (?, ?)",
            (k, json.dumps(v)),
        )

    # 2. Seed 14 Sols (Mission Days 171 to 184) of realistic synthetic astronaut telemetry
    # Showing transition from Microgravity Transit (Days 171-175) to Mars Surface 0.38g (Days 176-184)
    # including a minor SPE radiation warning on Day 179 and CO2/orthostatic adaptation on Day 183-184.
    synthetic_sols = [
        # (day, phase, grav, abs_mgy, eq_msv, cum_msv, rad_evt, mood, stress, fatigue, work, sleep_h, sleep_q, hr, sys_bp, dia_bp, spo2, temp, dizz, strength, bal, co2_mmhg, humid, aqi, resp, notes)
        (171, "MICROGRAVITY_TRANSIT", 0.0, 0.44, 1.08, 152.1, "GCR_BACKGROUND", 8.1, 2.6, 3.1, 5.5, 7.5, 87.0, 59.0, 111.0, 70.0, 98.4, 36.6, 0, 97.2, 93.0, 2.3, 46.0, 19.0, [], "Nominal deep-space transit cruise; routine ARED + cycle countermeasures."),
        (172, "MICROGRAVITY_TRANSIT", 0.0, 0.45, 1.10, 153.2, "GCR_BACKGROUND", 8.0, 2.8, 3.3, 5.8, 7.4, 86.0, 60.0, 112.0, 71.0, 98.3, 36.6, 0, 96.8, 92.5, 2.4, 45.0, 20.0, [], "Nominal cruise; optical coherence check stable."),
        (173, "MICROGRAVITY_TRANSIT", 0.0, 0.46, 1.12, 154.3, "GCR_BACKGROUND", 7.9, 3.0, 3.5, 6.0, 7.2, 84.0, 60.0, 110.0, 70.0, 98.5, 36.6, 0, 96.5, 92.0, 2.5, 45.0, 21.0, [], "Pre-Mars orbital insertion checklist preparation."),
        (174, "MICROGRAVITY_TRANSIT", 0.0, 0.47, 1.14, 155.5, "GCR_BACKGROUND", 7.6, 3.6, 4.0, 6.8, 6.9, 82.0, 62.0, 110.0, 69.0, 98.2, 36.7, 0, 96.0, 91.0, 2.6, 44.0, 22.0, [], "Increased workload ahead of Mars entry, descent, and landing (EDL)."),
        (175, "MICROGRAVITY_TRANSIT", 0.0, 0.48, 1.15, 156.6, "GCR_BACKGROUND", 7.5, 4.2, 4.4, 7.4, 6.6, 80.0, 64.0, 109.0, 69.0, 98.1, 36.7, 0, 95.5, 90.0, 2.7, 43.0, 23.0, [], "Final microgravity day; fluid loading protocol initiated prior to 0.38g entry."),
        (176, "MARS_SURFACE", 0.38, 0.29, 0.72, 157.3, "GCR_MARS_SHIELDED", 8.4, 3.8, 5.2, 7.5, 6.5, 78.0, 74.0, 101.0, 65.0, 97.9, 36.7, 2, 91.5, 79.0, 2.5, 42.0, 25.0, [], "Landing Sol 1 (0.38g): expected post-transit orthostatic heart rate elevation and mild vestibular ataxia."),
        (177, "MARS_SURFACE", 0.38, 0.30, 0.74, 158.1, "GCR_MARS_SHIELDED", 8.1, 3.5, 4.8, 6.8, 6.9, 81.0, 71.0, 103.0, 66.0, 98.0, 36.6, 1, 92.0, 81.0, 2.5, 42.0, 24.0, [], "Graduated 0.38g neurovestibular balance adaptation drills underway."),
        (178, "MARS_SURFACE", 0.38, 0.31, 0.76, 158.8, "GCR_MARS_SHIELDED", 7.9, 3.4, 4.3, 6.4, 7.1, 83.0, 67.0, 106.0, 68.0, 98.1, 36.6, 1, 92.8, 84.0, 2.6, 41.0, 26.0, [], "Habitat deployment nominal; cardiovascular baroreflex stabilizing."),
        (179, "MARS_SURFACE", 0.38, 1.15, 2.95, 161.8, "SPE_SOLAR_ENERGETIC_PROTON", 7.2, 4.9, 5.0, 6.2, 6.3, 76.0, 68.0, 107.0, 68.0, 97.9, 36.7, 0, 93.0, 85.0, 2.9, 40.0, 28.0, [], "Moderate Solar Particle Event (SPE) detected by orbital + habitat dosimeters; crew sheltered in water-wall core for 9 hours."),
        (180, "MARS_SURFACE", 0.38, 0.52, 1.28, 163.1, "SPE_DECAY_TAIL", 7.5, 4.0, 4.6, 6.3, 6.8, 80.0, 66.0, 108.0, 69.0, 98.0, 36.6, 0, 93.2, 86.0, 2.7, 41.0, 27.0, [], "SPE proton flux subsiding; post-storm dosimetry review completed."),
        (181, "MARS_SURFACE", 0.38, 0.33, 0.81, 163.9, "GCR_MARS_SHIELDED", 7.7, 3.6, 4.2, 6.5, 7.0, 82.0, 65.0, 108.0, 69.0, 98.1, 36.6, 0, 93.6, 87.0, 2.6, 42.0, 25.0, [], "First geological surface EVA completed; minor airlock regolith dust tracked."),
        (182, "MARS_SURFACE", 0.38, 0.34, 0.83, 164.7, "GCR_MARS_SHIELDED", 7.3, 4.3, 4.9, 7.2, 6.4, 79.0, 66.0, 107.0, 68.0, 97.8, 36.7, 0, 93.0, 86.0, 3.0, 38.0, 39.0, [], "Extended sample analysis shift; slight sleep truncation and rising cabin CO2."),
        (183, "MARS_SURFACE", 0.38, 0.58, 1.42, 166.1, "GCR_PLUS_SOLAR_FLARE", 6.8, 5.1, 5.8, 7.8, 5.9, 74.0, 71.0, 103.0, 66.0, 97.4, 36.8, 1, 91.8, 83.0, 3.3, 35.0, 52.0, ["Mild dry cough"], "Primary CDRA scrubber bed nearing saturation (CO2 3.3 mmHg); mild throat/airway dryness after airlock maintenance."),
        (184, "MARS_SURFACE", 0.38, 0.68, 1.68, 167.8, "SOLAR_PROTON_ENHANCEMENT", 6.4, 5.4, 6.2, 7.9, 5.7, 72.0, 73.0, 101.0, 65.0, 97.2, 36.8, 1, 91.2, 82.0, 3.4, 34.0, 56.0, ["Mild dry cough", "Headache (CO2 correlated)"], "Current Sol 184 telemetry: elevated solar proton flux (1.68 mSv/day), 3-sol sleep reduction (5.7 hrs), mild orthostatic HR rise (+15 bpm vs. baseline), and cabin CO2 at 3.4 mmHg."),
    ]

    for row in synthetic_sols:
        (
            day, phase, grav, abs_mgy, eq_msv, cum_msv, rad_evt,
            mood, stress, fatigue, work, sleep_h, sleep_q,
            hr, sys_bp, dia_bp, spo2, temp, dizz, strength, bal,
            co2_mmhg, humid, aqi, resp, notes
        ) = row
        ts = f"2026-11-{day - 170:02d}T08:00:00Z"
        cur.execute(
            """
            INSERT INTO telemetry_records (
                timestamp, mission_day, mission_phase, gravity_g, provenance,
                absorbed_dose_mgy, absorbed_dose_rate_mgy_hr, equivalent_dose_msv,
                equivalent_dose_rate_msv_day, cumulative_effective_dose_msv,
                radiation_source, radiation_event_type,
                mood_score, stress_level, emotional_wellbeing, fatigue_level,
                workload_score, social_interaction_score,
                sleep_duration_hrs, sleep_quality_pct, sleep_schedule_window,
                sleep_irregularities, feeling_isolated, concentration_difficulty, motivation_level,
                heart_rate_bpm, systolic_bp_mmhg, diastolic_bp_mmhg, spo2_pct, body_temp_c,
                dizziness_severity, faintness_presyncope,
                physical_activity_mins, exercise_performance_pct, muscle_strength_idx,
                exercise_adherence_pct, musculoskeletal_discomfort,
                balance_score, coordination_score, spatial_disorientation, visual_disturbance_sans,
                cabin_temp_c, cabin_pressure_kpa, oxygen_pct, co2_mmhg, co2_ppm,
                humidity_pct, air_quality_index, env_warning_event,
                respiratory_symptoms, infection_symptoms, hygiene_adherence_pct, notes
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?
            )
            """,
            (
                ts, day, phase, grav, DataProvenance.SYNTHETIC_DEMO.value,
                abs_mgy, round(abs_mgy / 24.0, 4), eq_msv, eq_msv, cum_msv,
                "HABITAT_TEPC_PLUS_CREW_DOSIMETER (SYNTHETIC)", rad_evt,
                mood, stress, round((mood + (10 - stress)) / 2.0, 1), fatigue,
                work, 7.6 if day < 182 else 6.8,
                sleep_h, sleep_q, "22:30 - 05:30 UTC-MARS",
                1 if sleep_h >= 6.5 else 3,
                1 if day >= 183 else 0,
                1 if co2_mmhg >= 3.2 else 0,
                7.9 if day < 182 else 6.9,
                hr, sys_bp, dia_bp, spo2, temp,
                dizz, 0,
                105.0 if day < 182 else 82.0,
                94.0 if day < 182 else 87.0,
                strength,
                93.0 if day < 182 else 81.0,
                1 if dizz > 0 else 0,
                bal, round(bal + 3.0, 1), 0, 0,
                21.6, 70.3, 21.1, co2_mmhg, round(co2_mmhg * 1315.0, 0),
                humid, aqi,
                "CDRA_CO2_ELEVATED" if co2_mmhg >= 3.0 else "NONE",
                json.dumps(resp), json.dumps([]), 96.0, notes
            ),
        )

    # 3. Seed psych questionnaire history
    cur.execute(
        """
        INSERT INTO psych_questionnaires (
            timestamp, mission_day, emotional_condition_rating, psychological_stress_rating,
            motivation_rating, fatigue_rating, sleep_difficulty_rating,
            isolation_feeling_rating, concentration_workload_rating,
            journal_reflection, provenance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            "2026-11-14T07:30:00Z", 184, 7, 5, 8, 6, 4, 3, 7,
            "Surface EVA workload has been intense over the last 3 Sols. Woke up twice due to warm bunk airflow; planning blue-light alignment and CDRA scrubber bed switch today.",
            DataProvenance.SYNTHETIC_DEMO.value,
        ),
    )

    # 4. Seed store-and-forward reports
    seed_reports = [
        (
            "RPT-SOL-179-SPE",
            "2026-11-09T18:20:00Z",
            "2026-11-09T19:05:00Z",
            179,
            "Sol 179 Solar Particle Event (SPE) Shelter & Dosimetry Report",
            "Equivalent dose rate peaked at 2.95 mSv/day (1.15 mGy absorbed). Crew sheltered in polyethylene/water-wall core; cumulative dose 161.8 mSv.",
            RiskLevel.WARNING.value,
            json.dumps(["Space Radiation"]),
            "SYNCHRONIZED_ACK",
            DataProvenance.SYNTHETIC_DEMO.value,
            json.dumps({"mission_day": 179, "equivalent_dose_msv": 2.95, "absorbed_dose_mgy": 1.15}),
        ),
        (
            "RPT-SOL-184-MULTI",
            "2026-11-14T08:05:00Z",
            None,
            184,
            "Sol 184 Integrated Multi-Hazard Assessment (CO2 + Sleep + Solar Flux)",
            "Warning triggers across Radiation (1.68 mSv/day), Isolation (5.7h sleep), Gravity (+15 bpm HR vs baseline in 0.38g), and Environment (CO2 3.4 mmHg). Queued for DSN link.",
            RiskLevel.WARNING.value,
            json.dumps(["Space Radiation", "Isolation and Confinement", "Gravity Fields", "Hostile and Closed Environments"]),
            "QUEUED_LOCAL_BUFFER",
            DataProvenance.SYNTHETIC_DEMO.value,
            json.dumps({"mission_day": 184, "co2_mmhg": 3.4, "sleep_duration_hrs": 5.7, "heart_rate_bpm": 73.0}),
        ),
    ]
    for rpt in seed_reports:
        cur.execute(
            """
            INSERT INTO store_forward_reports (
                report_uid, created_at, synced_at, mission_day, title, summary,
                risk_level, hazard_triggers, transmission_status, provenance, payload_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            rpt,
        )

    conn.commit()
    _ensure_30_sol_synthetic_history(conn)


def _row_to_telemetry_dict(row: sqlite3.Row) -> Dict[str, Any]:
    d = dict(row)
    d["feeling_isolated"] = bool(d["feeling_isolated"])
    d["concentration_difficulty"] = bool(d["concentration_difficulty"])
    d["faintness_presyncope"] = bool(d["faintness_presyncope"])
    d["spatial_disorientation"] = bool(d["spatial_disorientation"])
    d["visual_disturbance_sans"] = bool(d["visual_disturbance_sans"])
    d.setdefault("respiratory_rate_bpm", 16.0)
    d["respiratory_symptoms"] = json.loads(d["respiratory_symptoms"] or "[]")
    d["infection_symptoms"] = json.loads(d["infection_symptoms"] or "[]")
    return d


def fetch_all_telemetry() -> List[Dict[str, Any]]:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM telemetry_records ORDER BY mission_day ASC, id ASC")
    rows = [_row_to_telemetry_dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def fetch_system_state(key: str) -> Dict[str, Any]:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT value_json FROM system_state WHERE key = ?", (key,))
    row = cur.fetchone()
    conn.close()
    return json.loads(row["value_json"]) if row else {}


def update_system_state(key: str, value: Dict[str, Any]) -> None:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT OR REPLACE INTO system_state (key, value_json) VALUES (?, ?)",
        (key, json.dumps(value)),
    )
    conn.commit()
    conn.close()


def insert_telemetry_record(data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_conn()
    cur = conn.cursor()
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    cur.execute(
        """
        INSERT INTO telemetry_records (
            timestamp, mission_day, mission_phase, gravity_g, provenance,
            absorbed_dose_mgy, absorbed_dose_rate_mgy_hr, equivalent_dose_msv,
            equivalent_dose_rate_msv_day, cumulative_effective_dose_msv,
            radiation_source, radiation_event_type,
            mood_score, stress_level, emotional_wellbeing, fatigue_level,
            workload_score, social_interaction_score,
            sleep_duration_hrs, sleep_quality_pct, sleep_schedule_window,
            sleep_irregularities, feeling_isolated, concentration_difficulty, motivation_level,
            heart_rate_bpm, systolic_bp_mmhg, diastolic_bp_mmhg, spo2_pct, respiratory_rate_bpm, body_temp_c,
            dizziness_severity, faintness_presyncope,
            physical_activity_mins, exercise_performance_pct, muscle_strength_idx,
            exercise_adherence_pct, musculoskeletal_discomfort,
            balance_score, coordination_score, spatial_disorientation, visual_disturbance_sans,
            cabin_temp_c, cabin_pressure_kpa, oxygen_pct, co2_mmhg, co2_ppm,
            humidity_pct, air_quality_index, env_warning_event,
            respiratory_symptoms, infection_symptoms, hygiene_adherence_pct, notes
        ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?
        )
        """,
        (
            now_iso,
            data["mission_day"],
            data["mission_phase"],
            data["gravity_g"],
            data["provenance"],
            data["absorbed_dose_mgy"],
            data["absorbed_dose_rate_mgy_hr"],
            data["equivalent_dose_msv"],
            data["equivalent_dose_rate_msv_day"],
            data["cumulative_effective_dose_msv"],
            data["radiation_source"],
            data["radiation_event_type"],
            data["mood_score"],
            data["stress_level"],
            data["emotional_wellbeing"],
            data["fatigue_level"],
            data["workload_score"],
            data["social_interaction_score"],
            data["sleep_duration_hrs"],
            data["sleep_quality_pct"],
            data["sleep_schedule_window"],
            data["sleep_irregularities"],
            int(bool(data["feeling_isolated"])),
            int(bool(data["concentration_difficulty"])),
            data["motivation_level"],
            data["heart_rate_bpm"],
            data["systolic_bp_mmhg"],
            data["diastolic_bp_mmhg"],
            data["spo2_pct"],
            data.get("respiratory_rate_bpm", 16.0),
            data["body_temp_c"],
            data["dizziness_severity"],
            int(bool(data["faintness_presyncope"])),
            data["physical_activity_mins"],
            data["exercise_performance_pct"],
            data["muscle_strength_idx"],
            data["exercise_adherence_pct"],
            data["musculoskeletal_discomfort"],
            data["balance_score"],
            data["coordination_score"],
            int(bool(data["spatial_disorientation"])),
            int(bool(data["visual_disturbance_sans"])),
            data["cabin_temp_c"],
            data["cabin_pressure_kpa"],
            data["oxygen_pct"],
            data["co2_mmhg"],
            data["co2_ppm"],
            data["humidity_pct"],
            data["air_quality_index"],
            data["env_warning_event"],
            json.dumps(data.get("respiratory_symptoms", [])),
            json.dumps(data.get("infection_symptoms", [])),
            data["hygiene_adherence_pct"],
            data.get("notes", ""),
        ),
    )
    new_id = cur.lastrowid
    conn.commit()
    cur.execute("SELECT * FROM telemetry_records WHERE id = ?", (new_id,))
    row = _row_to_telemetry_dict(cur.fetchone())
    conn.close()
    return row


def fetch_store_forward_reports() -> List[Dict[str, Any]]:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM store_forward_reports ORDER BY id DESC")
    items = []
    for r in cur.fetchall():
        d = dict(r)
        d["hazard_triggers"] = json.loads(d["hazard_triggers"] or "[]")
        d["payload_json"] = json.loads(d["payload_json"] or "{}")
        items.append(d)
    conn.close()
    return items


def create_store_forward_report(
    mission_day: int,
    title: str,
    summary: str,
    risk_level: str,
    hazard_triggers: List[str],
    payload: Dict[str, Any],
    provenance: str,
    comm_online: bool = False,
) -> Dict[str, Any]:
    conn = get_conn()
    cur = conn.cursor()
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    cur.execute("SELECT COUNT(*) as cnt FROM store_forward_reports")
    seq = cur.fetchone()["cnt"] + 1
    uid = f"RPT-SOL-{mission_day}-{seq:03d}"
    status = "SYNCHRONIZED_ACK" if comm_online else "QUEUED_LOCAL_BUFFER"
    synced_at = now_iso if comm_online else None

    cur.execute(
        """
        INSERT INTO store_forward_reports (
            report_uid, created_at, synced_at, mission_day, title, summary,
            risk_level, hazard_triggers, transmission_status, provenance, payload_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            uid,
            now_iso,
            synced_at,
            mission_day,
            title,
            summary,
            risk_level,
            json.dumps(hazard_triggers),
            status,
            provenance,
            json.dumps(payload),
        ),
    )
    conn.commit()
    conn.close()
    return {
        "report_uid": uid,
        "created_at": now_iso,
        "synced_at": synced_at,
        "mission_day": mission_day,
        "title": title,
        "summary": summary,
        "risk_level": risk_level,
        "hazard_triggers": hazard_triggers,
        "transmission_status": status,
        "provenance": provenance,
    }


def synchronize_queued_reports() -> Dict[str, Any]:
    conn = get_conn()
    cur = conn.cursor()
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    cur.execute(
        """
        UPDATE store_forward_reports
        SET transmission_status = 'SYNCHRONIZED_ACK', synced_at = ?
        WHERE transmission_status != 'SYNCHRONIZED_ACK'
        """,
        (now_iso,),
    )
    updated_count = cur.rowcount
    conn.commit()
    conn.close()

    comm_state = fetch_system_state("comm_state")
    comm_state["last_sync_timestamp"] = now_iso
    if comm_state.get("earth_comm_status") == "CONJUNCTION_BLACKOUT":
        comm_state["earth_comm_status"] = "NOMINAL_DELAYED"
    comm_state["offline_mode_forced"] = False
    update_system_state("comm_state", comm_state)

    return {
        "synchronized_count": updated_count,
        "synced_at": now_iso,
        "comm_state": comm_state,
    }


def fetch_psych_questionnaires() -> List[Dict[str, Any]]:
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM psych_questionnaires ORDER BY id DESC")
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def insert_psych_questionnaire(data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_conn()
    cur = conn.cursor()
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    cur.execute(
        """
        INSERT INTO psych_questionnaires (
            timestamp, mission_day, emotional_condition_rating, psychological_stress_rating,
            motivation_rating, fatigue_rating, sleep_difficulty_rating,
            isolation_feeling_rating, concentration_workload_rating,
            journal_reflection, provenance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            now_iso,
            data["mission_day"],
            data["emotional_condition_rating"],
            data["psychological_stress_rating"],
            data["motivation_rating"],
            data["fatigue_rating"],
            data["sleep_difficulty_rating"],
            data["isolation_feeling_rating"],
            data["concentration_workload_rating"],
            data.get("journal_reflection", ""),
            data.get("provenance", DataProvenance.USER_ENTERED.value),
        ),
    )
    conn.commit()
    conn.close()
    return {**data, "timestamp": now_iso}

