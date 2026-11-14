"""
Pydantic models and data schemas for TARSCARE AI.
Enforces strict unit preservation (Gy vs. Sv, mmHg, kPa, ppm, °C),
explicit data provenance tags, configurable thresholds, and non-diagnostic safety metadata.
"""

from __future__ import annotations
from enum import Enum
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field


class DataProvenance(str, Enum):
    REAL_RESEARCH_REF = "REAL_RESEARCH_REF"
    SYNTHETIC_DEMO = "SYNTHETIC_DEMO"
    USER_ENTERED = "USER_ENTERED"
    SIMULATED_ENV = "SIMULATED_ENV"


class MissionPhase(str, Enum):
    MICROGRAVITY_TRANSIT = "MICROGRAVITY_TRANSIT"
    MARS_SURFACE = "MARS_SURFACE"
    EARTH_RETURN = "EARTH_RETURN"


class RiskLevel(str, Enum):
    NORMAL = "NORMAL"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


class AstronautBaseline(BaseModel):
    astronaut_id: str = "ARES-IV-SUCHAI"
    name: str = "SuChai"
    role: str = "Mission Commander & Crew Medical Officer"
    age: int = 41
    mission_name: str = "Ares-Horizon IV Deep Space Mars Expedition"
    mission_day: int = 184
    current_phase: MissionPhase = MissionPhase.MARS_SURFACE
    gravity_g: float = 0.38
    # Individual physiological baseline established pre-flight & early nominal transit
    baseline_hr_bpm: float = 58.0
    baseline_systolic_mmhg: float = 112.0
    baseline_diastolic_mmhg: float = 71.0
    baseline_spo2_pct: float = 98.5
    baseline_temp_c: float = 36.6
    baseline_sleep_hrs: float = 7.6
    baseline_sleep_quality_pct: float = 88.0
    baseline_mood_score: float = 8.2
    baseline_stress_score: float = 2.4
    baseline_muscle_strength_idx: float = 100.0
    baseline_balance_score: float = 95.0
    provenance: DataProvenance = DataProvenance.SYNTHETIC_DEMO


class RadiationConfigLimits(BaseModel):
    daily_equivalent_warn_msv: float = Field(
        default=1.5,
        description="Mission-configured prototype daily warning threshold (mSv/day). Illustrative prototype rule, not a newly invented NASA legal standard.",
    )
    daily_equivalent_crit_msv: float = Field(
        default=5.0,
        description="Mission-configured prototype acute SPE daily threshold (mSv/day) triggering storm shelter protocol.",
    )
    cumulative_mission_warn_msv: float = Field(
        default=350.0,
        description="Mission-configured prototype cumulative warning threshold (mSv).",
    )
    cumulative_mission_limit_msv: float = Field(
        default=600.0,
        description="Reference career/mission effective dose ceiling (600 mSv NASA HRP reference benchmark).",
    )
    rule_classification: str = "MISSION_CONFIGURED_PROTOTYPE_RULE"


class EnvironmentalConfigLimits(BaseModel):
    cabin_temp_min_c: float = 18.5
    cabin_temp_max_c: float = 26.5
    cabin_pressure_min_kpa: float = 54.0
    cabin_pressure_max_kpa: float = 102.5
    o2_min_pct: float = 19.5
    o2_max_pct: float = 23.1
    co2_warn_mmhg: float = 3.0
    co2_crit_mmhg: float = 4.5
    humidity_min_pct: float = 30.0
    humidity_max_pct: float = 70.0
    aqi_warn: float = 50.0
    aqi_crit: float = 100.0
    rule_classification: str = "MISSION_CONFIGURED_PROTOTYPE_RULE"


class HealthMeasurementSubmission(BaseModel):
    mission_day: int = 184
    mission_phase: MissionPhase = MissionPhase.MARS_SURFACE
    gravity_g: float = 0.38
    provenance: DataProvenance = DataProvenance.USER_ENTERED

    # Module 1: Space Radiation
    absorbed_dose_mgy: float = Field(default=0.48, description="Absorbed physical dose in milliGray (mGy)")
    absorbed_dose_rate_mgy_hr: float = Field(default=0.020, description="Absorbed dose rate in mGy/hr")
    equivalent_dose_msv: float = Field(default=1.18, description="Biologically weighted equivalent dose in milliSievert (mSv)")
    equivalent_dose_rate_msv_day: float = Field(default=1.18, description="Equivalent dose rate in mSv/day")
    cumulative_effective_dose_msv: float = Field(default=168.4, description="Cumulative mission effective dose in mSv")
    radiation_source: str = Field(default="CREW_ACTIVE_DOSIMETER_BAND", description="Dosimeter source identifier")
    radiation_event_type: str = Field(default="GCR_BACKGROUND", description="GCR_BACKGROUND or SPE_SOLAR_STORM")

    # Module 2: Isolation & Confinement
    mood_score: float = Field(default=7.2, ge=1.0, le=10.0)
    stress_level: float = Field(default=4.1, ge=1.0, le=10.0)
    emotional_wellbeing: float = Field(default=7.4, ge=1.0, le=10.0)
    fatigue_level: float = Field(default=4.5, ge=1.0, le=10.0)
    workload_score: float = Field(default=6.5, ge=1.0, le=10.0)
    social_interaction_score: float = Field(default=7.5, ge=1.0, le=10.0)
    sleep_duration_hrs: float = Field(default=6.8, ge=0.0, le=16.0)
    sleep_quality_pct: float = Field(default=81.0, ge=0.0, le=100.0)
    sleep_schedule_window: str = Field(default="22:30 - 05:20 UTC-MARS")
    sleep_irregularities: int = Field(default=1, description="Number of awakenings or schedule shifts")
    feeling_isolated: bool = False
    concentration_difficulty: bool = False
    motivation_level: float = Field(default=7.8, ge=1.0, le=10.0)

    # Module 4: Gravity Fields & Physiological Adaptation
    heart_rate_bpm: float = Field(default=68.0, ge=30.0, le=220.0)
    systolic_bp_mmhg: float = Field(default=105.0, ge=60.0, le=220.0)
    diastolic_bp_mmhg: float = Field(default=68.0, ge=40.0, le=140.0)
    spo2_pct: float = Field(default=97.8, ge=70.0, le=100.0)
    respiratory_rate_bpm: float = Field(default=16.0, ge=6.0, le=45.0)
    body_temp_c: float = Field(default=36.7, ge=34.0, le=42.0)
    dizziness_severity: int = Field(default=1, ge=0, le=3, description="0=None, 1=Mild, 2=Moderate, 3=Severe")
    faintness_presyncope: bool = False
    physical_activity_mins: float = Field(default=95.0, ge=0.0, le=300.0)
    exercise_performance_pct: float = Field(default=91.0, ge=0.0, le=150.0)
    muscle_strength_idx: float = Field(default=93.5, ge=0.0, le=150.0)
    exercise_adherence_pct: float = Field(default=92.0, ge=0.0, le=100.0)
    musculoskeletal_discomfort: int = Field(default=1, ge=0, le=3)
    balance_score: float = Field(default=84.0, ge=0.0, le=100.0)
    coordination_score: float = Field(default=88.0, ge=0.0, le=100.0)
    spatial_disorientation: bool = False
    visual_disturbance_sans: bool = False

    # Module 5: Hostile & Closed Environments
    cabin_temp_c: float = Field(default=21.8)
    cabin_pressure_kpa: float = Field(default=70.3)
    oxygen_pct: float = Field(default=21.2)
    co2_mmhg: float = Field(default=2.8)
    co2_ppm: float = Field(default=3680.0)
    humidity_pct: float = Field(default=44.0)
    air_quality_index: float = Field(default=24.0)
    env_warning_event: str = Field(default="NONE")
    respiratory_symptoms: List[str] = Field(default_factory=list)
    infection_symptoms: List[str] = Field(default_factory=list)
    hygiene_adherence_pct: float = Field(default=96.0)
    notes: str = Field(default="Routine Sol check-in following Martian surface EVA preparation.")


class PsychQuestionnaireInput(BaseModel):
    mission_day: int = 184
    emotional_condition_rating: int = Field(default=7, ge=1, le=10)
    psychological_stress_rating: int = Field(default=4, ge=1, le=10)
    motivation_rating: int = Field(default=8, ge=1, le=10)
    fatigue_rating: int = Field(default=5, ge=1, le=10)
    sleep_difficulty_rating: int = Field(default=3, ge=1, le=10)
    isolation_feeling_rating: int = Field(default=3, ge=1, le=10)
    concentration_workload_rating: int = Field(default=6, ge=1, le=10)
    journal_reflection: str = Field(default="")
    provenance: DataProvenance = DataProvenance.USER_ENTERED


class CommStatusUpdate(BaseModel):
    earth_comm_status: str = Field(
        default="NOMINAL_DELAYED",
        description="NOMINAL_DELAYED, HIGH_LATENCY_DEGRADED, or CONJUNCTION_BLACKOUT",
    )
    one_way_delay_minutes: float = Field(default=14.2)
    offline_mode_forced: bool = Field(default=False)


class StoreForwardReportCreate(BaseModel):
    title: str
    summary: str
    risk_level: RiskLevel
    hazard_triggers: List[str]
    payload_snapshot: Dict[str, Any]
    provenance: DataProvenance = DataProvenance.USER_ENTERED


class EmergencyEscalationInput(BaseModel):
    trigger_hazard: str
    severity: RiskLevel = RiskLevel.CRITICAL
    reported_symptoms: List[str]
    vital_signs_summary: str
    mission_phase: MissionPhase = MissionPhase.MARS_SURFACE


class RAGQueryInput(BaseModel):
    question: str
    hazard_filter: Optional[str] = None
    include_astronaut_context: bool = True

