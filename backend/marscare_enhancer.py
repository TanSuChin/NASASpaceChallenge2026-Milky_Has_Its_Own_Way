"""
MarsCare AI Assessment & Companion Shaping Layer.
Builds the 3-question Health Glance, 7 Section-4 Interactive Human Body regions with 7-day trends,
the 4-section Spaceflight Hazard modules, structured assessment explanation, and 4-tier Health Guidance.
"""

from __future__ import annotations
from typing import Any, Dict, List


def normalize_comm_mode(comm_state: Dict[str, Any]) -> Dict[str, Any]:
    raw = str(comm_state.get("earth_comm_status", "NOMINAL_DELAYED")).upper()
    forced = bool(comm_state.get("offline_mode_forced", False))
    if forced or "BLACKOUT" in raw or "OFFLINE" in raw:
        mode = "OFFLINE"
        label = "Offline"
        summary = "Solar conjunction or local isolation — all health checks and guidance run 100% autonomously onboard."
    elif "DIRECT" in raw or "CONNECTED" in raw or float(comm_state.get("one_way_delay_minutes", 14.2)) <= 0.1:
        mode = "CONNECTED"
        label = "Connected"
        summary = "Low-latency Earth ground link active; local assessments sync automatically."
    else:
        mode = "DELAYED"
        label = "Delayed"
        delay = comm_state.get("one_way_delay_minutes", 14.2)
        summary = f"Earth link delayed ({delay} min one-way); onboard assessment operates independently with queued sync."
    return {
        "mode": mode,
        "label": label,
        "summary": summary,
    }


def _provenance_label(raw: str) -> str:
    r = str(raw or "").upper()
    if "USER" in r:
        return "User-Entered Data"
    if "REAL" in r:
        return "Real Research Data"
    return "Simulated Data"


def build_marscare_extensions(
    latest: Dict[str, Any],
    history: List[Dict[str, Any]],
    baseline: Dict[str, Any],
    comm_state: Dict[str, Any],
    base_assessment: Dict[str, Any],
) -> Dict[str, Any]:
    recent_7 = history[-7:] if len(history) >= 7 else history
    hazard_statuses = base_assessment.get("hazard_statuses", {})
    overall = base_assessment.get("overall_status", "NORMAL")
    prov_text = _provenance_label(latest.get("provenance", "SYNTHETIC_DEMO"))
    comm_norm = normalize_comm_mode(comm_state)

    hr = float(latest.get("heart_rate_bpm", 68.0))
    hr_base = float(baseline.get("baseline_hr_bpm", 58.0))
    hr_delta = round(hr - hr_base, 1)

    sys_bp = float(latest.get("systolic_bp_mmhg", 105.0))
    dia_bp = float(latest.get("diastolic_bp_mmhg", 68.0))
    sys_base = float(baseline.get("baseline_systolic_bp", 112.0))
    dia_base = float(baseline.get("baseline_diastolic_bp", 72.0))

    spo2 = float(latest.get("spo2_pct", 97.5))
    spo2_base = float(baseline.get("baseline_spo2_pct", 98.4))

    resp_rate = float(latest.get("respiratory_rate_bpm", 16.0))
    resp_base = float(baseline.get("baseline_resp_rate_bpm", 15.0))

    sleep_h = float(latest.get("sleep_duration_hrs", 6.5))
    sleep_base = float(baseline.get("baseline_sleep_hrs", 7.4))
    sleep_delta = round(sleep_h - sleep_base, 1)

    mood = float(latest.get("mood_score", 7.0))
    mood_base = float(baseline.get("baseline_mood_score", 8.2))
    stress = float(latest.get("stress_level", 4.0))
    fatigue = float(latest.get("fatigue_level", 4.0))
    temp_c = float(latest.get("body_temp_c", 36.7))
    temp_base = float(baseline.get("baseline_temp_c", 36.6))

    eq_rate = float(latest.get("equivalent_dose_rate_msv_day", 0.9))
    abs_dose = float(latest.get("absorbed_dose_mgy", 0.4))
    cum_msv = float(latest.get("cumulative_effective_dose_msv", 150.0))
    co2 = float(latest.get("co2_mmhg", 2.5))
    strength = float(latest.get("muscle_strength_idx", 94.0))
    ex_adherence = float(latest.get("exercise_adherence_pct", 90.0))
    grav_g = float(latest.get("gravity_g", 0.38))

    # 1. Three immediate questions
    if overall == "CRITICAL":
        how_text = "Immediate attention needed: one or more measurements are in Critical range outside personal baseline."
    elif overall == "WARNING":
        how_text = "Stable overall, with a few measurements drifted outside your personal baseline that benefit from attention today."
    else:
        how_text = "You are doing well. Vital signs and hazard indicators are aligned with your personal baseline."

    changes: List[str] = []
    if sleep_delta <= -0.7:
        changes.append(f"Sleep dropped {abs(sleep_delta)} hrs below your {sleep_base}h baseline")
    if hr_delta >= 8.0:
        changes.append(f"Resting heart rate rose +{hr_delta} BPM over your {hr_base} BPM baseline")
    if co2 >= 3.0:
        changes.append(f"Cabin CO2 climbed to {co2:.1f} mmHg")
    if eq_rate >= 1.4:
        changes.append(f"Radiation rate increased to {eq_rate:.2f} mSv/day")
    if not changes:
        changes.append("Minor day-to-day variation only; heart rate, oxygenation, and sleep remain steady.")
    what_changed_text = "; ".join(changes) + "."

    recs = base_assessment.get("recommendations", [])
    if recs:
        should_act = recs[0].get("action") or recs[0].get("guidance") or "Follow routine onboard hydration, sleep hygiene, and countermeasure schedule."
    else:
        should_act = "No urgent intervention required; continue routine exercise and sleep schedule."

    glance_summary = {
        "overall_status": overall,
        "how_am_i_doing": how_text,
        "what_has_changed": what_changed_text,
        "should_i_take_action": should_act,
        "provenance_label": prov_text,
    }

    # 2. Seven exact Interactive Human Body regions
    head_status = hazard_statuses.get("Isolation and Confinement", "NORMAL")
    if int(latest.get("concentration_difficulty", 0)) == 1 or fatigue >= 6.0:
        head_status = "WARNING" if head_status == "NORMAL" else head_status
    eyes_status = "WARNING" if latest.get("visual_disturbance_sans") else "NORMAL"
    heart_status = "CRITICAL" if latest.get("faintness_presyncope") else (
        "WARNING" if hr_delta >= 12 or latest.get("dizziness_severity", 0) >= 2 else "NORMAL"
    )
    lungs_status = "CRITICAL" if spo2 < 92.0 else (
        "WARNING" if spo2 < 96.0 or co2 >= 3.2 or bool(latest.get("respiratory_symptoms")) else "NORMAL"
    )
    muscles_status = "WARNING" if strength < 92.0 or ex_adherence < 85.0 or latest.get("musculoskeletal_discomfort", 0) >= 2 else "NORMAL"
    bones_status = "WARNING" if grav_g <= 0.4 and ex_adherence < 85.0 else "NORMAL"
    whole_status = overall

    def _trend(field: str, fallback: float = 0.0) -> List[Dict[str, Any]]:
        return [{"sol": r["mission_day"], "value": round(float(r.get(field, fallback)), 2)} for r in recent_7]

    ts_rec = latest.get("timestamp", "")

    marscare_body_regions = [
        {
            "id": "head_and_brain",
            "name": "Head and Brain",
            "status": head_status,
            "summary": "Mood, stress, fatigue, sleep recovery & cognitive clarity",
            "measurements": [
                {"label": "Mood Score", "value": f"{mood:.1f}", "unit": "/10", "baseline": f"{mood_base:.1f}", "recorded_at": ts_rec},
                {"label": "Stress & Fatigue", "value": f"{stress:.1f} / {fatigue:.1f}", "unit": "/10", "baseline": "2.6 / 3.0", "recorded_at": ts_rec},
                {"label": "Sleep Duration", "value": f"{sleep_h:.1f}", "unit": "hrs", "baseline": f"{sleep_base:.1f} hrs", "recorded_at": ts_rec},
            ],
            "recent_trend": _trend("sleep_duration_hrs", sleep_h),
            "trend_label": "Sleep duration (hrs)",
            "spaceflight_risk": "Isolation, circadian misalignment, and cabin CO2 build-up elevate cognitive fatigue and reduce deep sleep architecture (NASA HRP Isolation).",
            "action_label": "Start Health Assessment",
        },
        {
            "id": "eyes",
            "name": "Eyes",
            "status": eyes_status,
            "summary": "Visual symptoms & Spaceflight Associated Neuro-ocular Syndrome (SANS)",
            "measurements": [
                {"label": "Near-Vision / SANS Shift", "value": "Symptom Reported" if latest.get("visual_disturbance_sans") else "Clear", "unit": "Check", "baseline": "Clear", "recorded_at": ts_rec},
                {"label": "Gravity Regime", "value": f"{grav_g}g", "unit": "Field", "baseline": "1.0g Earth", "recorded_at": ts_rec},
                {"label": "Fluid-Shift Pressure Proxy", "value": f"{round(sys_bp)}/{round(dia_bp)}", "unit": "mmHg", "baseline": f"{round(sys_base)}/{round(dia_base)}", "recorded_at": ts_rec},
            ],
            "recent_trend": _trend("balance_score", 88.0),
            "trend_label": "Neuro-vestibular stability (%)",
            "spaceflight_risk": "Headward fluid shifts in 0g and partial gravity can subtly alter optic nerve sheath pressure and refractive focusing (SANS).",
            "action_label": "Start Health Assessment",
        },
        {
            "id": "heart",
            "name": "Heart",
            "status": heart_status,
            "summary": "Heart rate, arterial blood pressure & orthostatic tolerance",
            "measurements": [
                {"label": "Heart Rate", "value": f"{round(hr)}", "unit": "BPM", "baseline": f"{round(hr_base)} BPM ({hr_delta:+.0f})", "recorded_at": ts_rec},
                {"label": "Blood Pressure", "value": f"{round(sys_bp)}/{round(dia_bp)}", "unit": "mmHg", "baseline": f"{round(sys_base)}/{round(dia_base)} mmHg", "recorded_at": ts_rec},
                {"label": "Dizziness Grade", "value": f"{latest.get('dizziness_severity', 0)}", "unit": "/3", "baseline": "0 /3", "recorded_at": ts_rec},
            ],
            "recent_trend": _trend("heart_rate_bpm", hr),
            "trend_label": "Heart rate (BPM)",
            "spaceflight_risk": "CSA CCISS and Vascular studies show reduced plasma volume and arterial stiffness after weightlessness, causing post-landing heart rate spikes on Mars.",
            "action_label": "Start Health Assessment",
        },
        {
            "id": "lungs",
            "name": "Lungs",
            "status": lungs_status,
            "summary": "Oxygen saturation, respiratory rate & closed-cabin air quality",
            "measurements": [
                {"label": "Oxygen Saturation (SpO2)", "value": f"{spo2:.1f}", "unit": "%", "baseline": f"{spo2_base:.1f}%", "recorded_at": ts_rec},
                {"label": "Respiratory Rate", "value": f"{resp_rate:.0f}", "unit": "breaths/min", "baseline": f"{resp_base:.0f} /min", "recorded_at": ts_rec},
                {"label": "Cabin CO2", "value": f"{co2:.1f}", "unit": "mmHg", "baseline": "< 3.0 mmHg", "recorded_at": ts_rec},
            ],
            "recent_trend": _trend("spo2_pct", spo2),
            "trend_label": "SpO2 (%)",
            "spaceflight_risk": "CSA CARDIOBREATH and NASA EDA research highlight how stagnant cabin airflow, elevated CO2, or dry regolith dust trigger airway irritation.",
            "action_label": "Start Health Assessment",
        },
        {
            "id": "muscles",
            "name": "Muscles",
            "status": muscles_status,
            "summary": "Physical activity, strength retention & countermeasure adherence",
            "measurements": [
                {"label": "Strength Index", "value": f"{strength:.1f}", "unit": "%", "baseline": "98.0%", "recorded_at": ts_rec},
                {"label": "Daily Exercise", "value": f"{latest.get('physical_activity_mins', 90):.0f}", "unit": "mins", "baseline": "105 mins", "recorded_at": ts_rec},
                {"label": "ARED Adherence", "value": f"{ex_adherence:.0f}", "unit": "%", "baseline": ">= 90%", "recorded_at": ts_rec},
            ],
            "recent_trend": _trend("muscle_strength_idx", strength),
            "trend_label": "Muscle strength index (%)",
            "spaceflight_risk": "Postural muscles atrophy rapidly without high-load resistance in 0g and 0.38g, reducing EVA work endurance.",
            "action_label": "Start Health Assessment",
        },
        {
            "id": "bones",
            "name": "Bones",
            "status": bones_status,
            "summary": "Skeletal loading status & CSA TBone trabecular integrity",
            "measurements": [
                {"label": "Gravitational Load", "value": f"{grav_g}", "unit": "g", "baseline": "1.0 g Earth", "recorded_at": ts_rec},
                {"label": "Resistive Adherence", "value": f"{ex_adherence:.0f}", "unit": "%", "baseline": ">= 90%", "recorded_at": ts_rec},
                {"label": "Musculoskeletal Comfort", "value": f"Grade {latest.get('musculoskeletal_discomfort', 0)}", "unit": "/3", "baseline": "Grade 0", "recorded_at": ts_rec},
            ],
            "recent_trend": _trend("exercise_adherence_pct", ex_adherence),
            "trend_label": "Resistive loading adherence (%)",
            "spaceflight_risk": "CSA TBone shows incomplete trabecular recovery after prolonged unloading; partial Mars gravity (0.38g) still requires full axial loading.",
            "action_label": "Start Health Assessment",
        },
        {
            "id": "whole_body",
            "name": "Whole Body",
            "status": whole_status,
            "summary": "Cumulative radiation dose, core temperature & systemic mission readiness",
            "measurements": [
                {"label": "Cumulative Effective Dose", "value": f"{cum_msv:.1f}", "unit": "mSv", "baseline": "Tracked per Sol", "recorded_at": ts_rec},
                {"label": "Today Absorbed / Equiv", "value": f"{abs_dose:.2f} mGy / {eq_rate:.2f} mSv", "unit": "Day", "baseline": "~0.44 mGy / 1.07 mSv", "recorded_at": ts_rec},
                {"label": "Body Temperature", "value": f"{temp_c:.1f}", "unit": "°C", "baseline": f"{temp_base:.1f} °C", "recorded_at": ts_rec},
            ],
            "recent_trend": _trend("equivalent_dose_rate_msv_day", eq_rate),
            "trend_label": "Equivalent dose rate (mSv/day)",
            "spaceflight_risk": "All five spaceflight hazards interact systemically — elevated radiation, sleep loss, CO2, and gravity unloading compound overall fatigue.",
            "action_label": "Start Health Assessment",
        },
    ]

    # 3. Four-section Spaceflight Hazard Modules
    hazard_modules_4step = [
        {
            "id": "radiation",
            "title": "Space Radiation",
            "status": hazard_statuses.get("Space Radiation", "NORMAL"),
            "provenance": "Simulated Data + NASA RadLab & RDP References",
            "what_are_we_monitoring": f"Absorbed dose {abs_dose:.2f} mGy/day vs. biologically weighted equivalent dose {eq_rate:.2f} mSv/day (cumulative {cum_msv:.1f} mSv) via habitat TEPC and crew badge.",
            "what_has_changed": f"Latest event tag: {latest.get('radiation_event_type', 'GCR_BACKGROUND')}. Daily equivalent rate shifted vs. 0.76 mSv/day Mars nominal background.",
            "why_it_matters_in_space": "Beyond Earth's magnetic field, continuous Galactic Cosmic Rays (GCR) and sudden Solar Particle Events (SPE) damage DNA and cardiovascular tissue. Note: Gy measures physical energy deposited while Sv reflects biological risk; RadLab/RDP datasets are empirical analogs, not unapproved NASA flight limits.",
            "what_should_i_do_next": "Remain inside high-hydrogen water-wall or regolith-shielded sleeping quarters during elevated solar flux, verify dosimeter calibration, and queue dosimetry packets for ground review.",
        },
        {
            "id": "isolation",
            "title": "Isolation and Confinement",
            "status": hazard_statuses.get("Isolation and Confinement", "NORMAL"),
            "provenance": "Simulated Data + User Check-Ins (NASA HRP / CSA C-STARS)",
            "what_are_we_monitoring": f"Mood ({mood:.1f}/10), stress ({stress:.1f}/10), fatigue ({fatigue:.1f}/10), workload ({latest.get('workload_score', 6):.1f}/10), sleep duration ({sleep_h:.1f}h), and self-reported isolation check-ins.",
            "what_has_changed": f"Sleep is {sleep_delta:+.1f} hrs vs. personal baseline ({sleep_base:.1f}h) with quality at {latest.get('sleep_quality_pct', 80):.0f}%.",
            "why_it_matters_in_space": "Monotony, delayed Earth contact, and high workload in small habitats can erode sleep architecture and crew cohesion over months. This system monitors wellness trends without making psychiatric diagnoses.",
            "what_should_i_do_next": "Protect a consistent 7.5-hour sleep window, use scheduled morning blue light / evening dim-amber lighting, journal privately, and share workload transparently during crew huddle.",
        },
        {
            "id": "distance",
            "title": "Distance from Earth",
            "status": hazard_statuses.get("Distance from Earth", "NORMAL"),
            "provenance": "Simulated Link Mode + Local Offline Queue",
            "what_are_we_monitoring": f"Communication link state ({comm_norm['label']}), {comm_state.get('one_way_delay_minutes', 14.2)} min one-way signal latency, local RAG availability, and queued telemetry packets.",
            "what_has_changed": comm_norm["summary"],
            "why_it_matters_in_space": "Round-trip delays up to 44 minutes or solar blackouts make real-time tele-consultation impossible. Crew must diagnose changes, interpret procedures via local RAG, and escalate emergencies onboard.",
            "what_should_i_do_next": "Keep autonomous medical assessments running locally, review priority store-and-forward packets, and sync queued records whenever Earth bandwidth opens.",
        },
        {
            "id": "gravity",
            "title": "Gravity Fields",
            "status": hazard_statuses.get("Gravity Fields", "NORMAL"),
            "provenance": "Simulated Telemetry + CSA CCISS, CARDIOBREATH, TBone & Vascular",
            "what_are_we_monitoring": f"Current regime ({grav_g}g), resting HR ({round(hr)} BPM vs {round(hr_base)}), BP ({round(sys_bp)}/{round(dia_bp)} mmHg), dizziness grade ({latest.get('dizziness_severity', 0)}/3), muscle strength ({strength:.1f}%), and balance ({latest.get('balance_score', 88):.1f}%).",
            "what_has_changed": f"Resting HR shifted {hr_delta:+.0f} BPM and strength sits at {strength:.1f}% under {grav_g}g loading.",
            "why_it_matters_in_space": "Transitioning across 1g, 0g, and ~0.38g alters blood pressure regulation, arterial stiffness (CSA Vascular), trabecular bone mineral (CSA TBone), and inner-ear balance.",
            "what_should_i_do_next": "Maintain daily ARED resistive loading, aerobic cycling, fluid-electrolyte pre-hydration prior to upright tasks, and balance progression drills.",
        },
        {
            "id": "environment",
            "title": "Hostile and Closed Environments",
            "status": hazard_statuses.get("Hostile and Closed Environments", "NORMAL"),
            "provenance": "Simulated ECLSS Sensors + NASA EDA & OSDR References",
            "what_are_we_monitoring": f"Cabin CO2 ({co2:.1f} mmHg), O2 ({latest.get('oxygen_pct', 21.1):.1f}%), pressure ({latest.get('cabin_pressure_kpa', 70.3):.1f} kPa), temp ({latest.get('cabin_temp_c', 21.6):.1f}°C), humidity ({latest.get('humidity_pct', 42):.0f}%), AQI ({latest.get('air_quality_index', 30):.0f}), and respiratory comfort.",
            "what_has_changed": f"CO2 is {co2:.1f} mmHg with humidity {latest.get('humidity_pct', 42):.0f}% and active symptom log: {', '.join(latest.get('respiratory_symptoms') or ['None'])}.",
            "why_it_matters_in_space": "Sealed habitats accumulate CO2 pockets, airborne regolith dust, and surface microbes (NASA OSDR / EDA). Environmental irritants must be separated from infectious illness carefully — never auto-diagnosing infection.",
            "what_should_i_do_next": "Ensure portable bunk circulation fans run continuously, switch CDRA scrubber beds if CO2 > 3.0 mmHg, inspect HEPA seals, and monitor SpO2 plus temperature.",
        },
    ]

    # 4. Structured Assessment Explanation
    findings = base_assessment.get("findings", [])
    detected = [f.get("title", "") for f in findings] or ["Physiological telemetry within personal mission baseline."]
    contributing = [f"{c.get('metric')}: {c.get('current')} (baseline {c.get('baseline')})" for c in base_assessment.get("baseline_comparisons", []) if c.get("status") != "NORMAL"]
    if not contributing:
        contributing = [f"Heart Rate {round(hr)} BPM", f"SpO2 {spo2:.1f}%", f"Sleep {sleep_h:.1f} hrs", f"CO2 {co2:.1f} mmHg"]
    rel_hazards = sorted({f.get("hazard", "") for f in findings if f.get("hazard")}) or ["All Five Spaceflight Hazards Nominal"]

    structured_explanation = {
        "what_was_detected": detected,
        "contributing_measurements": contributing,
        "associated_factors": [
            f"Gravity regime: {grav_g}g ({latest.get('mission_phase', 'MARS_SURFACE').replace('_', ' ').title()})",
            f"Earth link: {comm_norm['label']} ({comm_state.get('one_way_delay_minutes', 14.2)} min one-way)",
            f"Habitat CO2 {co2:.1f} mmHg / Humidity {latest.get('humidity_pct', 40):.0f}%",
        ],
        "relevant_hazard": rel_hazards,
        "next_steps": [
            (r.get("action") or r.get("title") or "")
            for r in recs[:4]
            if (r.get("action") or r.get("title"))
        ]
        or ["Continue routine daily autonomous check-ins."],
    }

    # 5. Four-Category Health Guidance
    guidance_tiers = {
        "Immediate action": [
            {
                "action": "Verify cabin CO2 scrubber (CDRA) & increase crew quarters airflow if CO2 >= 3.0 mmHg or headache persists." if co2 >= 3.0 else "Maintain oral hydration (500 mL isotonic fluid) and rise gradually if experiencing orthostatic lightheadedness.",
                "rationale": "Elevated localized CO2 and post-transit hypovolemia are fast, reversible triggers of headache and elevated heart rate.",
                "source": "NASA EDA / CSA CCISS",
            },
            {
                "action": "Move rest schedule into water-wall shielded sleeping core if solar particle flux remains elevated." if eq_rate >= 1.4 else "Complete scheduled resistive + aerobic countermeasure session cleanly.",
                "rationale": "Hydrogen-rich water walls reduce secondary proton exposure during Solar Particle Events without delaying mission work.",
                "source": "NASA RadLab / RDP",
            },
        ],
        "Preventive action": [
            {
                "action": "Anchor a 7.5-hour protected sleep window with evening amber/dim lighting and pre-sleep cognitive decompression.",
                "rationale": "Multi-day sleep deficits degrade situational awareness and amplify stress responses under confined isolation.",
                "source": "NASA HRP Isolation & Confinement",
            },
            {
                "action": "Follow high-load ARED bone-loading sets + HEPA airlock dust wipe-down after EVA shifts.",
                "rationale": "Sustains trabecular bone turnover in 0.38g and limits closed-loop particulate airway irritation.",
                "source": "CSA TBone / NASA OSDR",
            },
        ],
        "Further assessment": [
            {
                "action": "Complete the 7-item Behavioral & Sleep Check-In and repeat seated-to-standing HR/BP check in 4 hours.",
                "rationale": "Longitudinal trend deltas against personal baseline reveal early trajectory shifts far better than single readings.",
                "source": "NASA Life Sciences Portal (NLSP)",
            },
            {
                "action": "Ask the MarsCare AI Health Assistant to cross-check symptoms against habitat ECLSS logs.",
                "rationale": "Separates environmental CO2/humidity effects from physiological changes cleanly offline.",
                "source": "NASA HRP / CSA C-STARS",
            },
        ],
        "Medical escalation": [
            {
                "action": "Initiate Crew Medical Officer (CMO) autonomous checklist and generate a Priority Store-and-Forward Earth packet if SpO2 < 92%, fever >= 38.0°C, syncope, or acute neurological symptoms develop.",
                "rationale": "Preserves immediate onboard safety under delayed/offline communications while queuing full context for Flight Surgeons.",
                "source": "NASA Distance from Earth Autonomous Medical Support",
            },
        ],
    }

    return {
        "comm_mode": comm_norm,
        "glance_summary": glance_summary,
        "marscare_body_regions": marscare_body_regions,
        "hazard_modules_4step": hazard_modules_4step,
        "structured_explanation": structured_explanation,
        "guidance_tiers": guidance_tiers,
    }
