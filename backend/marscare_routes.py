"""
MarsCare AI Extended Routes & Hybrid RAG Initializer.
Preserves all existing TARSCARE AI endpoints while adding MarsCare UI-facing routes:
- /api/ai/status: Local Ollama + Sentence-Transformers + deterministic offline RAG status
- /api/assessment/evaluate: Combined manual measurement + categorized symptom submission
- /api/history: Windowed (7/14/30d) historical logs & alerts filter
- /api/reports/generate: Local health summary report creation
- /api/comm/mode: Clean 3-state (CONNECTED / DELAYED / OFFLINE) communication switch
"""

from __future__ import annotations
from dataclasses import asdict
from typing import Any, Dict, List, Optional
from fastapi import APIRouter
from pydantic import BaseModel, Field

import database
import knowledge_base
from assessment_engine import evaluate_integrated_health
from local_ai_rag import (
    EXTRA_CORPUS_DICTS,
    get_local_ai_status,
    rerank_with_embeddings_if_cached,
    synthesize_with_ollama_if_available,
)
from marscare_enhancer import normalize_comm_mode
from models import (
    AstronautBaseline,
    DataProvenance,
    EnvironmentalConfigLimits,
    HealthMeasurementSubmission,
    MissionPhase,
    RadiationConfigLimits,
)

marscare_router = APIRouter()
_CORPUS_EXTENDED = False


def initialize_marscare_rag() -> None:
    """Extends TARSCARE AI's local RAG corpus with RadLab, OSDR, NLSP, EDA, TBone & Vascular docs and attaches hybrid AI hooks."""
    global _CORPUS_EXTENDED
    if _CORPUS_EXTENDED:
        return
    _CORPUS_EXTENDED = True

    existing_ids = {d.doc_id for d in knowledge_base.KNOWLEDGE_CORPUS}
    KnowledgeDoc = type(knowledge_base.KNOWLEDGE_CORPUS[0])
    added = False
    for doc_dict in EXTRA_CORPUS_DICTS:
        if doc_dict["doc_id"] not in existing_ids:
            sections_text = "\n\n".join(f"{hdr}: {body}" for hdr, body in doc_dict.get("sections", []))
            full_content = f"{doc_dict.get('summary', '')}\n\n{sections_text}".strip()
            knowledge_base.KNOWLEDGE_CORPUS.append(
                KnowledgeDoc(
                    doc_id=doc_dict["doc_id"],
                    title=doc_dict["title"],
                    agency=doc_dict["agency"],
                    year=doc_dict["year"],
                    url=doc_dict["url"],
                    hazard_category=doc_dict["hazard_category"],
                    provenance=doc_dict["provenance"],
                    content=full_content,
                )
            )
            added = True

    if added:
        knowledge_base.rag_engine.__init__()

    orig_answer_question = knowledge_base.rag_engine.answer_question

    def hybrid_answer_question(
        question: str,
        hazard_filter: Optional[str] = None,
        astronaut_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        base_res = orig_answer_question(
            question=question,
            hazard_filter=hazard_filter,
            astronaut_context=astronaut_context,
        )
        ql = question.lower()
        if any(w in ql for w in ("prescribe", "prescription", "dosage", "dose of ", "antibiotic", "amoxicillin", "medication")):
            base_res["sufficient_evidence"] = False
            base_res["answer"] = (
                "Insufficient evidence and out-of-scope clinical request: TARSCARE is an autonomous educational and health-monitoring "
                "companion built on NASA/CSA spaceflight research references. It cannot prescribe medications, recommend drug dosages, "
                "or replace onboard Crew Medical Officer protocols or Flight Surgeon guidance.\n\n"
                + (base_res.get("answer") or "")
            )
        ai_status = get_local_ai_status()
        citations = base_res.get("citations", [])

        if citations and ai_status["sentence_transformers_cached"]:
            texts = [c.get("excerpt", "") for c in citations]
            scores = [float(c.get("relevance_score", 0.5)) for c in citations]
            new_scores = rerank_with_embeddings_if_cached(question, texts, scores)
            for idx, c in enumerate(citations):
                c["relevance_score"] = new_scores[idx]
            citations.sort(key=lambda item: float(item.get("relevance_score", 0.0)), reverse=True)
            base_res["citations"] = citations

        if base_res.get("sufficient_evidence") and citations and ai_status["ollama_available"]:
            ollama_ans = synthesize_with_ollama_if_available(question, citations, astronaut_context)
            if ollama_ans:
                base_res["answer"] = ollama_ans
                base_res["engine_mode"] = ai_status["active_engine_mode"]
                return base_res

        base_res["engine_mode"] = ai_status["active_engine_mode"]
        return base_res

    knowledge_base.rag_engine.answer_question = hybrid_answer_question  # type: ignore[method-assign]


class CombinedAssessmentRequest(BaseModel):
    mission_day: Optional[int] = None
    mission_phase: Optional[str] = None
    gravity_g: Optional[float] = None
    heart_rate_bpm: Optional[float] = None
    systolic_bp_mmhg: Optional[float] = None
    diastolic_bp_mmhg: Optional[float] = None
    spo2_pct: Optional[float] = None
    respiratory_rate_bpm: Optional[float] = None
    body_temp_c: Optional[float] = None
    sleep_duration_hrs: Optional[float] = None
    mood_score: Optional[float] = None
    stress_level: Optional[float] = None
    fatigue_level: Optional[float] = None
    workload_score: Optional[float] = None
    absorbed_dose_mgy: Optional[float] = None
    equivalent_dose_rate_msv_day: Optional[float] = None
    co2_mmhg: Optional[float] = None
    humidity_pct: Optional[float] = None
    physical_activity_mins: Optional[float] = None
    exercise_adherence_pct: Optional[float] = None
    selected_symptoms: List[str] = Field(default_factory=list)
    notes: str = ""


class CommModeChangeRequest(BaseModel):
    mode: str  # CONNECTED | DELAYED | OFFLINE
    one_way_delay_minutes: Optional[float] = None


class ReportGenerateRequest(BaseModel):
    title: Optional[str] = None


@marscare_router.get("/ai/status")
def api_ai_status() -> Dict[str, Any]:
    return get_local_ai_status()


@marscare_router.post("/comm/mode")
def api_set_comm_mode(req: CommModeChangeRequest) -> Dict[str, Any]:
    mode = req.mode.strip().upper()
    comm_state = database.fetch_system_state("comm_state") or {}
    if mode == "CONNECTED":
        comm_state["earth_comm_status"] = "NOMINAL_DIRECT"
        comm_state["offline_mode_forced"] = False
        comm_state["one_way_delay_minutes"] = 0.0
    elif mode == "OFFLINE":
        comm_state["earth_comm_status"] = "CONJUNCTION_BLACKOUT"
        comm_state["offline_mode_forced"] = True
        comm_state["one_way_delay_minutes"] = req.one_way_delay_minutes or 22.0
    else:
        comm_state["earth_comm_status"] = "NOMINAL_DELAYED"
        comm_state["offline_mode_forced"] = False
        comm_state["one_way_delay_minutes"] = req.one_way_delay_minutes if req.one_way_delay_minutes is not None else 14.2
    database.update_system_state("comm_state", comm_state)
    return {
        "comm_state": comm_state,
        "comm_mode": normalize_comm_mode(comm_state),
    }


@marscare_router.get("/history")
def api_filtered_history(days: int = 30) -> Dict[str, Any]:
    all_rows = database.fetch_all_telemetry()
    window = all_rows[-days:] if days > 0 and len(all_rows) > days else all_rows
    alerts_history: List[Dict[str, Any]] = []
    for row in window:
        triggers: List[str] = []
        if float(row.get("equivalent_dose_rate_msv_day", 0)) >= 1.5:
            triggers.append(f"Radiation rate {row['equivalent_dose_rate_msv_day']} mSv/day")
        if float(row.get("sleep_duration_hrs", 7)) <= 6.2:
            triggers.append(f"Sleep contraction ({row['sleep_duration_hrs']} hrs)")
        if float(row.get("co2_mmhg", 2.5)) >= 3.0:
            triggers.append(f"Cabin CO2 elevated ({row['co2_mmhg']} mmHg)")
        if int(row.get("dizziness_severity", 0)) >= 1:
            triggers.append(f"Orthostatic dizziness grade {row['dizziness_severity']}")
        if triggers:
            alerts_history.append({
                "mission_day": row["mission_day"],
                "timestamp": row["timestamp"],
                "provenance": row["provenance"],
                "triggers": triggers,
                "notes": row.get("notes", ""),
            })
    return {
        "days_requested": days,
        "telemetry_history": window,
        "alerts_history": list(reversed(alerts_history)),
        "reports": database.fetch_store_forward_reports(),
        "psych_questionnaires": database.fetch_psych_questionnaires(),
    }


@marscare_router.post("/reports/generate")
def api_generate_report(req: ReportGenerateRequest) -> Dict[str, Any]:
    history = database.fetch_all_telemetry()
    latest = history[-1]
    baseline = AstronautBaseline(**(database.fetch_system_state("baseline") or {}))
    rad_limits = RadiationConfigLimits(**(database.fetch_system_state("rad_limits") or {}))
    env_limits = EnvironmentalConfigLimits(**(database.fetch_system_state("env_limits") or {}))
    comm_state = database.fetch_system_state("comm_state") or {}
    assessment = evaluate_integrated_health(latest, history, baseline, rad_limits, env_limits, comm_state)
    comm_norm = normalize_comm_mode(comm_state)
    is_direct = comm_norm["mode"] == "CONNECTED"
    title = req.title or f"Sol {latest['mission_day']} TARSCARE Autonomous Health Summary"
    summary = (
        f"Overall: {assessment['overall_status']} | HR {latest['heart_rate_bpm']:.0f} BPM, "
        f"BP {latest['systolic_bp_mmhg']:.0f}/{latest['diastolic_bp_mmhg']:.0f} mmHg, "
        f"SpO2 {latest['spo2_pct']:.1f}%, Sleep {latest['sleep_duration_hrs']:.1f}h, "
        f"Cum. Dose {latest['cumulative_effective_dose_msv']:.1f} mSv, CO2 {latest['co2_mmhg']:.1f} mmHg."
    )
    report = database.create_store_forward_report(
        mission_day=int(latest["mission_day"]),
        title=title,
        summary=summary,
        risk_level=assessment["overall_status"],
        hazard_triggers=assessment["structured_explanation"]["relevant_hazard"],
        payload={"glance": assessment["glance_summary"], "latest": latest},
        provenance=latest.get("provenance", DataProvenance.USER_ENTERED.value),
        comm_online=is_direct,
    )
    return {
        "report": report,
        "reports": database.fetch_store_forward_reports(),
    }


@marscare_router.post("/assessment/evaluate")
def api_submit_combined_assessment(req: CombinedAssessmentRequest) -> Dict[str, Any]:
    history = database.fetch_all_telemetry()
    latest = dict(history[-1])
    symptom_set = {s.lower() for s in req.selected_symptoms}

    resp_symptoms: List[str] = []
    inf_symptoms: List[str] = []
    for sym in req.selected_symptoms:
        sl = sym.lower()
        if any(k in sl for k in ("cough", "shortness", "throat", "congestion", "wheez", "breath")):
            resp_symptoms.append(sym)
        elif any(k in sl for k in ("fever", "chill", "rash", "sinus", "infection")):
            inf_symptoms.append(sym)

    dizziness = 2 if any("dizz" in s for s in symptom_set) else (1 if latest.get("dizziness_severity", 0) > 0 and "none" not in symptom_set else 0)
    faintness = any("faint" in s or "presyncope" in s for s in symptom_set)
    visual_sans = any("vision" in s or "blur" in s or "eye" in s for s in symptom_set)
    spatial_dis = any("balance" in s or "disorient" in s or "vertigo" in s for s in symptom_set)
    isolated = any("isolat" in s or "lonely" in s for s in symptom_set)
    conc_diff = any("focus" in s or "concentrat" in s or "brain fog" in s or "headache" in s for s in symptom_set)
    musc_disc = 2 if any("muscle" in s or "joint" in s or "back pain" in s for s in symptom_set) else 0

    phase = req.mission_phase or latest["mission_phase"]
    grav = req.gravity_g if req.gravity_g is not None else (0.0 if phase == MissionPhase.MICROGRAVITY_TRANSIT.value else (1.0 if phase == MissionPhase.EARTH_RETURN.value else 0.38))

    eq_rate = req.equivalent_dose_rate_msv_day if req.equivalent_dose_rate_msv_day is not None else latest["equivalent_dose_rate_msv_day"]
    abs_dose = req.absorbed_dose_mgy if req.absorbed_dose_mgy is not None else round(eq_rate * 0.4, 2)
    cum_msv = round(float(latest["cumulative_effective_dose_msv"]) + float(eq_rate), 2)

    sub = HealthMeasurementSubmission(
        mission_day=req.mission_day or (int(latest["mission_day"]) + 1),
        mission_phase=MissionPhase(phase),
        gravity_g=grav,
        provenance=DataProvenance.USER_ENTERED,
        absorbed_dose_mgy=abs_dose,
        absorbed_dose_rate_mgy_hr=round(abs_dose / 24.0, 4),
        equivalent_dose_msv=eq_rate,
        equivalent_dose_rate_msv_day=eq_rate,
        cumulative_effective_dose_msv=cum_msv,
        radiation_source="MANUAL_CREW_CHECK_IN",
        radiation_event_type=latest.get("radiation_event_type", "GCR_MARS_SHIELDED"),
        mood_score=req.mood_score if req.mood_score is not None else (5.5 if "low mood" in symptom_set else latest["mood_score"]),
        stress_level=req.stress_level if req.stress_level is not None else (7.0 if "anxious / stressed" in symptom_set else latest["stress_level"]),
        emotional_wellbeing=latest.get("emotional_wellbeing", 7.0),
        fatigue_level=req.fatigue_level if req.fatigue_level is not None else (7.5 if "severe fatigue" in symptom_set else latest["fatigue_level"]),
        workload_score=req.workload_score if req.workload_score is not None else latest["workload_score"],
        social_interaction_score=latest.get("social_interaction_score", 7.0),
        sleep_duration_hrs=req.sleep_duration_hrs if req.sleep_duration_hrs is not None else (5.0 if "insomnia / poor sleep" in symptom_set else latest["sleep_duration_hrs"]),
        sleep_quality_pct=latest.get("sleep_quality_pct", 78.0),
        sleep_schedule_window=latest.get("sleep_schedule_window", "22:30 - 05:30 UTC-MARS"),
        sleep_irregularities=3 if "insomnia / poor sleep" in symptom_set else latest.get("sleep_irregularities", 1),
        feeling_isolated=isolated,
        concentration_difficulty=conc_diff,
        motivation_level=latest.get("motivation_level", 7.5),
        heart_rate_bpm=req.heart_rate_bpm if req.heart_rate_bpm is not None else latest["heart_rate_bpm"],
        systolic_bp_mmhg=req.systolic_bp_mmhg if req.systolic_bp_mmhg is not None else latest["systolic_bp_mmhg"],
        diastolic_bp_mmhg=req.diastolic_bp_mmhg if req.diastolic_bp_mmhg is not None else latest["diastolic_bp_mmhg"],
        spo2_pct=req.spo2_pct if req.spo2_pct is not None else latest["spo2_pct"],
        respiratory_rate_bpm=req.respiratory_rate_bpm if req.respiratory_rate_bpm is not None else latest.get("respiratory_rate_bpm", 16.0),
        body_temp_c=req.body_temp_c if req.body_temp_c is not None else (38.1 if "feverish / chills" in symptom_set else latest["body_temp_c"]),
        dizziness_severity=dizziness,
        faintness_presyncope=faintness,
        physical_activity_mins=req.physical_activity_mins if req.physical_activity_mins is not None else latest["physical_activity_mins"],
        exercise_performance_pct=latest.get("exercise_performance_pct", 90.0),
        muscle_strength_idx=latest.get("muscle_strength_idx", 92.0),
        exercise_adherence_pct=req.exercise_adherence_pct if req.exercise_adherence_pct is not None else latest["exercise_adherence_pct"],
        musculoskeletal_discomfort=musc_disc,
        balance_score=74.0 if spatial_dis else latest.get("balance_score", 85.0),
        coordination_score=latest.get("coordination_score", 88.0),
        spatial_disorientation=spatial_dis,
        visual_disturbance_sans=visual_sans,
        cabin_temp_c=latest.get("cabin_temp_c", 21.6),
        cabin_pressure_kpa=latest.get("cabin_pressure_kpa", 70.3),
        oxygen_pct=latest.get("oxygen_pct", 21.1),
        co2_mmhg=req.co2_mmhg if req.co2_mmhg is not None else latest["co2_mmhg"],
        co2_ppm=round((req.co2_mmhg if req.co2_mmhg is not None else latest["co2_mmhg"]) * 1315.0, 0),
        humidity_pct=req.humidity_pct if req.humidity_pct is not None else latest["humidity_pct"],
        air_quality_index=latest.get("air_quality_index", 35.0),
        env_warning_event=latest.get("env_warning_event", "NONE"),
        respiratory_symptoms=resp_symptoms,
        infection_symptoms=inf_symptoms,
        hygiene_adherence_pct=latest.get("hygiene_adherence_pct", 96.0),
        notes=req.notes or (f"Self-assessment submitted. Selected symptoms: {', '.join(req.selected_symptoms) if req.selected_symptoms else 'None'}."),
    )

    inserted = database.insert_telemetry_record(sub.model_dump())
    updated_history = database.fetch_all_telemetry()
    baseline = AstronautBaseline(**(database.fetch_system_state("baseline") or {}))
    rad_limits = RadiationConfigLimits(**(database.fetch_system_state("rad_limits") or {}))
    env_limits = EnvironmentalConfigLimits(**(database.fetch_system_state("env_limits") or {}))
    comm_state = database.fetch_system_state("comm_state") or {}
    assessment = evaluate_integrated_health(inserted, updated_history, baseline, rad_limits, env_limits, comm_state)

    if assessment["overall_status"] in ("WARNING", "CRITICAL"):
        comm_norm = normalize_comm_mode(comm_state)
        database.create_store_forward_report(
            mission_day=inserted["mission_day"],
            title=f"Sol {inserted['mission_day']} Self-Assessment ({assessment['overall_status']})",
            summary="; ".join(assessment["structured_explanation"]["what_was_detected"]),
            risk_level=assessment["overall_status"],
            hazard_triggers=assessment["structured_explanation"]["relevant_hazard"],
            payload={"selected_symptoms": req.selected_symptoms, "latest": inserted},
            provenance=DataProvenance.USER_ENTERED.value,
            comm_online=comm_norm["mode"] == "CONNECTED",
        )

    return {
        "submitted_record": inserted,
        "selected_symptoms": req.selected_symptoms,
        "assessment": assessment,
    }
