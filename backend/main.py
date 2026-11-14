"""
FastAPI Backend for TARSCARE AI – Autonomous Astronaut Health Monitoring and Decision Support System.
Local-first architecture with SQLite persistence, Integrated 5-Hazard Assessment Engine,
Store-and-Forward Earth Telemetry Queue, and Local NASA/CSA RAG Retrieval Engine.
"""

from __future__ import annotations
import os
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from models import (
    AstronautBaseline,
    RadiationConfigLimits,
    EnvironmentalConfigLimits,
    HealthMeasurementSubmission,
    PsychQuestionnaireInput,
    CommStatusUpdate,
    StoreForwardReportCreate,
    EmergencyEscalationInput,
    RAGQueryInput,
    DataProvenance,
    MissionPhase,
    RiskLevel,
)
from database import (
    init_db,
    DB_PATH,
    fetch_all_telemetry,
    fetch_system_state,
    update_system_state,
    insert_telemetry_record,
    fetch_store_forward_reports,
    create_store_forward_report,
    synchronize_queued_reports,
    fetch_psych_questionnaires,
    insert_psych_questionnaire,
)
from assessment_engine import evaluate_integrated_health, generate_local_emergency_protocol
from knowledge_base import rag_engine, KNOWLEDGE_CORPUS
from dataclasses import asdict

app = FastAPI(
    title="TARSCARE AI Backend API",
    description="Autonomous Astronaut Health Monitoring and Decision Support System (NASA Space Apps Challenge 2026)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


def _build_full_state() -> Dict[str, Any]:
    history = fetch_all_telemetry()
    if not history:
        init_db()
        history = fetch_all_telemetry()

    latest = history[-1]
    baseline_dict = fetch_system_state("baseline")
    baseline = AstronautBaseline(**baseline_dict) if baseline_dict else AstronautBaseline()
    baseline.mission_day = latest["mission_day"]
    baseline.current_phase = MissionPhase(latest["mission_phase"])
    baseline.gravity_g = float(latest["gravity_g"])

    rad_limits_dict = fetch_system_state("rad_limits")
    rad_limits = RadiationConfigLimits(**rad_limits_dict) if rad_limits_dict else RadiationConfigLimits()

    env_limits_dict = fetch_system_state("env_limits")
    env_limits = EnvironmentalConfigLimits(**env_limits_dict) if env_limits_dict else EnvironmentalConfigLimits()

    comm_state = fetch_system_state("comm_state")
    reports = fetch_store_forward_reports()
    pending_count = sum(1 for r in reports if r["transmission_status"] != "SYNCHRONIZED_ACK")
    comm_state["pending_reports_count"] = pending_count

    assessment = evaluate_integrated_health(
        latest=latest,
        history=history,
        baseline=baseline,
        rad_limits=rad_limits,
        env_limits=env_limits,
        comm_state=comm_state,
    )

    psych_history = fetch_psych_questionnaires()

    return {
        "astronaut": baseline.model_dump(),
        "latest_telemetry": latest,
        "telemetry_history": history,
        "assessment": assessment,
        "radiation_limits": rad_limits.model_dump(),
        "environmental_limits": env_limits.model_dump(),
        "comm_state": comm_state,
        "store_forward_reports": reports,
        "psych_questionnaires": psych_history,
        "knowledge_corpus": [asdict(doc) for doc in KNOWLEDGE_CORPUS],
    }


@app.get("/api/health")
def health_check() -> Dict[str, Any]:
    return {"status": "ok", "system": "TARSCARE AI", "offline_ready": True}


@app.get("/api/state")
def get_system_state() -> Dict[str, Any]:
    return _build_full_state()


@app.post("/api/measurements")
def submit_health_measurement(submission: HealthMeasurementSubmission) -> Dict[str, Any]:
    data = submission.model_dump()
    data["mission_phase"] = submission.mission_phase.value
    data["provenance"] = submission.provenance.value
    inserted = insert_telemetry_record(data)

    state = _build_full_state()
    assessment = state["assessment"]
    comm_state = state["comm_state"]

    # Automatically queue a store-and-forward report if WARNING or CRITICAL
    if assessment["overall_status"] in ("WARNING", "CRITICAL"):
        triggered_hazards = [
            h for h, st in assessment["hazard_statuses"].items() if st in ("WARNING", "CRITICAL")
        ]
        create_store_forward_report(
            mission_day=inserted["mission_day"],
            title=f"Sol {inserted['mission_day']} Automated {assessment['overall_status']} Telemetry Package",
            summary=(
                f"Submitted measurement ({inserted['provenance']}) triggered {assessment['overall_status']} "
                f"in: {', '.join(triggered_hazards)}."
            ),
            risk_level=assessment["overall_status"],
            hazard_triggers=triggered_hazards,
            payload={
                "heart_rate_bpm": inserted["heart_rate_bpm"],
                "systolic_bp_mmhg": inserted["systolic_bp_mmhg"],
                "equivalent_dose_rate_msv_day": inserted["equivalent_dose_rate_msv_day"],
                "sleep_duration_hrs": inserted["sleep_duration_hrs"],
                "co2_mmhg": inserted["co2_mmhg"],
            },
            provenance=inserted["provenance"],
            comm_online=False,
        )
        state = _build_full_state()

    return state


@app.post("/api/scenario/{scenario_id}")
def load_demo_scenario(scenario_id: str) -> Dict[str, Any]:
    history = fetch_all_telemetry()
    last = history[-1]
    next_day = int(last["mission_day"]) + 1
    cum_dose = float(last["cumulative_effective_dose_msv"])

    scenarios: Dict[str, Dict[str, Any]] = {
        "NOMINAL_MARS_SOL": {
            "mission_day": next_day,
            "mission_phase": MissionPhase.MARS_SURFACE.value,
            "gravity_g": 0.38,
            "provenance": DataProvenance.SYNTHETIC_DEMO.value,
            "absorbed_dose_mgy": 0.31,
            "absorbed_dose_rate_mgy_hr": 0.0129,
            "equivalent_dose_msv": 0.76,
            "equivalent_dose_rate_msv_day": 0.76,
            "cumulative_effective_dose_msv": round(cum_dose + 0.76, 2),
            "radiation_source": "HABITAT_TEPC_SYNTHETIC",
            "radiation_event_type": "GCR_MARS_SHIELDED",
            "mood_score": 8.2,
            "stress_level": 2.6,
            "emotional_wellbeing": 8.3,
            "fatigue_level": 3.1,
            "workload_score": 5.8,
            "social_interaction_score": 8.4,
            "sleep_duration_hrs": 7.6,
            "sleep_quality_pct": 89.0,
            "sleep_schedule_window": "22:15 - 05:50 UTC-MARS",
            "sleep_irregularities": 0,
            "feeling_isolated": False,
            "concentration_difficulty": False,
            "motivation_level": 8.6,
            "heart_rate_bpm": 60.0,
            "systolic_bp_mmhg": 111.0,
            "diastolic_bp_mmhg": 71.0,
            "spo2_pct": 98.4,
            "body_temp_c": 36.6,
            "dizziness_severity": 0,
            "faintness_presyncope": False,
            "physical_activity_mins": 115.0,
            "exercise_performance_pct": 97.0,
            "muscle_strength_idx": 96.5,
            "exercise_adherence_pct": 96.0,
            "musculoskeletal_discomfort": 0,
            "balance_score": 92.0,
            "coordination_score": 94.0,
            "spatial_disorientation": False,
            "visual_disturbance_sans": False,
            "cabin_temp_c": 21.2,
            "cabin_pressure_kpa": 70.3,
            "oxygen_pct": 21.1,
            "co2_mmhg": 2.2,
            "co2_ppm": 2890.0,
            "humidity_pct": 46.0,
            "air_quality_index": 18.0,
            "env_warning_event": "NONE",
            "respiratory_symptoms": [],
            "infection_symptoms": [],
            "hygiene_adherence_pct": 98.0,
            "notes": "Synthetic Scenario: Nominal Martian surface Sol following CDRA scrubber regeneration and 7.6h restorative sleep.",
        },
        "SPE_SOLAR_STORM_CRITICAL": {
            "mission_day": next_day,
            "mission_phase": MissionPhase.MARS_SURFACE.value,
            "gravity_g": 0.38,
            "provenance": DataProvenance.SYNTHETIC_DEMO.value,
            "absorbed_dose_mgy": 2.85,
            "absorbed_dose_rate_mgy_hr": 0.1188,
            "equivalent_dose_msv": 6.40,
            "equivalent_dose_rate_msv_day": 6.40,
            "cumulative_effective_dose_msv": round(cum_dose + 6.40, 2),
            "radiation_source": "ORBITAL_SEP_MONITOR_PLUS_CREW_DOSIMETER (SYNTHETIC)",
            "radiation_event_type": "SPE_MAJOR_CME_PROTON_STORM",
            "mood_score": 6.5,
            "stress_level": 6.8,
            "emotional_wellbeing": 6.2,
            "fatigue_level": 6.0,
            "workload_score": 7.5,
            "social_interaction_score": 7.2,
            "sleep_duration_hrs": 5.8,
            "sleep_quality_pct": 71.0,
            "sleep_schedule_window": "23:30 - 05:20 UTC-MARS",
            "sleep_irregularities": 3,
            "feeling_isolated": False,
            "concentration_difficulty": True,
            "motivation_level": 7.4,
            "heart_rate_bpm": 76.0,
            "systolic_bp_mmhg": 106.0,
            "diastolic_bp_mmhg": 69.0,
            "spo2_pct": 97.9,
            "body_temp_c": 36.8,
            "dizziness_severity": 1,
            "faintness_presyncope": False,
            "physical_activity_mins": 60.0,
            "exercise_performance_pct": 88.0,
            "muscle_strength_idx": 92.0,
            "exercise_adherence_pct": 85.0,
            "musculoskeletal_discomfort": 1,
            "balance_score": 85.0,
            "coordination_score": 88.0,
            "spatial_disorientation": False,
            "visual_disturbance_sans": False,
            "cabin_temp_c": 22.8,
            "cabin_pressure_kpa": 70.2,
            "oxygen_pct": 21.0,
            "co2_mmhg": 3.5,
            "co2_ppm": 4600.0,
            "humidity_pct": 48.0,
            "air_quality_index": 34.0,
            "env_warning_event": "STORM_SHELTER_CO2_BUILDUP",
            "respiratory_symptoms": ["Headache (CO2 correlated)"],
            "infection_symptoms": [],
            "hygiene_adherence_pct": 94.0,
            "notes": "Synthetic Scenario: X-class solar flare & coronal mass ejection (SPE) driving 6.40 mSv/day equivalent dose rate (2.85 mGy absorbed). Crew confined inside high-mass polyethylene storm shelter.",
        },
        "GRAVITY_ORTHOSTATIC_CRITICAL": {
            "mission_day": next_day,
            "mission_phase": MissionPhase.MARS_SURFACE.value,
            "gravity_g": 0.38,
            "provenance": DataProvenance.SYNTHETIC_DEMO.value,
            "absorbed_dose_mgy": 0.35,
            "absorbed_dose_rate_mgy_hr": 0.0146,
            "equivalent_dose_msv": 0.85,
            "equivalent_dose_rate_msv_day": 0.85,
            "cumulative_effective_dose_msv": round(cum_dose + 0.85, 2),
            "radiation_source": "HABITAT_TEPC_SYNTHETIC",
            "radiation_event_type": "GCR_MARS_SHIELDED",
            "mood_score": 6.2,
            "stress_level": 6.1,
            "emotional_wellbeing": 6.4,
            "fatigue_level": 7.4,
            "workload_score": 8.1,
            "social_interaction_score": 7.0,
            "sleep_duration_hrs": 5.6,
            "sleep_quality_pct": 70.0,
            "sleep_schedule_window": "23:15 - 04:50 UTC-MARS",
            "sleep_irregularities": 3,
            "feeling_isolated": False,
            "concentration_difficulty": True,
            "motivation_level": 7.0,
            "heart_rate_bpm": 96.0,
            "systolic_bp_mmhg": 86.0,
            "diastolic_bp_mmhg": 56.0,
            "spo2_pct": 97.1,
            "body_temp_c": 36.9,
            "dizziness_severity": 3,
            "faintness_presyncope": True,
            "physical_activity_mins": 45.0,
            "exercise_performance_pct": 74.0,
            "muscle_strength_idx": 86.0,
            "exercise_adherence_pct": 72.0,
            "musculoskeletal_discomfort": 2,
            "balance_score": 68.0,
            "coordination_score": 73.0,
            "spatial_disorientation": True,
            "visual_disturbance_sans": True,
            "cabin_temp_c": 22.1,
            "cabin_pressure_kpa": 70.3,
            "oxygen_pct": 21.0,
            "co2_mmhg": 2.9,
            "co2_ppm": 3810.0,
            "humidity_pct": 41.0,
            "air_quality_index": 29.0,
            "env_warning_event": "NONE",
            "respiratory_symptoms": [],
            "infection_symptoms": [],
            "hygiene_adherence_pct": 95.0,
            "notes": "Synthetic Scenario: Acute post-EVA orthostatic intolerance & presyncope in 0.38g (HR 96 bpm vs 58 bpm baseline; BP 86/56 mmHg) with SANS visual shift and neurovestibular balance drop.",
        },
        "ENV_CO2_CONFINEMENT_WARNING": {
            "mission_day": next_day,
            "mission_phase": MissionPhase.MICROGRAVITY_TRANSIT.value,
            "gravity_g": 0.0,
            "provenance": DataProvenance.SIMULATED_ENV.value,
            "absorbed_dose_mgy": 0.49,
            "absorbed_dose_rate_mgy_hr": 0.0204,
            "equivalent_dose_msv": 1.22,
            "equivalent_dose_rate_msv_day": 1.22,
            "cumulative_effective_dose_msv": round(cum_dose + 1.22, 2),
            "radiation_source": "TRANSIT_TEPC_SYNTHETIC",
            "radiation_event_type": "GCR_BACKGROUND",
            "mood_score": 5.4,
            "stress_level": 7.2,
            "emotional_wellbeing": 5.5,
            "fatigue_level": 7.6,
            "workload_score": 8.4,
            "social_interaction_score": 5.2,
            "sleep_duration_hrs": 5.1,
            "sleep_quality_pct": 64.0,
            "sleep_schedule_window": "01:10 - 06:15 UTC-MARS",
            "sleep_irregularities": 4,
            "feeling_isolated": True,
            "concentration_difficulty": True,
            "motivation_level": 5.8,
            "heart_rate_bpm": 69.0,
            "systolic_bp_mmhg": 115.0,
            "diastolic_bp_mmhg": 75.0,
            "spo2_pct": 95.8,
            "body_temp_c": 37.5,
            "dizziness_severity": 1,
            "faintness_presyncope": False,
            "physical_activity_mins": 70.0,
            "exercise_performance_pct": 82.0,
            "muscle_strength_idx": 90.5,
            "exercise_adherence_pct": 78.0,
            "musculoskeletal_discomfort": 1,
            "balance_score": 83.0,
            "coordination_score": 84.0,
            "spatial_disorientation": False,
            "visual_disturbance_sans": True,
            "cabin_temp_c": 25.4,
            "cabin_pressure_kpa": 70.1,
            "oxygen_pct": 20.1,
            "co2_mmhg": 4.1,
            "co2_ppm": 5390.0,
            "humidity_pct": 28.0,
            "air_quality_index": 68.0,
            "env_warning_event": "CO2_SCRUBBER_SATURATION_AND_LOW_HUMIDITY",
            "respiratory_symptoms": ["Dry cough", "Mucosal irritation", "Headache (CO2 pocket)"],
            "infection_symptoms": ["Low-grade temperature elevation (37.5°C)"],
            "hygiene_adherence_pct": 91.0,
            "notes": "Simulated Environment Scenario: Stagnant microgravity CO2 pocket (4.1 mmHg / 5390 ppm), low cabin humidity (28%), sleep truncation (5.1 hrs), isolation strain, and mucosal irritation.",
        },
    }

    if scenario_id not in scenarios:
        raise HTTPException(status_code=404, detail=f"Scenario '{scenario_id}' not found")

    inserted = insert_telemetry_record(scenarios[scenario_id])
    state = _build_full_state()
    assessment = state["assessment"]
    if assessment["overall_status"] in ("WARNING", "CRITICAL"):
        triggered_hazards = [
            h for h, st in assessment["hazard_statuses"].items() if st in ("WARNING", "CRITICAL")
        ]
        create_store_forward_report(
            mission_day=inserted["mission_day"],
            title=f"Sol {inserted['mission_day']} Scenario [{scenario_id}] Assessment Packet",
            summary=scenarios[scenario_id]["notes"],
            risk_level=assessment["overall_status"],
            hazard_triggers=triggered_hazards,
            payload={
                "scenario_id": scenario_id,
                "overall_status": assessment["overall_status"],
                "equivalent_dose_rate_msv_day": inserted["equivalent_dose_rate_msv_day"],
                "heart_rate_bpm": inserted["heart_rate_bpm"],
                "co2_mmhg": inserted["co2_mmhg"],
                "sleep_duration_hrs": inserted["sleep_duration_hrs"],
            },
            provenance=inserted["provenance"],
            comm_online=False,
        )
        state = _build_full_state()

    return state


@app.post("/api/psych-questionnaire")
def submit_psych_questionnaire(payload: PsychQuestionnaireInput) -> Dict[str, Any]:
    insert_psych_questionnaire(payload.model_dump())
    # Also update latest telemetry psychological fields as a new user-entered check-in
    history = fetch_all_telemetry()
    latest = dict(history[-1])
    latest.pop("id", None)
    latest["mission_day"] = payload.mission_day
    latest["provenance"] = payload.provenance.value
    latest["mood_score"] = float(payload.emotional_condition_rating)
    latest["stress_level"] = float(payload.psychological_stress_rating)
    latest["motivation_level"] = float(payload.motivation_rating)
    latest["fatigue_level"] = float(payload.fatigue_rating)
    latest["workload_score"] = float(payload.concentration_workload_rating)
    latest["feeling_isolated"] = payload.isolation_feeling_rating >= 6
    latest["concentration_difficulty"] = payload.concentration_workload_rating >= 7
    if payload.sleep_difficulty_rating >= 7:
        latest["sleep_irregularities"] = max(int(latest["sleep_irregularities"]), 3)
    latest["notes"] = (
        f"Self-Assessment Questionnaire logged: {payload.journal_reflection or 'Routine behavioural check-in.'}"
    )
    insert_telemetry_record(latest)
    return _build_full_state()


@app.post("/api/comm/status")
def update_comm_status(payload: CommStatusUpdate) -> Dict[str, Any]:
    comm_state = fetch_system_state("comm_state")
    comm_state["earth_comm_status"] = payload.earth_comm_status
    comm_state["one_way_delay_minutes"] = payload.one_way_delay_minutes
    comm_state["offline_mode_forced"] = payload.offline_mode_forced
    update_system_state("comm_state", comm_state)
    return _build_full_state()


@app.post("/api/comm/queue-report")
def queue_health_report(payload: StoreForwardReportCreate) -> Dict[str, Any]:
    state = _build_full_state()
    mission_day = state["latest_telemetry"]["mission_day"]
    create_store_forward_report(
        mission_day=mission_day,
        title=payload.title,
        summary=payload.summary,
        risk_level=payload.risk_level.value,
        hazard_triggers=payload.hazard_triggers,
        payload=payload.payload_snapshot,
        provenance=payload.provenance.value,
        comm_online=False,
    )
    return _build_full_state()


@app.post("/api/comm/sync")
def sync_reports_to_earth() -> Dict[str, Any]:
    sync_result = synchronize_queued_reports()
    state = _build_full_state()
    return {"sync_result": sync_result, "state": state}


@app.post("/api/emergency/escalate")
def trigger_emergency_escalation(payload: EmergencyEscalationInput) -> Dict[str, Any]:
    comm_state = fetch_system_state("comm_state")
    protocol = generate_local_emergency_protocol(
        trigger_hazard=payload.trigger_hazard,
        severity=payload.severity.value,
        reported_symptoms=payload.reported_symptoms,
        vital_signs_summary=payload.vital_signs_summary,
        mission_phase=payload.mission_phase.value,
        comm_state=comm_state,
    )
    state = _build_full_state()
    mission_day = state["latest_telemetry"]["mission_day"]
    create_store_forward_report(
        mission_day=mission_day,
        title=f"PRIORITY-1 EMERGENCY ESCALATION: {protocol['protocol_id']}",
        summary=f"{protocol['protocol_title']} triggered for {payload.trigger_hazard}. Vital summary: {payload.vital_signs_summary}",
        risk_level="CRITICAL",
        hazard_triggers=[payload.trigger_hazard],
        payload=protocol,
        provenance=DataProvenance.USER_ENTERED.value,
        comm_online=False,
    )
    updated_state = _build_full_state()
    return {"protocol": protocol, "state": updated_state}


@app.post("/api/rag/query")
def query_rag_knowledge_base(payload: RAGQueryInput) -> Dict[str, Any]:
    state = _build_full_state()
    ctx = None
    if payload.include_astronaut_context:
        ctx = {
            "mission_phase": state["latest_telemetry"]["mission_phase"],
            "overall_status": state["assessment"]["overall_status"],
        }
    return rag_engine.answer_question(
        question=payload.question,
        hazard_filter=payload.hazard_filter,
        astronaut_context=ctx,
    )


class ConfigLimitsUpdate(BaseModel):
    radiation_limits: Optional[RadiationConfigLimits] = None
    environmental_limits: Optional[EnvironmentalConfigLimits] = None


@app.post("/api/config/limits")
def update_configured_limits(payload: ConfigLimitsUpdate) -> Dict[str, Any]:
    if payload.radiation_limits:
        update_system_state("rad_limits", payload.radiation_limits.model_dump())
    if payload.environmental_limits:
        update_system_state("env_limits", payload.environmental_limits.model_dump())
    return _build_full_state()


@app.post("/api/reset")
def reset_demo_database() -> Dict[str, Any]:
    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    init_db()
    return _build_full_state()

