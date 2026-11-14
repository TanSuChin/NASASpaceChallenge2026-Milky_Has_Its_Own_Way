export type RiskLevel = 'NORMAL' | 'WARNING' | 'CRITICAL';
export type MissionPhase = 'MICROGRAVITY_TRANSIT' | 'MARS_SURFACE' | 'EARTH_RETURN';
export type DataProvenance = 'REAL_RESEARCH_REF' | 'SYNTHETIC_DEMO' | 'USER_ENTERED' | 'SIMULATED_ENV';

export interface AstronautProfile {
  astronaut_id: string;
  name: string;
  role: string;
  age: number;
  mission_name: string;
  mission_day: number;
  current_phase: MissionPhase;
  gravity_g: number;
  baseline_hr_bpm: number;
  baseline_systolic_mmhg: number;
  baseline_diastolic_mmhg: number;
  baseline_spo2_pct: number;
  baseline_temp_c: number;
  baseline_sleep_hrs: number;
  baseline_sleep_quality_pct: number;
  baseline_mood_score: number;
  baseline_stress_score: number;
  baseline_muscle_strength_idx: number;
  baseline_balance_score: number;
  provenance: DataProvenance;
}

export interface TelemetryRecord {
  id?: number;
  timestamp: string;
  mission_day: number;
  mission_phase: MissionPhase;
  gravity_g: number;
  provenance: DataProvenance;
  absorbed_dose_mgy: number;
  absorbed_dose_rate_mgy_hr: number;
  equivalent_dose_msv: number;
  equivalent_dose_rate_msv_day: number;
  cumulative_effective_dose_msv: number;
  radiation_source: string;
  radiation_event_type: string;
  mood_score: number;
  stress_level: number;
  emotional_wellbeing: number;
  fatigue_level: number;
  workload_score: number;
  social_interaction_score: number;
  sleep_duration_hrs: number;
  sleep_quality_pct: number;
  sleep_schedule_window: string;
  sleep_irregularities: number;
  feeling_isolated: boolean;
  concentration_difficulty: boolean;
  motivation_level: number;
  heart_rate_bpm: number;
  systolic_bp_mmhg: number;
  diastolic_bp_mmhg: number;
  spo2_pct: number;
  body_temp_c: number;
  dizziness_severity: number;
  faintness_presyncope: boolean;
  physical_activity_mins: number;
  exercise_performance_pct: number;
  muscle_strength_idx: number;
  exercise_adherence_pct: number;
  musculoskeletal_discomfort: number;
  balance_score: number;
  coordination_score: number;
  spatial_disorientation: boolean;
  visual_disturbance_sans: boolean;
  cabin_temp_c: number;
  cabin_pressure_kpa: number;
  oxygen_pct: number;
  co2_mmhg: number;
  co2_ppm: number;
  humidity_pct: number;
  air_quality_index: number;
  env_warning_event: string;
  respiratory_symptoms: string[];
  infection_symptoms: string[];
  hygiene_adherence_pct: number;
  notes: string;
}

export interface BaselineComparison {
  metric: string;
  key: string;
  current: number;
  baseline: number;
  unit: string;
  delta: number;
  delta_pct: number;
  hazard: string;
}

export interface AssessmentFinding {
  hazard: string;
  severity: RiskLevel;
  title: string;
  detail: string;
  rule_type: string;
  ref_doc: string;
}

export interface RecommendationItem {
  hazard: string;
  priority: string;
  action: string;
  rationale: string;
  procedure_code: string;
  citation: string;
}

export interface ActiveAlert {
  id: string;
  hazard: string;
  severity: RiskLevel;
  message: string;
  action_required: string;
}

export interface BodyRegionMetric {
  name: string;
  value: string;
  baseline: string;
}

export interface BodyRegionAssessment {
  region_id: string;
  label: string;
  status: RiskLevel;
  hazards: string[];
  metrics: BodyRegionMetric[];
  summary: string;
  guidance: string;
  citation: string;
}

export interface RAGCitation {
  chunk_id: string;
  doc_id: string;
  title: string;
  agency: string;
  year: string;
  url: string;
  hazard_category: string;
  provenance: string;
  excerpt: string;
  relevance_score: number;
}

export interface RAGAnalysisResponse {
  query: string;
  engine_mode: string;
  sufficient_evidence: boolean;
  answer: string;
  safety_notice: string;
  citations: RAGCitation[];
}

export interface IntegratedAssessment {
  overall_status: RiskLevel;
  mission_day: number;
  mission_phase: MissionPhase;
  gravity_g: number;
  provenance: DataProvenance;
  rule_disclaimer: string;
  hazard_statuses: Record<string, RiskLevel>;
  baseline_comparisons: BaselineComparison[];
  findings: AssessmentFinding[];
  recommendations: RecommendationItem[];
  active_alerts: ActiveAlert[];
  body_regions: BodyRegionAssessment[];
  rag_analysis: RAGAnalysisResponse;
}

export interface StoreForwardReport {
  id?: number;
  report_uid: string;
  created_at: string;
  synced_at: string | null;
  mission_day: number;
  title: string;
  summary: string;
  risk_level: RiskLevel;
  hazard_triggers: string[];
  transmission_status: string;
  provenance: DataProvenance;
  payload_json?: Record<string, any>;
}

export interface PsychQuestionnaireRecord {
  id?: number;
  timestamp: string;
  mission_day: number;
  emotional_condition_rating: number;
  psychological_stress_rating: number;
  motivation_rating: number;
  fatigue_rating: number;
  sleep_difficulty_rating: number;
  isolation_feeling_rating: number;
  concentration_workload_rating: number;
  journal_reflection: string;
  provenance: DataProvenance;
}

export interface KnowledgeDocItem {
  doc_id: string;
  title: string;
  agency: string;
  year: string;
  url: string;
  hazard_category: string;
  provenance: string;
  content: string;
}

export interface EmergencyProtocolResult {
  protocol_id: string;
  protocol_title: string;
  execution_mode: string;
  earth_comm_status: string;
  one_way_delay_minutes: number;
  round_trip_delay_minutes: number;
  severity: string;
  trigger_hazard: string;
  mission_phase: string;
  reported_symptoms: string[];
  vital_signs_summary: string;
  immediate_steps: string[];
  supporting_citation: string;
  safety_disclaimer: string;
}

export interface FullSystemState {
  astronaut: AstronautProfile;
  latest_telemetry: TelemetryRecord;
  telemetry_history: TelemetryRecord[];
  assessment: IntegratedAssessment;
  radiation_limits: {
    daily_equivalent_warn_msv: number;
    daily_equivalent_crit_msv: number;
    cumulative_mission_warn_msv: number;
    cumulative_mission_limit_msv: number;
    rule_classification: string;
  };
  environmental_limits: {
    cabin_temp_min_c: number;
    cabin_temp_max_c: number;
    cabin_pressure_min_kpa: number;
    cabin_pressure_max_kpa: number;
    o2_min_pct: number;
    o2_max_pct: number;
    co2_warn_mmhg: number;
    co2_crit_mmhg: number;
    humidity_min_pct: number;
    humidity_max_pct: number;
    aqi_warn: number;
    aqi_crit: number;
    rule_classification: string;
  };
  comm_state: {
    earth_comm_status: string;
    one_way_delay_minutes: number;
    distance_million_km: number;
    last_sync_timestamp: string;
    offline_mode_forced: boolean;
    pending_reports_count: number;
    dsn_note: string;
  };
  store_forward_reports: StoreForwardReport[];
  psych_questionnaires: PsychQuestionnaireRecord[];
  knowledge_corpus: KnowledgeDocItem[];
}

