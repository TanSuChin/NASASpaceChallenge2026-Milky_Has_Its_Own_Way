"""
Integrated Astronaut Health Assessment Engine (Section 8) and Local Emergency Protocol Engine.
Integrates telemetry across all 5 NASA spaceflight hazards, compares against individual astronaut
baselines and historical trends, maps findings to anatomical regions for the Interactive Body Map,
and generates explainable NORMAL / WARNING / CRITICAL classifications with research citations.
"""

from __future__ import annotations
from typing import List, Dict, Any, Optional
from models import (
    AstronautBaseline,
    RadiationConfigLimits,
    EnvironmentalConfigLimits,
    RiskLevel,
    MissionPhase,
)
from knowledge_base import rag_engine


def _pct_delta(current: float, baseline: float) -> float:
    if baseline == 0:
        return 0.0
    return round(((current - baseline) / baseline) * 100.0, 1)


def evaluate_integrated_health(
    latest: Dict[str, Any],
    history: List[Dict[str, Any]],
    baseline: AstronautBaseline,
    rad_limits: RadiationConfigLimits,
    env_limits: EnvironmentalConfigLimits,
    comm_state: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Central assessment engine integrating all five hazard modules, personal baseline comparisons,
    historical trends, mission phase, and environmental conditions.
    """
    findings: List[Dict[str, Any]] = []
    recommendations: List[Dict[str, Any]] = []
    active_alerts: List[Dict[str, Any]] = []

    # 1. Baseline Comparisons
    baseline_comparisons = [
        {
            "metric": "Heart Rate",
            "key": "heart_rate_bpm",
            "current": latest["heart_rate_bpm"],
            "baseline": baseline.baseline_hr_bpm,
            "unit": "bpm",
            "delta": round(latest["heart_rate_bpm"] - baseline.baseline_hr_bpm, 1),
            "delta_pct": _pct_delta(latest["heart_rate_bpm"], baseline.baseline_hr_bpm),
            "hazard": "Gravity Fields",
        },
        {
            "metric": "Systolic BP",
            "key": "systolic_bp_mmhg",
            "current": latest["systolic_bp_mmhg"],
            "baseline": baseline.baseline_systolic_mmhg,
            "unit": "mmHg",
            "delta": round(latest["systolic_bp_mmhg"] - baseline.baseline_systolic_mmhg, 1),
            "delta_pct": _pct_delta(latest["systolic_bp_mmhg"], baseline.baseline_systolic_mmhg),
            "hazard": "Gravity Fields",
        },
        {
            "metric": "Diastolic BP",
            "key": "diastolic_bp_mmhg",
            "current": latest["diastolic_bp_mmhg"],
            "baseline": baseline.baseline_diastolic_mmhg,
            "unit": "mmHg",
            "delta": round(latest["diastolic_bp_mmhg"] - baseline.baseline_diastolic_mmhg, 1),
            "delta_pct": _pct_delta(latest["diastolic_bp_mmhg"], baseline.baseline_diastolic_mmhg),
            "hazard": "Gravity Fields",
        },
        {
            "metric": "Oxygen Saturation (SpO2)",
            "key": "spo2_pct",
            "current": latest["spo2_pct"],
            "baseline": baseline.baseline_spo2_pct,
            "unit": "%",
            "delta": round(latest["spo2_pct"] - baseline.baseline_spo2_pct, 1),
            "delta_pct": _pct_delta(latest["spo2_pct"], baseline.baseline_spo2_pct),
            "hazard": "Hostile and Closed Environments",
        },
        {
            "metric": "Body Temperature",
            "key": "body_temp_c",
            "current": latest["body_temp_c"],
            "baseline": baseline.baseline_temp_c,
            "unit": "°C",
            "delta": round(latest["body_temp_c"] - baseline.baseline_temp_c, 2),
            "delta_pct": _pct_delta(latest["body_temp_c"], baseline.baseline_temp_c),
            "hazard": "Hostile and Closed Environments",
        },
        {
            "metric": "Sleep Duration",
            "key": "sleep_duration_hrs",
            "current": latest["sleep_duration_hrs"],
            "baseline": baseline.baseline_sleep_hrs,
            "unit": "hrs",
            "delta": round(latest["sleep_duration_hrs"] - baseline.baseline_sleep_hrs, 1),
            "delta_pct": _pct_delta(latest["sleep_duration_hrs"], baseline.baseline_sleep_hrs),
            "hazard": "Isolation and Confinement",
        },
        {
            "metric": "Mood Score",
            "key": "mood_score",
            "current": latest["mood_score"],
            "baseline": baseline.baseline_mood_score,
            "unit": "/10",
            "delta": round(latest["mood_score"] - baseline.baseline_mood_score, 1),
            "delta_pct": _pct_delta(latest["mood_score"], baseline.baseline_mood_score),
            "hazard": "Isolation and Confinement",
        },
        {
            "metric": "Psychological Stress",
            "key": "stress_level",
            "current": latest["stress_level"],
            "baseline": baseline.baseline_stress_score,
            "unit": "/10",
            "delta": round(latest["stress_level"] - baseline.baseline_stress_score, 1),
            "delta_pct": _pct_delta(latest["stress_level"], baseline.baseline_stress_score),
            "hazard": "Isolation and Confinement",
        },
        {
            "metric": "Muscle Strength Index",
            "key": "muscle_strength_idx",
            "current": latest["muscle_strength_idx"],
            "baseline": baseline.baseline_muscle_strength_idx,
            "unit": "idx",
            "delta": round(latest["muscle_strength_idx"] - baseline.baseline_muscle_strength_idx, 1),
            "delta_pct": _pct_delta(latest["muscle_strength_idx"], baseline.baseline_muscle_strength_idx),
            "hazard": "Gravity Fields",
        },
        {
            "metric": "Sensorimotor Balance",
            "key": "balance_score",
            "current": latest["balance_score"],
            "baseline": baseline.baseline_balance_score,
            "unit": "/100",
            "delta": round(latest["balance_score"] - baseline.baseline_balance_score, 1),
            "delta_pct": _pct_delta(latest["balance_score"], baseline.baseline_balance_score),
            "hazard": "Gravity Fields",
        },
    ]

    # Historical window (last 4 records)
    recent_window = history[-4:] if len(history) >= 4 else history

    # =========================================================================
    # MODULE 1 ASSESSMENT: SPACE RADIATION
    # =========================================================================
    rad_status = RiskLevel.NORMAL
    eq_rate = float(latest["equivalent_dose_rate_msv_day"])
    abs_dose = float(latest["absorbed_dose_mgy"])
    cum_dose = float(latest["cumulative_effective_dose_msv"])
    rad_event = latest.get("radiation_event_type", "GCR_BACKGROUND")

    if eq_rate >= rad_limits.daily_equivalent_crit_msv or cum_dose >= rad_limits.cumulative_mission_limit_msv:
        rad_status = RiskLevel.CRITICAL
        msg = (
            f"Acute radiation threshold exceeded: Equivalent dose rate is {eq_rate:.2f} mSv/day "
            f"(absorptive physical dose {abs_dose:.2f} mGy; configured critical limit {rad_limits.daily_equivalent_crit_msv:.1f} mSv/day). "
            f"Event source: {rad_event}."
        )
        findings.append({
            "hazard": "Space Radiation",
            "severity": "CRITICAL",
            "title": "Acute Solar Particle Event (SPE) / Dose Limit Exceedance",
            "detail": msg,
            "rule_type": rad_limits.rule_classification,
            "ref_doc": "NASA-HRP-RAD-01",
        })
        active_alerts.append({
            "id": "ALERT-RAD-CRIT",
            "hazard": "Space Radiation",
            "severity": "CRITICAL",
            "message": msg,
            "action_required": "Enter high-mass storm shelter immediately; suspend surface EVA; log active biodosimetry.",
        })
        recommendations.append({
            "hazard": "Space Radiation",
            "priority": "IMMEDIATE",
            "action": "Relocate to habitat polyethylene/water-wall storm shelter (ALARA SPE protocol).",
            "rationale": "High-flux Solar Particle Event protons increase acute radiation sickness risk and cumulative effective dose (mSv).",
            "procedure_code": "PROC-RAD-SPE-01",
            "citation": "NASA-HRP-RAD-01 / CSA-RAD-2026-01",
        })
    elif eq_rate >= rad_limits.daily_equivalent_warn_msv or cum_dose >= rad_limits.cumulative_mission_warn_msv:
        rad_status = RiskLevel.WARNING
        msg = (
            f"Elevated radiation exposure: Equivalent dose rate {eq_rate:.2f} mSv/day "
            f"(absorbed dose {abs_dose:.2f} mGy), cumulative mission effective dose {cum_dose:.1f} mSv "
            f"(warning threshold {rad_limits.daily_equivalent_warn_msv:.1f} mSv/day)."
        )
        findings.append({
            "hazard": "Space Radiation",
            "severity": "WARNING",
            "title": "Elevated Dosimetric Rate Above Routine GCR Background",
            "detail": msg,
            "rule_type": rad_limits.rule_classification,
            "ref_doc": "CSA-RAD-2026-01",
        })
        active_alerts.append({
            "id": "ALERT-RAD-WARN",
            "hazard": "Space Radiation",
            "severity": "WARNING",
            "message": msg,
            "action_required": "Review shielding posture and defer non-essential external surface activity during solar flux peak.",
        })
        recommendations.append({
            "hazard": "Space Radiation",
            "priority": "HIGH",
            "action": "Verify personal active dosimeter placement, minimize time in lightly shielded airlock modules, and reschedule non-urgent EVA.",
            "rationale": "Distinguish physical absorbed dose (mGy) from biologically weighted equivalent dose (mSv) driven by HZE GCR and solar proton enhancements.",
            "procedure_code": "PROC-RAD-ALARA-02",
            "citation": "NASA-HRP-RAD-01 / CSA-RAD-2026-01",
        })
    else:
        recommendations.append({
            "hazard": "Space Radiation",
            "priority": "ROUTINE",
            "action": "Continue nominal active dosimetry logging and sleeping-quarters polyethylene shielding utilization.",
            "rationale": f"Current rate ({eq_rate:.2f} mSv/day; {abs_dose:.2f} mGy) reflects expected Galactic Cosmic Ray (GCR) background.",
            "procedure_code": "PROC-RAD-NOM-01",
            "citation": "NASA-HRP-RAD-01",
        })

    # =========================================================================
    # MODULE 2 ASSESSMENT: ISOLATION AND CONFINEMENT
    # =========================================================================
    iso_status = RiskLevel.NORMAL
    sleep_hrs = float(latest["sleep_duration_hrs"])
    stress = float(latest["stress_level"])
    mood = float(latest["mood_score"])
    fatigue = float(latest["fatigue_level"])
    workload = float(latest["workload_score"])
    sleep_irreg = int(latest.get("sleep_irregularities", 0))

    avg_recent_sleep = (
        sum(float(r["sleep_duration_hrs"]) for r in recent_window) / len(recent_window)
        if recent_window else sleep_hrs
    )

    if sleep_hrs < 4.5 or stress >= 8.5 or mood <= 3.0 or fatigue >= 8.5:
        iso_status = RiskLevel.CRITICAL
        msg = (
            f"Severe behavioural/circadian strain indicator: Sleep {sleep_hrs:.1f} hrs (baseline {baseline.baseline_sleep_hrs:.1f} hrs), "
            f"Stress {stress:.1f}/10, Mood {mood:.1f}/10, Fatigue {fatigue:.1f}/10."
        )
        findings.append({
            "hazard": "Isolation and Confinement",
            "severity": "CRITICAL",
            "title": "Acute Sleep Deprivation & High Cognitive/Stress Load",
            "detail": msg + " Note: Non-diagnostic operational alert; does not constitute a psychiatric diagnosis.",
            "rule_type": "MISSION_CONFIGURED_BASELINE_RULE",
            "ref_doc": "NASA-HRP-ISO-01",
        })
        active_alerts.append({
            "id": "ALERT-ISO-CRIT",
            "hazard": "Isolation and Confinement",
            "severity": "CRITICAL",
            "message": msg,
            "action_required": "Mandatory safety stand-down from high-risk EVA/robotics operations; initiate protected 9-hour sleep recovery window.",
        })
        recommendations.append({
            "hazard": "Isolation and Confinement",
            "priority": "IMMEDIATE",
            "action": "Enforce operational workload stand-down, protected circadian sleep recovery block, and private supportive check-in with Crew Medical Officer.",
            "rationale": "Severe sleep restriction (<4.5 hrs) and high fatigue markedly elevate operational error risk during confined missions.",
            "procedure_code": "PROC-BEHAV-REST-01",
            "citation": "NASA-HRP-ISO-01",
        })
    elif (
        sleep_hrs < 6.2
        or avg_recent_sleep < 6.4
        or stress >= baseline.baseline_stress_score + 2.2
        or mood <= baseline.baseline_mood_score - 1.8
        or fatigue >= 6.5
        or sleep_irreg >= 3
        or latest.get("feeling_isolated", False)
    ):
        iso_status = RiskLevel.WARNING
        msg = (
            f"Persistent circadian/workload drift vs. personal baseline: Sleep {sleep_hrs:.1f} hrs "
            f"(baseline {baseline.baseline_sleep_hrs:.1f} hrs, 4-sol avg {avg_recent_sleep:.1f} hrs), "
            f"Stress {stress:.1f}/10 (baseline {baseline.baseline_stress_score:.1f}), "
            f"Mood {mood:.1f}/10, Workload {workload:.1f}/10."
        )
        findings.append({
            "hazard": "Isolation and Confinement",
            "severity": "WARNING",
            "title": "Circadian Sleep Reduction & Elevated Operational Stress Trend",
            "detail": msg + " Non-diagnostic behavioral risk indicator.",
            "rule_type": "MISSION_CONFIGURED_BASELINE_RULE",
            "ref_doc": "NASA-HRP-ISO-01",
        })
        active_alerts.append({
            "id": "ALERT-ISO-WARN",
            "hazard": "Isolation and Confinement",
            "severity": "WARNING",
            "message": msg,
            "action_required": "Apply blue-enriched morning light protocol, reduce evening screen/task load, and schedule structured crew decompression.",
        })
        recommendations.append({
            "hazard": "Isolation and Confinement",
            "priority": "HIGH",
            "action": "Execute 30-min high-melanopic blue-enriched light exposure at wake, dim habitat lighting 90 mins pre-sleep, reflective journaling, and shared crew meal.",
            "rationale": "Counteracts Martian sol / habitat circadian misalignment and confinement fatigue without pathologizing normal mission stress.",
            "procedure_code": "PROC-ISO-CIRC-02",
            "citation": "NASA-HRP-ISO-01",
        })
    else:
        recommendations.append({
            "hazard": "Isolation and Confinement",
            "priority": "ROUTINE",
            "action": "Maintain consistent sleep/wake schedule, daily crew social check-ins, and personal journaling routine.",
            "rationale": "Sleep duration, mood, and stress remain within personal baseline bands.",
            "procedure_code": "PROC-ISO-NOM-01",
            "citation": "NASA-HRP-ISO-01",
        })

    # =========================================================================
    # MODULE 3 ASSESSMENT: DISTANCE FROM EARTH & AUTONOMOUS MEDICAL SUPPORT
    # =========================================================================
    dist_status = RiskLevel.NORMAL
    comm_mode = comm_state.get("earth_comm_status", "NOMINAL_DELAYED")
    delay_min = float(comm_state.get("one_way_delay_minutes", 14.2))
    pending_count = int(comm_state.get("pending_reports_count", 0))

    if comm_mode == "CONJUNCTION_BLACKOUT" or comm_state.get("offline_mode_forced", False):
        dist_status = RiskLevel.WARNING
        msg = (
            f"Earth telemetry link in {comm_mode} (One-way light time: {delay_min:.1f} min; "
            f"{pending_count} health reports queued in local store-and-forward buffer). "
            "Onboard TARSCARE AI operating in 100% autonomous offline mode."
        )
        findings.append({
            "hazard": "Distance from Earth",
            "severity": "WARNING",
            "title": "Autonomous Deep-Space Operations Mode (Store-and-Forward Active)",
            "detail": msg,
            "rule_type": "MISSION_CONFIGURED_PROTOTYPE_RULE",
            "ref_doc": "NASA-HRP-DIST-01",
        })
        recommendations.append({
            "hazard": "Distance from Earth",
            "priority": "HIGH",
            "action": "Rely on local onboard RAG medical library and autonomous CMO checklists; queue daily telemetry packets for post-blackout synchronization.",
            "rationale": f"With {delay_min:.1f} min one-way delay ({delay_min*2:.1f} min round-trip) or blackout, acute clinical decisions cannot wait for Earth Flight Surgeons.",
            "procedure_code": "PROC-DIST-AUTO-01",
            "citation": "NASA-HRP-DIST-01 / NASA-CSTARS-MED-01",
        })
    else:
        recommendations.append({
            "hazard": "Distance from Earth",
            "priority": "ROUTINE",
            "action": f"Continue store-and-forward telemetry packet synchronization (current one-way light delay: {delay_min:.1f} min).",
            "rationale": "Local SQLite database and offline RAG knowledge base verified ready for autonomous fallback.",
            "procedure_code": "PROC-DIST-SYNC-01",
            "citation": "NASA-HRP-DIST-01",
        })

    # =========================================================================
    # MODULE 4 ASSESSMENT: GRAVITY FIELDS & PHYSIOLOGICAL ADAPTATION
    # =========================================================================
    grav_status = RiskLevel.NORMAL
    hr = float(latest["heart_rate_bpm"])
    sys_bp = float(latest["systolic_bp_mmhg"])
    dia_bp = float(latest["diastolic_bp_mmhg"])
    dizz = int(latest.get("dizziness_severity", 0))
    faint = bool(latest.get("faintness_presyncope", False))
    strength = float(latest["muscle_strength_idx"])
    balance = float(latest["balance_score"])
    adherence = float(latest["exercise_adherence_pct"])
    sans_vis = bool(latest.get("visual_disturbance_sans", False))
    phase = latest.get("mission_phase", MissionPhase.MARS_SURFACE.value)
    grav_g = float(latest.get("gravity_g", 0.38))

    hr_delta = hr - baseline.baseline_hr_bpm
    sys_delta = sys_bp - baseline.baseline_systolic_mmhg

    if faint or dizz >= 3 or hr >= baseline.baseline_hr_bpm + 32 or sys_bp <= 88:
        grav_status = RiskLevel.CRITICAL
        msg = (
            f"Acute orthostatic instability / presyncope in {phase} ({grav_g}g): "
            f"HR {hr:.0f} bpm ({hr_delta:+.0f} vs. baseline {baseline.baseline_hr_bpm:.0f}), "
            f"BP {sys_bp:.0f}/{dia_bp:.0f} mmHg ({sys_delta:+.0f} systolic vs. baseline), "
            f"presyncope/faintness={faint}, dizziness severity={dizz}/3."
        )
        findings.append({
            "hazard": "Gravity Fields",
            "severity": "CRITICAL",
            "title": "Acute Orthostatic Intolerance / Cardiovascular Instability",
            "detail": msg,
            "rule_type": "MISSION_CONFIGURED_BASELINE_RULE",
            "ref_doc": "CSA-CARDIO-CCISS-01",
        })
        active_alerts.append({
            "id": "ALERT-GRAV-CRIT",
            "hazard": "Gravity Fields",
            "severity": "CRITICAL",
            "message": msg,
            "action_required": "Assume supine/Trendelenburg posture immediately; administer oral isotonic fluid-loading protocol; don lower-body compression garment; cancel EVA.",
        })
        recommendations.append({
            "hazard": "Gravity Fields",
            "priority": "IMMEDIATE",
            "action": "Execute CCISS/CARDIOBREATH orthostatic rescue protocol: supine posture with leg elevation, oral salt/fluid loading, continuous ECG/BP monitoring.",
            "rationale": "Transition from microgravity to partial/Earth gravity unmasks plasma volume reduction and blunted arterial baroreflex control.",
            "procedure_code": "PROC-GRAV-ORTHO-01",
            "citation": "NASA-HRP-GRAV-01 / CSA-CARDIO-CCISS-01",
        })
    elif (
        dizz >= 1
        or hr_delta >= 12.0
        or sys_delta <= -10.0
        or strength <= baseline.baseline_muscle_strength_idx - 7.0
        or balance <= baseline.baseline_balance_score - 10.0
        or adherence < 80.0
        or sans_vis
    ):
        grav_status = RiskLevel.WARNING
        msg = (
            f"Gravity adaptation & sensorimotor/cardiovascular drift in {phase} ({grav_g}g): "
            f"HR {hr:.0f} bpm ({hr_delta:+.0f} vs. baseline), BP {sys_bp:.0f}/{dia_bp:.0f} mmHg, "
            f"Balance {balance:.0f}/100 (baseline {baseline.baseline_balance_score:.0f}), "
            f"Muscle Strength Index {strength:.1f} (baseline {baseline.baseline_muscle_strength_idx:.0f}), "
            f"Visual/SANS symptoms={sans_vis}."
        )
        findings.append({
            "hazard": "Gravity Fields",
            "severity": "WARNING",
            "title": "Partial-Gravity Cardiovascular, Sensorimotor, or Musculoskeletal Adaptation Shift",
            "detail": msg,
            "rule_type": "MISSION_CONFIGURED_BASELINE_RULE",
            "ref_doc": "NASA-HRP-GRAV-01",
        })
        active_alerts.append({
            "id": "ALERT-GRAV-WARN",
            "hazard": "Gravity Fields",
            "severity": "WARNING",
            "message": msg,
            "action_required": "Perform graded orthostatic stand test, complete ARED resistive loading + vestibular balance block, and perform fundus/visual acuity check if SANS flagged.",
        })
        recommendations.append({
            "hazard": "Gravity Fields",
            "priority": "HIGH",
            "action": "Maintain ARED resistive exercise (squats/heel raises/deadlifts ≥60 min), add 15-min proprioceptive balance drills in 0.38g, and use pre-EVA fluid loading.",
            "rationale": "Mitigates lower-limb muscle deconditioning, bone mineral loss, neurovestibular ataxia, and post-transit orthostatic tachycardia.",
            "procedure_code": "PROC-GRAV-ARED-02",
            "citation": "NASA-HRP-GRAV-01 / CSA-CARDIO-CCISS-01",
        })
    else:
        recommendations.append({
            "hazard": "Gravity Fields",
            "priority": "ROUTINE",
            "action": "Continue scheduled 2-hour daily countermeasure block (ARED resistance + cycle/treadmill aerobic + balance drills).",
            "rationale": f"Cardiovascular and musculoskeletal indicators remain well adapted to {phase} ({grav_g}g).",
            "procedure_code": "PROC-GRAV-NOM-01",
            "citation": "NASA-HRP-GRAV-01",
        })

    # =========================================================================
    # MODULE 5 ASSESSMENT: HOSTILE AND CLOSED ENVIRONMENTS
    # =========================================================================
    env_status = RiskLevel.NORMAL
    co2_mmhg = float(latest["co2_mmhg"])
    co2_ppm = float(latest["co2_ppm"])
    o2_pct = float(latest["oxygen_pct"])
    cabin_temp = float(latest["cabin_temp_c"])
    cabin_press = float(latest["cabin_pressure_kpa"])
    humidity = float(latest["humidity_pct"])
    aqi = float(latest["air_quality_index"])
    body_temp = float(latest["body_temp_c"])
    spo2 = float(latest["spo2_pct"])
    resp_sym = latest.get("respiratory_symptoms") or []
    inf_sym = latest.get("infection_symptoms") or []

    if (
        co2_mmhg >= env_limits.co2_crit_mmhg
        or o2_pct < env_limits.o2_min_pct
        or aqi >= env_limits.aqi_crit
        or body_temp >= 38.3
        or spo2 < 93.0
    ):
        env_status = RiskLevel.CRITICAL
        msg = (
            f"Critical habitat environment or physiological excursion: Cabin CO2 {co2_mmhg:.2f} mmHg ({co2_ppm:.0f} ppm; "
            f"limit {env_limits.co2_crit_mmhg:.1f} mmHg), O2 {o2_pct:.1f}%, AQI {aqi:.0f}, "
            f"Crew Body Temp {body_temp:.1f}°C, SpO2 {spo2:.1f}%."
        )
        findings.append({
            "hazard": "Hostile and Closed Environments",
            "severity": "CRITICAL",
            "title": "Critical ECLSS Atmospheric Excursion or Febrile/Hypoxic Finding",
            "detail": msg + " Note: Environmental correlation does not automatically diagnose an infection.",
            "rule_type": env_limits.rule_classification,
            "ref_doc": "NASA-HRP-ENV-01",
        })
        active_alerts.append({
            "id": "ALERT-ENV-CRIT",
            "hazard": "Hostile and Closed Environments",
            "severity": "CRITICAL",
            "message": msg,
            "action_required": "Switch ECLSS CO2 scrubber to backup bed immediately; activate high-flow HEPA circulation; don portable breathing apparatus if CO2 > 5 mmHg; initiate CMO exam.",
        })
        recommendations.append({
            "hazard": "Hostile and Closed Environments",
            "priority": "IMMEDIATE",
            "action": "Inspect ECLSS CDRA/amine CO2 scrubber & O2 supply loop, boost cabin fan ventilation to break CO2 pockets, and perform CMO clinical evaluation.",
            "rationale": "Elevated spacecraft CO2 (>4.5 mmHg) impairs cognition and respiratory drive, while febrile/SpO2 changes require structured medical workup.",
            "procedure_code": "PROC-ENV-ECLSS-01",
            "citation": "NASA-HRP-ENV-01",
        })
    elif (
        co2_mmhg >= env_limits.co2_warn_mmhg
        or aqi >= env_limits.aqi_warn
        or humidity < env_limits.humidity_min_pct
        or humidity > env_limits.humidity_max_pct
        or cabin_temp < env_limits.cabin_temp_min_c
        or cabin_temp > env_limits.cabin_temp_max_c
        or body_temp >= 37.4
        or spo2 < 96.0
        or len(resp_sym) > 0
        or len(inf_sym) > 0
    ):
        env_status = RiskLevel.WARNING
        msg = (
            f"Habitat environment / crew symptom correlation noted: Cabin CO2 {co2_mmhg:.2f} mmHg ({co2_ppm:.0f} ppm), "
            f"Humidity {humidity:.0f}%, AQI {aqi:.0f}, Body Temp {body_temp:.1f}°C, "
            f"Respiratory symptoms={resp_sym or ['None']}, General symptoms={inf_sym or ['None']}."
        )
        findings.append({
            "hazard": "Hostile and Closed Environments",
            "severity": "WARNING",
            "title": "Elevated Cabin CO2 / Particulate Load & Crew Symptom Correlation",
            "detail": msg + " Important: Correlating environmental readings with symptoms does not automatically diagnose an infection.",
            "rule_type": env_limits.rule_classification,
            "ref_doc": "NASA-HRP-ENV-01",
        })
        active_alerts.append({
            "id": "ALERT-ENV-WARN",
            "hazard": "Hostile and Closed Environments",
            "severity": "WARNING",
            "message": msg,
            "action_required": "Increase sleeping-quarters air circulation fan speed, inspect HEPA particulate filter for Martian regolith dust, and repeat body temp/SpO2 check in 4 hours.",
        })
        recommendations.append({
            "hazard": "Hostile and Closed Environments",
            "priority": "HIGH",
            "action": "Verify local air duct flow (eliminate stagnant CO2 pockets), clean airlock HEPA pre-filters, maintain mucosal hydration, and follow surface hygiene protocol.",
            "rationale": "Moderate CO2 accumulation (≥3.0 mmHg) and low humidity/dust in closed habitats correlate with headache, fatigue, and upper-airway irritation.",
            "procedure_code": "PROC-ENV-VENT-02",
            "citation": "NASA-HRP-ENV-01",
        })
    else:
        recommendations.append({
            "hazard": "Hostile and Closed Environments",
            "priority": "ROUTINE",
            "action": "Continue routine ECLSS atmospheric logging, potable water microbial checks, and airlock dust mitigation.",
            "rationale": f"Cabin CO2 ({co2_mmhg:.2f} mmHg), O2 ({o2_pct:.1f}%), pressure ({cabin_press:.1f} kPa), and crew vitals are nominal.",
            "procedure_code": "PROC-ENV-NOM-01",
            "citation": "NASA-HRP-ENV-01",
        })

    # Overall Risk Level aggregation
    hazard_statuses = {
        "Space Radiation": rad_status.value,
        "Isolation and Confinement": iso_status.value,
        "Distance from Earth": dist_status.value,
        "Gravity Fields": grav_status.value,
        "Hostile and Closed Environments": env_status.value,
    }

    if RiskLevel.CRITICAL.value in hazard_statuses.values():
        overall_status = RiskLevel.CRITICAL
    elif RiskLevel.WARNING.value in hazard_statuses.values():
        overall_status = RiskLevel.WARNING
    else:
        overall_status = RiskLevel.NORMAL

    # =========================================================================
    # ANATOMICAL BODY MAP REGIONS (SCREEN 2)
    # =========================================================================
    body_regions = [
        {
            "region_id": "brain_head",
            "label": "Brain, CNS & Circadian System",
            "status": (
                "CRITICAL" if (iso_status == RiskLevel.CRITICAL or rad_status == RiskLevel.CRITICAL)
                else "WARNING" if (iso_status == RiskLevel.WARNING or co2_mmhg >= env_limits.co2_warn_mmhg)
                else "NORMAL"
            ),
            "hazards": ["Isolation and Confinement", "Space Radiation", "Hostile and Closed Environments"],
            "metrics": [
                {"name": "Sleep Duration", "value": f"{sleep_hrs:.1f} hrs", "baseline": f"{baseline.baseline_sleep_hrs:.1f} hrs"},
                {"name": "Stress / Mood", "value": f"{stress:.1f}/10 · {mood:.1f}/10", "baseline": f"{baseline.baseline_stress_score:.1f} · {baseline.baseline_mood_score:.1f}"},
                {"name": "Cabin CO2 Partial Pressure", "value": f"{co2_mmhg:.2f} mmHg", "baseline": "< 3.0 mmHg"},
                {"name": "Equivalent Dose Rate", "value": f"{eq_rate:.2f} mSv/day", "baseline": "0.65 mSv/day (GCR ref)"},
            ],
            "summary": (
                "Monitors circadian alignment, sleep architecture, cognitive workload, CO2-associated headache risk, "
                "and HZE/proton CNS radiation exposure."
            ),
            "guidance": "Use morning blue-enriched light exposure, ensure sleeping-bunk airflow to prevent CO2 pockets, and protect 8-hour sleep blocks.",
            "citation": "NASA-HRP-ISO-01 / NASA-HRP-ENV-01 / NASA-HRP-RAD-01",
        },
        {
            "region_id": "eyes",
            "label": "Eyes & Optic Nerve (SANS)",
            "status": "WARNING" if (sans_vis or co2_mmhg >= 3.2) else "NORMAL",
            "hazards": ["Gravity Fields", "Hostile and Closed Environments", "Space Radiation"],
            "metrics": [
                {"name": "SANS Visual Disturbance", "value": "Reported" if sans_vis else "None", "baseline": "None"},
                {"name": "Gravity Regime", "value": f"{grav_g}g ({phase})", "baseline": "1.0g Earth"},
                {"name": "Cabin CO2 (SANS cofactor)", "value": f"{co2_mmhg:.2f} mmHg", "baseline": "< 3.0 mmHg"},
            ],
            "summary": (
                "Tracks Spaceflight-Associated Neuro-ocular Syndrome (SANS) driven by cephalad fluid shifts in microgravity "
                "and elevated cabin CO2, plus radiation cataract exposure."
            ),
            "guidance": "Perform scheduled onboard optical coherence tomography (OCT) / visual acuity checks and keep cabin CO2 below 3.0 mmHg.",
            "citation": "NASA-HRP-GRAV-01 / NASA-HRP-RAD-01",
        },
        {
            "region_id": "heart",
            "label": "Cardiovascular & Autonomic System",
            "status": (
                "CRITICAL" if (faint or hr_delta >= 30 or sys_bp <= 88)
                else "WARNING" if (hr_delta >= 12 or sys_delta <= -10 or dizz >= 1)
                else "NORMAL"
            ),
            "hazards": ["Gravity Fields", "Space Radiation"],
            "metrics": [
                {"name": "Heart Rate", "value": f"{hr:.0f} bpm", "baseline": f"{baseline.baseline_hr_bpm:.0f} bpm ({hr_delta:+.0f})"},
                {"name": "Blood Pressure", "value": f"{sys_bp:.0f}/{dia_bp:.0f} mmHg", "baseline": f"{baseline.baseline_systolic_mmhg:.0f}/{baseline.baseline_diastolic_mmhg:.0f} mmHg"},
                {"name": "Orthostatic Dizziness", "value": f"Level {dizz}/3", "baseline": "0/3"},
                {"name": "Presyncope / Faintness", "value": "Yes" if faint else "No", "baseline": "No"},
            ],
            "summary": (
                "Evaluates arterial baroreflex sensitivity, orthostatic tolerance in partial gravity (CCISS / CARDIOBREATH), "
                "and heart rate / blood pressure deviation from personal baseline."
            ),
            "guidance": "Perform pre-EVA isotonic fluid loading, wear lower-body compression garments during gravity transitions, and monitor standing BP.",
            "citation": "CSA-CARDIO-CCISS-01 / NASA-HRP-GRAV-01",
        },
        {
            "region_id": "lungs",
            "label": "Respiratory & Pulmonary System",
            "status": (
                "CRITICAL" if (spo2 < 93.0 or o2_pct < 19.5 or co2_mmhg >= 4.5)
                else "WARNING" if (spo2 < 96.0 or len(resp_sym) > 0 or aqi >= 50.0 or humidity < 30.0)
                else "NORMAL"
            ),
            "hazards": ["Hostile and Closed Environments"],
            "metrics": [
                {"name": "SpO2 Saturation", "value": f"{spo2:.1f}%", "baseline": f"{baseline.baseline_spo2_pct:.1f}%"},
                {"name": "Cabin O2 / Pressure", "value": f"{o2_pct:.1f}% · {cabin_press:.1f} kPa", "baseline": "21.0% · 70.3 kPa"},
                {"name": "Air Quality Index (AQI)", "value": f"{aqi:.0f}", "baseline": "< 35"},
                {"name": "Respiratory Symptoms", "value": ", ".join(resp_sym) if resp_sym else "None", "baseline": "None"},
            ],
            "summary": (
                "Monitors pulmonary oxygenation, Martian regolith dust / airlock particulate irritation, cabin humidity, "
                "and closed-loop ECLSS gas composition."
            ),
            "guidance": "Inspect airlock HEPA filtration after surface EVAs, maintain cabin humidity between 35–60%, and correlate symptoms before assuming infection.",
            "citation": "NASA-HRP-ENV-01",
        },
        {
            "region_id": "muscles",
            "label": "Skeletal Muscle & Motor Conditioning",
            "status": "WARNING" if (strength <= baseline.baseline_muscle_strength_idx - 7.0 or adherence < 80.0) else "NORMAL",
            "hazards": ["Gravity Fields"],
            "metrics": [
                {"name": "Muscle Strength Index", "value": f"{strength:.1f}", "baseline": f"{baseline.baseline_muscle_strength_idx:.0f}"},
                {"name": "Exercise Performance", "value": f"{latest['exercise_performance_pct']:.0f}%", "baseline": "100%"},
                {"name": "Countermeasure Adherence", "value": f"{adherence:.0f}%", "baseline": "≥ 90%"},
                {"name": "Physical Activity", "value": f"{latest['physical_activity_mins']:.0f} min/sol", "baseline": "110 min/sol"},
            ],
            "summary": (
                "Tracks antigravity muscle conditioning (soleus, quadriceps, paraspinal) and adherence to resistive "
                "and aerobic countermeasure prescriptions."
            ),
            "guidance": "Complete full ARED resistive loading blocks and high-intensity interval cycle/treadmill sessions.",
            "citation": "NASA-HRP-GRAV-01",
        },
        {
            "region_id": "bones",
            "label": "Skeletal & Bone Mineral System",
            "status": "WARNING" if (adherence < 82.0 or strength < 90.0) else "NORMAL",
            "hazards": ["Gravity Fields", "Space Radiation"],
            "metrics": [
                {"name": "Resistive Loading Adherence", "value": f"{adherence:.0f}%", "baseline": "≥ 90%"},
                {"name": "Cumulative Radiation (Marrow)", "value": f"{cum_dose:.1f} mSv", "baseline": f"< {rad_limits.cumulative_mission_warn_msv:.0f} mSv"},
                {"name": "Discomfort Score", "value": f"{latest['musculoskeletal_discomfort']}/3", "baseline": "0/3"},
            ],
            "summary": (
                "Evaluates axial and femoral bone unloading risk in 0g and 0.38g alongside hematopoietic bone marrow "
                "radiation dose tracking."
            ),
            "guidance": "Prioritize high-load axial resistance exercises (squats, deadlifts) and adequate Vitamin D / calcium intake.",
            "citation": "NASA-HRP-GRAV-01 / NASA-HRP-RAD-01",
        },
        {
            "region_id": "vestibular_nervous",
            "label": "Vestibular & Sensorimotor System",
            "status": "CRITICAL" if dizz >= 3 else "WARNING" if (balance <= baseline.baseline_balance_score - 10.0 or dizz >= 1 or latest.get("spatial_disorientation", False)) else "NORMAL",
            "hazards": ["Gravity Fields"],
            "metrics": [
                {"name": "Balance Score", "value": f"{balance:.0f}/100", "baseline": f"{baseline.baseline_balance_score:.0f}/100"},
                {"name": "Coordination Score", "value": f"{latest['coordination_score']:.0f}/100", "baseline": "94/100"},
                {"name": "Spatial Disorientation", "value": "Present" if latest.get("spatial_disorientation") else "None", "baseline": "None"},
            ],
            "summary": (
                "Monitors otolith-canal sensory reweighting and postural stability during transitions between "
                "microgravity, 0.38g Martian surface, and 1.0g Earth return."
            ),
            "guidance": "Perform graduated head-movement and proprioceptive balance exercises prior to autonomous surface locomotion.",
            "citation": "NASA-HRP-GRAV-01",
        },
    ]

    # Retrieve RAG explanation for the active findings
    query_terms = [f["title"] for f in findings] or ["nominal spaceflight health baseline countermeasure"]
    rag_summary = rag_engine.answer_question(
        question=" ".join(query_terms),
        astronaut_context={
            "mission_phase": phase,
            "overall_status": overall_status.value,
        },
    )

    return {
        "overall_status": overall_status.value,
        "mission_day": latest["mission_day"],
        "mission_phase": phase,
        "gravity_g": grav_g,
        "provenance": latest.get("provenance", "SYNTHETIC_DEMO"),
        "rule_disclaimer": (
            "All threshold classifications represent research-informed, mission-configured prototype rules "
            "comparing current telemetry against individual astronaut baselines. Not clinically validated for medical diagnosis."
        ),
        "hazard_statuses": hazard_statuses,
        "baseline_comparisons": baseline_comparisons,
        "findings": findings,
        "recommendations": recommendations,
        "active_alerts": active_alerts,
        "body_regions": body_regions,
        "rag_analysis": rag_summary,
    }


def generate_local_emergency_protocol(
    trigger_hazard: str,
    severity: str,
    reported_symptoms: List[str],
    vital_signs_summary: str,
    mission_phase: str,
    comm_state: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Deterministic, zero-latency local emergency escalation workflow (Module 3D).
    Operates 100% locally without waiting for Earth communication or external LLM APIs.
    """
    hazard_key = trigger_hazard.lower()
    if "rad" in hazard_key:
        protocol_id = "EMG-RAD-SPE-SHELTER-01"
        protocol_title = "Autonomous Solar Particle Event (SPE) & High-Dose Radiation Escalation"
        immediate_steps = [
            "1. IMMEDIATE SHELTERING: Relocate all crew to habitat high-mass Storm Shelter (water-wall / polyethylene core) within < 5 minutes.",
            "2. TERMINATE EVA: Abort any ongoing or planned Extravehicular Activity; verify airlock inner hatch seal.",
            "3. DOSIMETRY VERIFICATION: Cross-check personal active dosimeter (mGy absorbed & mSv equivalent rate) against static area tissue-equivalent proportional counter (TEPC).",
            "4. SYMPTOM & HEMATOLOGY LOG: Record prodromal nausea, fatigue, or headache; schedule baseline + 6-hour capillary leukocyte/lymphocyte count.",
            "5. STORE-AND-FORWARD PACKET: Queue Priority-1 Radiation Incident Packet for Earth Flight Surgeons & Space Radiation Analysis Group (SRAG).",
        ]
        citation = "NASA-HRP-RAD-01 / CSA-RAD-2026-01"
    elif "grav" in hazard_key or "cardio" in hazard_key or "ortho" in hazard_key:
        protocol_id = "EMG-GRAV-ORTHO-SYNC-02"
        protocol_title = "Autonomous Orthostatic Presyncope & Cardiovascular Instability Protocol"
        immediate_steps = [
            "1. POSTURAL RESCUE: Place astronaut in supine position with lower extremities elevated 30 degrees (Trendelenburg posture).",
            "2. AIRWAY & CONTINUOUS VITALS: Attach local 3-lead ECG, cuff blood pressure (every 2 mins), and pulse oximeter.",
            "3. FLUID & COMPRESSION COUNTERMEASURE: Administer oral isotonic electrolyte bolus (500 mL) if conscious; engage lower-body gradient compression garment.",
            "4. NEUROVESTIBULAR & SANS CHECK: Assess pupil reactivity, visual fields, and focal neurological status.",
            "5. STORE-AND-FORWARD PACKET: Queue Priority-1 Cardiovascular Telemetry Strip for delayed Earth Flight Surgeon review.",
        ]
        citation = "CSA-CARDIO-CCISS-01 / NASA-HRP-GRAV-01"
    elif "env" in hazard_key or "co2" in hazard_key or "resp" in hazard_key:
        protocol_id = "EMG-ENV-ECLSS-ATMOS-03"
        protocol_title = "Autonomous Habitat Atmospheric Excursion & Respiratory Triage Protocol"
        immediate_steps = [
            "1. BREATHING SOURCE ISOLATION: If local CO2 > 4.5 mmHg or toxic VOC suspected, don portable O2 breathing mask and activate high-flow cabin circulation fans.",
            "2. ECLSS SCRUBBER SWITCHOVER: Transition Carbon Dioxide Removal Assembly (CDRA / amine bed) to secondary redundant channel and inspect HEPA particulate filters.",
            "3. CLINICAL VITALS: Measure SpO2, respiratory rate, blood pressure, and tympanic body temperature.",
            "4. ENVIRONMENTAL CORRELATION: Compare crew symptoms across all habitat modules before suspecting infectious etiology.",
            "5. STORE-AND-FORWARD PACKET: Queue Priority-1 ECLSS + Crew Medical Triage Packet for Earth synchronization.",
        ]
        citation = "NASA-HRP-ENV-01 / NASA-CSTARS-MED-01"
    elif "iso" in hazard_key or "psych" in hazard_key or "sleep" in hazard_key:
        protocol_id = "EMG-ISO-CREW-SAFE-04"
        protocol_title = "Autonomous Acute Fatigue & Behavioural Safety Stand-Down Protocol"
        immediate_steps = [
            "1. OPERATIONAL STAND-DOWN: Immediately pause high-criticality tasks (EVA, robotics, propulsion maneuvers).",
            "2. CMO PRIVATE CONSULTATION: Conduct supportive, non-judgmental peer/Crew Medical Officer check-in.",
            "3. PROTECTED SLEEP RECOVERY: Configure crew quarters for uninterrupted 9-hour dark/quiet sleep window with optimal ventilation.",
            "4. CIRCADIAN RESET: Schedule high-melanopic blue light block upon waking and redistribute crew workload for 48 hours.",
            "5. STORE-AND-FORWARD PACKET: Log confidential behavioural readiness summary for delayed Flight Surgeon transmission.",
        ]
        citation = "NASA-HRP-ISO-01 / NASA-CSTARS-MED-01"
    else:
        protocol_id = "EMG-CSTARS-GEN-00"
        protocol_title = "Autonomous Deep-Space Crew Medical Officer (CMO) Primary Triage Protocol"
        immediate_steps = [
            "1. PRIMARY SURVEY (MARCH/ABCDE): Verify airway, breathing (SpO2), circulation (HR/BP vs. personal baseline), and disability/neuro status.",
            "2. ENVIRONMENTAL SAFETY CHECK: Confirm cabin pressure, O2, CO2, and radiation dosimetry are within safe limits.",
            "3. STABILIZE & MONITOR: Rest in safe habitat module with continuous local telemetry recording.",
            "4. ONBOARD REFERENCE RETRIEVAL: Query local offline RAG database for symptom-specific spaceflight countermeasures.",
            "5. STORE-AND-FORWARD PACKET: Package vital signs and assessment snapshot into Priority-1 queue for Earth synchronization.",
        ]
        citation = "NASA-CSTARS-MED-01 / NASA-HRP-DIST-01"

    return {
        "protocol_id": protocol_id,
        "protocol_title": protocol_title,
        "execution_mode": "LOCAL_DETERMINISTIC_ZERO_LATENCY",
        "earth_comm_status": comm_state.get("earth_comm_status", "NOMINAL_DELAYED"),
        "one_way_delay_minutes": comm_state.get("one_way_delay_minutes", 14.2),
        "round_trip_delay_minutes": round(float(comm_state.get("one_way_delay_minutes", 14.2)) * 2.0, 1),
        "severity": severity,
        "trigger_hazard": trigger_hazard,
        "mission_phase": mission_phase,
        "reported_symptoms": reported_symptoms,
        "vital_signs_summary": vital_signs_summary,
        "immediate_steps": immediate_steps,
        "supporting_citation": citation,
        "safety_disclaimer": (
            "Executed autonomously onboard without waiting for Earth telemetry link. "
            "Follow onboard Crew Medical Officer checklist; prototype decision support only."
        ),
    }

