import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  FlaskConical,
  Link2,
  Link2Off,
  Search,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Upload,
  X,
} from 'lucide-react';
import {
  DeviceCatalogEntry,
  DeviceConnectionState,
  DeviceMeasurementRecord,
  FullSystemState,
  HardwareAttachmentItem,
} from '../types';
import { DeviceIllustration } from './DeviceIllustration';
import {
  apiRequest,
  classificationMeta,
  deviceImportTemplate,
  deviceStatusMeta,
  formatRecordedTime,
  statusMeta,
} from './uiHelpers';

interface MedicalDevicesViewProps {
  state: FullSystemState;
  onStateUpdated: (nextState: FullSystemState) => void;
  initialCategory?: string;
  initialDeviceId?: string;
  onNavigateTab?: (tab: 'overview' | 'assessment' | 'hazards' | 'ops' | 'assistant' | 'history' | 'comm') => void;
  onOpenSansModal?: () => void;
}

const CATEGORY_OPTIONS = [
  { id: 'all', label: 'All Categories' },
  { id: 'wearables', label: 'A · Wearables' },
  { id: 'imaging', label: 'B · Clinical Imaging' },
  { id: 'dosimetry', label: 'C · Radiation Dosimetry' },
  { id: 'telemedicine', label: 'D · Telemedicine & AI' },
  { id: 'biosamples', label: 'E · Biological Samples' },
  { id: 'behavioral_perf', label: 'F · Behavioural & Performance' },
];

type ConsoleMode = 'connect' | 'import' | 'exam' | 'biosample';

export const MedicalDevicesView: React.FC<MedicalDevicesViewProps> = ({
  state,
  onStateUpdated,
  initialCategory = 'all',
  initialDeviceId,
  onNavigateTab,
  onOpenSansModal,
}) => {
  const catalog = state.devices_catalog || [];
  const deviceStates: Record<string, DeviceConnectionState> = state.device_states || {};
  const deviceMeasurements = state.device_measurements || [];
  const hardwareExams = state.hardware_examinations || [];
  const biosamples = state.biosample_records || [];

  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategory || 'all');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(initialDeviceId || null);

  useEffect(() => {
    if (initialCategory) setCategoryFilter(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    if (initialDeviceId) setSelectedDeviceId(initialDeviceId);
  }, [initialDeviceId]);

  const selectedDevice: DeviceCatalogEntry | null = useMemo(
    () => catalog.find((d) => d.device_id === selectedDeviceId) || null,
    [catalog, selectedDeviceId],
  );

  // Modal console states
  const [consoleTab, setConsoleTab] = useState<ConsoleMode>('connect');
  const [busyMsg, setBusyMsg] = useState<string | null>(null);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    tone: 'info' | 'warning' | 'error' | 'success';
    text: string;
  } | null>(null);

  // Staged readings (shared by simulation & file import)
  const [stagedReadings, setStagedReadings] = useState<DeviceMeasurementRecord[]>([]);
  const [selectedUids, setSelectedUids] = useState<Record<string, boolean>>({});
  const [confirmNote, setConfirmNote] = useState<string>('');
  const [lastEvalStatus, setLastEvalStatus] = useState<string | null>(null);

  // File import state
  const [importFormat, setImportFormat] = useState<'csv' | 'json'>('csv');
  const [importFilename, setImportFilename] = useState<string>('device_export.csv');
  const [importRawText, setImportRawText] = useState<string>('');
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // Guided examination state
  const [examSummary, setExamSummary] = useState<string>('');
  const [examConfirmed, setExamConfirmed] = useState<boolean>(false);
  const [examAttachments, setExamAttachments] = useState<HardwareAttachmentItem[]>([]);
  const [examUpdateTelemetry, setExamUpdateTelemetry] = useState<boolean>(true);
  // Device-specific finding fields
  const [iopOd, setIopOd] = useState<string>('17.5');
  const [iopOs, setIopOs] = useState<string>('17.0');
  const [iopWavy, setIopWavy] = useState<boolean>(false);
  const [iopAcuity, setIopAcuity] = useState<boolean>(false);
  const [ultrasoundWindow, setUltrasoundWindow] = useState<string>('Cardiac & Internal Jugular Vein');
  const [ultrasoundCmoFlag, setUltrasoundCmoFlag] = useState<boolean>(false);
  const [mriStudyDate, setMriStudyDate] = useState<string>('2026-11-15');
  const [mriVentricle, setMriVentricle] = useState<boolean>(false);
  const [mriGlobe, setMriGlobe] = useState<boolean>(false);
  const [tboneVbmd, setTboneVbmd] = useState<string>('312.4');
  const [tboneDeltaPct, setTboneDeltaPct] = useState<string>('-1.2');
  const [cuffDuration, setCuffDuration] = useState<string>('45');
  const [cuffPressure, setCuffPressure] = useState<string>('30 mmHg Chibis/Brace');
  const [radinSerial, setRadinSerial] = useState<string>('RADIN2-HAB-04');
  const [radinLocation, setRadinLocation] = useState<string>('Crew Sleep Quarters B');
  const [radinBubbles, setRadinBubbles] = useState<string>('16');
  const [surveyMood, setSurveyMood] = useState<string>('7.4');
  const [surveyStress, setSurveyStress] = useState<string>('3.8');
  const [surveySleepQ, setSurveySleepQ] = useState<string>('82');
  const [surveyReflection, setSurveyReflection] = useState<string>('');
  const [postureBalance, setPostureBalance] = useState<string>('88');
  const [postureCoord, setPostureCoord] = useState<string>('90');
  const [ergoPower, setErgoPower] = useState<string>('175');
  const [ergoMins, setErgoMins] = useState<string>('35');
  const [ergoPerf, setErgoPerf] = useState<string>('91');
  const [ergoStrength, setErgoStrength] = useState<string>('93');
  const [veggieCrop, setVeggieCrop] = useState<string>('Outredgeous Red Romaine');
  const [veggieMoodLift, setVeggieMoodLift] = useState<string>('8');

  // Biosample state
  const [bioType, setBioType] = useState<string>('Saliva Filter-Paper Strip');
  const [bioStorage, setBioStorage] = useState<string>('MELFI Cold Stowage Tray 2');
  const [bioNotes, setBioNotes] = useState<string>('');
  const [assaySampleUid, setAssaySampleUid] = useState<string>('');
  const [assayFormat, setAssayFormat] = useState<'json' | 'csv'>('json');
  const [assayRaw, setAssayRaw] = useState<string>(
    '{"assays":[{"biomarker":"Salivary Cortisol","value":11.4,"unit":"nmol/L","interpretation":"Nominal diurnal baseline"}]}',
  );

  // Initialize modal state cleanly when user opens a device
  const openDeviceConsole = (dev: DeviceCatalogEntry) => {
    setSelectedDeviceId(dev.device_id);
    setFeedbackBanner(null);
    setStagedReadings([]);
    setSelectedUids({});
    setConfirmNote('');
    setLastEvalStatus(null);
    setImportErrors([]);
    setImportFormat('csv');
    setImportFilename(`${dev.device_id.toLowerCase()}_export.csv`);
    setImportRawText(deviceImportTemplate(dev.device_id));
    setExamSummary('');
    setExamConfirmed(false);
    setExamAttachments([]);

    if (dev.device_id === 'SALIVA_BLOTTING_BOOKLET') {
      setBioType('Saliva Filter-Paper Strip');
      setBioStorage('Dry Archive Booklet Slot S-04');
      setAssayRaw(
        '{"assays":[{"biomarker":"Salivary Cortisol","value":11.4,"unit":"nmol/L","interpretation":"Nominal diurnal baseline"}]}',
      );
      setConsoleTab('biosample');
    } else if (dev.device_id === 'BIOLOGICAL_SAMPLING_KIT') {
      setBioType('Whole Blood');
      setBioStorage('MELFI Cold Stowage -80°C');
      setAssayRaw(
        '{"assays":[{"biomarker":"Serum IL-6","value":2.1,"unit":"pg/mL","interpretation":"Within nominal inflight immune range"}]}',
      );
      setConsoleTab('biosample');
    } else if (dev.capabilities.supports_guided_exam && !dev.capabilities.supports_simulation) {
      setConsoleTab('exam');
    } else if (dev.capabilities.supports_import && !dev.capabilities.supports_simulation) {
      setConsoleTab('import');
    } else {
      setConsoleTab('connect');
    }
  };

  const refreshState = async () => {
    const fresh = await apiRequest<FullSystemState>('/api/state');
    onStateUpdated(fresh);
  };

  const filteredDevices = useMemo(() => {
    return catalog.filter((d) => {
      if (categoryFilter !== 'all' && d.category !== categoryFilter) return false;
      if (classFilter !== 'ALL' && d.integration_classification !== classFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${d.code} ${d.name} ${d.how_it_works} ${d.measures.join(' ')} ${d.body_systems.join(' ')}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [catalog, categoryFilter, classFilter, searchQuery]);

  const handleConnectHardware = async (dev: DeviceCatalogEntry, mode: 'hardware' | 'simulation') => {
    setBusyMsg(mode === 'hardware' ? 'Probing local hardware interfaces...' : 'Enabling labeled Simulation Mode...');
    setFeedbackBanner(null);
    try {
      const res = await apiRequest<{
        connected: boolean;
        connection_status: string;
        message: string;
      }>(`/api/devices/${dev.device_id}/connect`, {
        method: 'POST',
        body: JSON.stringify({ mode }),
      });
      await refreshState();
      setFeedbackBanner({
        tone: res.connection_status === 'simulation' ? 'warning' : 'error',
        text: res.message,
      });
    } catch (err) {
      setFeedbackBanner({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Unable to probe device connection.',
      });
    } finally {
      setBusyMsg(null);
    }
  };

  const handleDisconnect = async (dev: DeviceCatalogEntry) => {
    setBusyMsg('Disconnecting instrument...');
    try {
      await apiRequest(`/api/devices/${dev.device_id}/disconnect`, { method: 'POST' });
      setStagedReadings([]);
      await refreshState();
      setFeedbackBanner({
        tone: 'info',
        text: `${dev.name} disconnected. No active sensor stream or simulation running.`,
      });
    } catch (err) {
      setFeedbackBanner({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Disconnect failed.',
      });
    } finally {
      setBusyMsg(null);
    }
  };

  const handleCollectSimulated = async (dev: DeviceCatalogEntry) => {
    setBusyMsg('Collecting simulated readings anchored to crew baseline...');
    setFeedbackBanner(null);
    try {
      const res = await apiRequest<{
        staged_readings: DeviceMeasurementRecord[];
      }>(`/api/devices/${dev.device_id}/collect`, { method: 'POST' });
      const items = res.staged_readings || [];
      setStagedReadings(items);
      const sel: Record<string, boolean> = {};
      items.forEach((r) => {
        if (r.quality_status === 'valid') sel[r.record_uid] = true;
      });
      setSelectedUids(sel);
      await refreshState();
      setFeedbackBanner({
        tone: 'warning',
        text: `Generated ${items.length} Simulation Mode reading(s). Review units and check Confirmation before saving.`,
      });
    } catch (err) {
      setFeedbackBanner({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Simulation collection failed.',
      });
    } finally {
      setBusyMsg(null);
    }
  };

  const handleFileUpload = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    setImportFilename(f.name);
    if (f.name.toLowerCase().endsWith('.json')) setImportFormat('json');
    else setImportFormat('csv');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImportRawText(reader.result);
      }
    };
    reader.readAsText(f);
  };

  const handleParseImport = async (dev: DeviceCatalogEntry) => {
    setBusyMsg('Validating imported file units and physiological bounds...');
    setImportErrors([]);
    setFeedbackBanner(null);
    try {
      const res = await apiRequest<{
        parsed_readings: DeviceMeasurementRecord[];
        validation_errors: string[];
        valid_count: number;
        invalid_count: number;
      }>(`/api/devices/${dev.device_id}/parse-import`, {
        method: 'POST',
        body: JSON.stringify({
          format: importFormat,
          filename: importFilename || `upload.${importFormat}`,
          raw_text: importRawText,
        }),
      });
      const rows = res.parsed_readings || [];
      setStagedReadings(rows);
      setImportErrors(res.validation_errors || []);
      const sel: Record<string, boolean> = {};
      rows.forEach((r) => {
        if (r.quality_status === 'valid') sel[r.record_uid] = true;
      });
      setSelectedUids(sel);
      setFeedbackBanner({
        tone: res.invalid_count > 0 ? 'error' : 'info',
        text:
          res.invalid_count > 0
            ? `Validated ${res.valid_count} valid and ${res.invalid_count} invalid reading(s). Invalid rows cannot be confirmed.`
            : `Parsed ${res.valid_count} valid reading(s) from ${importFilename}. Confirm below to persist.`,
      });
    } catch (err) {
      setFeedbackBanner({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Failed to parse telemetry file.',
      });
    } finally {
      setBusyMsg(null);
    }
  };

  const handleConfirmMeasurements = async (dev: DeviceCatalogEntry, evaluateHealth: boolean) => {
    const selected = stagedReadings
      .filter((r) => selectedUids[r.record_uid])
      .map((r) => ({ ...r, confirmed: true }));
    if (selected.length === 0) {
      setFeedbackBanner({
        tone: 'error',
        text: 'Select and confirm at least one valid measurement before saving.',
      });
      return;
    }

    setBusyMsg(
      evaluateHealth
        ? 'Saving confirmed device measurements & running TARS Care Assessment Engine...'
        : 'Saving confirmed measurements to SQLite database...',
    );
    try {
      const res = await apiRequest<{
        saved_measurements: DeviceMeasurementRecord[];
        state: FullSystemState;
      }>(`/api/devices/${dev.device_id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({
          measurements: selected,
          evaluate_health_assessment: evaluateHealth,
          notes: confirmNote,
        }),
      });
      if (res.state && res.state.assessment) {
        onStateUpdated(res.state);
        setLastEvalStatus(res.state.assessment.overall_status);
      } else {
        await refreshState();
      }
      setStagedReadings([]);
      setSelectedUids({});
      setFeedbackBanner({
        tone: 'success',
        text: evaluateHealth
          ? `Confirmed ${res.saved_measurements.length} reading(s), persisted to SQLite, and updated Health Assessment.`
          : `Saved ${res.saved_measurements.length} confirmed reading(s) to local device history.`,
      });
    } catch (err) {
      setFeedbackBanner({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Confirmation rejected by backend validator.',
      });
    } finally {
      setBusyMsg(null);
    }
  };

  const handleAttachmentPick = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(ev.target.files || []).slice(0, 3);
    const items: HardwareAttachmentItem[] = [];
    for (const f of files) {
      let preview = '';
      if (f.size <= 900000 && (f.type.startsWith('text/') || f.name.endsWith('.json') || f.name.endsWith('.csv'))) {
        preview = await f.text();
      }
      items.push({
        filename: f.name,
        mime_type: f.type || 'application/octet-stream',
        size_bytes: f.size,
        summary: `Uploaded onboard file (${Math.max(1, Math.round(f.size / 1024))} KB)`,
        content_preview: preview.slice(0, 20000),
      });
    }
    setExamAttachments((prev) => [...prev, ...items].slice(0, 5));
  };

  const handleSaveExamination = async (dev: DeviceCatalogEntry) => {
    if (!examConfirmed) {
      setFeedbackBanner({
        tone: 'error',
        text: 'Please check confirmation before saving the examination record.',
      });
      return;
    }

    let findings: Record<string, unknown> = {};
    switch (dev.device_id) {
      case 'ULTRASOUND_VASCULAR':
        findings = {
          anatomical_window: ultrasoundWindow,
          cmo_review_requested: ultrasoundCmoFlag,
        };
        break;
      case 'OCULAR_TONOMETER_SANS':
        findings = {
          iop_od_mmhg: Number(iopOd),
          iop_os_mmhg: Number(iopOs),
          wavy_lines_detected: iopWavy,
          near_acuity_shift: iopAcuity,
        };
        break;
      case 'MRI_NEURO_OCULAR':
        findings = {
          scan_date: mriStudyDate,
          ventricular_enlargement: mriVentricle,
          globe_flattening: mriGlobe,
        };
        break;
      case 'TBONE_3D_SCANNER':
        findings = {
          vbmd_mg_ha_cm3: Number(tboneVbmd),
          bone_density_delta_pct: Number(tboneDeltaPct),
        };
        break;
      case 'THIGH_CUFFS_COUNTERMEASURE':
        findings = {
          duration_mins: Number(cuffDuration),
          compression_setting: cuffPressure,
          note: 'Fluid-shift countermeasure only (no vitals fabricated)',
        };
        break;
      case 'RADI_N2_BUBBLE':
        findings = {
          detector_serial: radinSerial,
          deployment_location: radinLocation,
          neutron_bubble_count: Number(radinBubbles),
        };
        break;
      case 'BEHAVIORAL_SURVEY_SUITE':
        findings = {
          survey_name: 'ARCHeR / C-STARS Behavioural Check',
          mood_score: Number(surveyMood),
          stress_level: Number(surveyStress),
          sleep_quality_pct: Number(surveySleepQ),
          private_reflection: surveyReflection,
        };
        break;
      case 'POSTUROGRAPHY_BALANCE':
        findings = {
          balance_score: Number(postureBalance),
          coordination_score: Number(postureCoord),
        };
        break;
      case 'CYCLE_ERGOMETER_ASTROFIT':
        findings = {
          ergometer_power_w: Number(ergoPower),
          physical_activity_mins: Number(ergoMins),
          exercise_performance_pct: Number(ergoPerf),
          muscle_strength_idx: Number(ergoStrength),
        };
        break;
      case 'VEGGIE_SPACE_GARDENING':
        findings = {
          crop_system: veggieCrop,
          subjective_wellbeing_rating: Number(veggieMoodLift),
          note: 'Space gardening wellbeing session',
        };
        break;
      default:
        findings = { manual_entry: true };
    }

    setBusyMsg('Saving examination record...');
    try {
      const res = await apiRequest<{
        examination: { abnormal_flag: boolean; abnormal_reason: string };
        state: FullSystemState;
      }>(`/api/devices/${dev.device_id}/examination`, {
        method: 'POST',
        body: JSON.stringify({
          mission_day: state.latest_telemetry.mission_day,
          summary: examSummary || `${dev.name} session logged on Sol ${state.latest_telemetry.mission_day}`,
          findings,
          attachments: examAttachments,
          confirmed: true,
          update_telemetry: examUpdateTelemetry,
        }),
      });
      onStateUpdated(res.state);
      setExamConfirmed(false);
      setFeedbackBanner({
        tone: res.examination.abnormal_flag ? 'warning' : 'success',
        text: res.examination.abnormal_flag
          ? `Saved with Clinical Flag: ${res.examination.abnormal_reason}`
          : `${dev.name} examination record saved to local history.`,
      });
    } catch (err) {
      setFeedbackBanner({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Unable to save examination record.',
      });
    } finally {
      setBusyMsg(null);
    }
  };

  const handleLogBiosample = async (dev: DeviceCatalogEntry) => {
    setBusyMsg('Registering biological specimen container...');
    try {
      const res = await apiRequest<{
        biosample: { sample_uid: string };
        state: FullSystemState;
      }>(`/api/devices/${dev.device_id}/biosample`, {
        method: 'POST',
        body: JSON.stringify({
          sample_type: bioType,
          mission_day: state.latest_telemetry.mission_day,
          storage_location: bioStorage,
          notes: bioNotes,
        }),
      });
      onStateUpdated(res.state);
      setAssaySampleUid(res.biosample.sample_uid);
      setFeedbackBanner({
        tone: 'success',
        text: `Specimen ${res.biosample.sample_uid} (${bioType}) recorded in storage log. Assay results may be imported separately when available.`,
      });
    } catch (err) {
      setFeedbackBanner({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Unable to register biosample.',
      });
    } finally {
      setBusyMsg(null);
    }
  };

  const handleImportAssay = async () => {
    if (!assaySampleUid) {
      setFeedbackBanner({ tone: 'error', text: 'Select a recorded specimen ID first.' });
      return;
    }
    setBusyMsg('Parsing and attaching laboratory assay results...');
    try {
      const res = await apiRequest<{ state: FullSystemState }>(
        `/api/devices/biosamples/${assaySampleUid}/assay`,
        {
          method: 'POST',
          body: JSON.stringify({
            raw_text: assayRaw,
            format: assayFormat,
            filename: `${assaySampleUid}_assay.${assayFormat}`,
            notes: 'Imported lab biomarker report',
          }),
        },
      );
      onStateUpdated(res.state);
      setFeedbackBanner({
        tone: 'success',
        text: `Laboratory assay results attached cleanly to specimen ${assaySampleUid}.`,
      });
    } catch (err) {
      setFeedbackBanner({
        tone: 'error',
        text: err instanceof Error ? err.message : 'Assay import failed.',
      });
    } finally {
      setBusyMsg(null);
    }
  };

  const getLastActivityForDevice = (deviceId: string): string => {
    const meas = deviceMeasurements.find((m) => m.device_id === deviceId);
    const exam = hardwareExams.find((e) => e.device_id === deviceId);
    const bio = biosamples.find((b) => b.device_id === deviceId);
    if (meas) {
      return `${meas.measurement_type.replace(/_/g, ' ')}: ${meas.value ?? meas.value_text} ${meas.unit} (${formatRecordedTime(meas.recorded_at)})`;
    }
    if (exam) {
      return `${exam.exam_type.replace(/_/g, ' ')} · Sol ${exam.mission_day} (${formatRecordedTime(exam.recorded_at)})`;
    }
    if (bio) {
      return `${bio.specimen_type} · ${bio.status} (${formatRecordedTime(bio.collected_at)})`;
    }
    return 'No measurements recorded yet';
  };

  const simActiveCount = Object.values(deviceStates).filter(
    (s) => s.connection_status === 'simulation',
  ).length;
  const connectedCount = Object.values(deviceStates).filter(
    (s) => s.connection_status === 'connected',
  ).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="mc-card p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-bold text-[var(--tc-text)]">
              Medical Tools &amp; Connected Devices
            </h1>
            <p className="text-sm text-[var(--tc-text-secondary)] mt-1.5 leading-relaxed">
              NASA and Canadian Space Agency (CSA) flight medical instruments organized by physiological category.
              Real vendor streams activate ONLY when documented local hardware bridges exist; otherwise use File Import (CSV/JSON),
              Guided Examinations, or clearly labeled Simulation Mode.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-lg bg-[var(--tc-elevated)] border border-[var(--tc-border)] text-[var(--tc-text)]">
              {catalog.length} Documented Instruments
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
              {connectedCount} Physical Connected
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300">
              {simActiveCount} Simulation Active
            </span>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--tc-border)]" role="tablist" aria-label="Device medical categories">
          {CATEGORY_OPTIONS.map((cat) => {
            const active = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  active
                    ? 'bg-[var(--tc-btn-bg)] text-[var(--tc-btn-fg)]'
                    : 'bg-[var(--tc-elevated)] text-[var(--tc-text-secondary)] hover:text-[var(--tc-text)] border border-[var(--tc-border)]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Search & Classification Filter */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label htmlFor="device-search-input" className="block text-xs text-[var(--tc-text-secondary)] mb-1">
              Search Instruments, Measurements, or Body System
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-[var(--tc-text-secondary)] absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
              <input
                id="device-search-input"
                name="device_search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g., Bio-Monitor, EVARM, Eye-Pressure, mSv, Cortisol..."
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-[var(--tc-bg)] border border-[var(--tc-border)] text-sm text-[var(--tc-text)] placeholder-[#E5E5E4]/40 focus:outline-none focus:border-[#A5D8FF]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="device-class-filter" className="block text-xs text-[var(--tc-text-secondary)] mb-1">
              Integration Availability Filter
            </label>
            <select
              id="device-class-filter"
              name="device_classification"
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[var(--tc-bg)] border border-[var(--tc-border)] text-sm text-[var(--tc-text)] focus:outline-none focus:border-[#A5D8FF]"
            >
              <option value="ALL">All Classifications</option>
              <option value="SIMULATION_AVAILABLE">Simulation Available</option>
              <option value="IMPORT_SUPPORTED">Import Supported</option>
              <option value="GUIDED_EXAMINATION">Guided Examination</option>
              <option value="NOT_INTEGRATED">Not Integrated (Concept Reference)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Catalogue Card Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredDevices.map((dev) => {
          const dState = deviceStates[dev.device_id];
          const status = dState?.connection_status || 'not_connected';
          const sMeta = deviceStatusMeta(status);
          const cMeta = classificationMeta(dev.integration_classification);
          const primaryActionLabel = dev.capabilities.supports_simulation
            ? 'Connect / Simulate'
            : dev.capabilities.supports_biosample
              ? 'Log Specimen / Assay'
              : dev.capabilities.supports_guided_exam
                ? 'Start Examination'
                : dev.capabilities.supports_import
                  ? 'Import Results'
                  : 'View Platform Concept';

          return (
            <article
              key={dev.device_id}
              data-device-id={dev.device_id}
              className="mc-card p-5 flex flex-col justify-between gap-4 border border-[var(--tc-border)] hover:border-[var(--tc-border)] transition"
            >
              <div className="space-y-3">
                {/* Header row */}
                <div className="flex items-start gap-4">
                  <DeviceIllustration type={dev.illustration_type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-mono text-[var(--tc-accent)]">
                        {dev.code} · {dev.category_label.replace(/^Category [A-F] · /, '')}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${sMeta.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sMeta.dotClass}`} />
                        {sMeta.label}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-[var(--tc-text)] mt-1">{dev.name}</h2>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${cMeta.badgeClass}`}>
                        {cMeta.label}
                      </span>
                      {dev.body_systems.map((sys) => (
                        <span
                          key={sys}
                          className="px-2 py-0.5 rounded text-xs bg-[var(--tc-bg)] border border-[var(--tc-border)] text-[var(--tc-text-secondary)]"
                        >
                          {sys}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* How it works */}
                <p className="text-xs text-[var(--tc-text-secondary)] leading-relaxed">{dev.how_it_works}</p>

                {/* Measures & Output Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[var(--tc-bg)] rounded-lg p-3 border border-[var(--tc-border)] text-xs">
                  <div>
                    <div className="font-semibold text-[var(--tc-text)] mb-1">Measures &amp; Purpose</div>
                    <ul className="space-y-0.5 text-[var(--tc-text-secondary)] list-disc pl-4">
                      {dev.measures.map((m) => (
                        <li key={m}>{m}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="font-semibold text-[var(--tc-text)] mb-0.5">Supported Data Output</div>
                      <div className="text-[var(--tc-text-secondary)]">{dev.supported_outputs.join(' · ')}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-[var(--tc-text)] mb-0.5">Integration Method</div>
                      <div className="text-[var(--tc-text-secondary)]">{dev.connection_methods.join(' · ')}</div>
                    </div>
                  </div>
                </div>

                {/* Limitations notice (truthful engineering) */}
                <div className="text-xs text-[var(--tc-text-secondary)] bg-[var(--tc-elevated)] border border-[var(--tc-border)] rounded-lg px-3 py-2">
                  <strong className="text-[var(--tc-text)]">Truthful Scope:</strong> {dev.limitations_notice}
                </div>

                {/* Verified NASA / CSA References */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[var(--tc-text-secondary)]">Official References:</span>
                  {dev.research_references.map((ref) => (
                    <a
                      key={ref.url + ref.label}
                      href={ref.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[var(--tc-accent)] hover:underline"
                    >
                      [{ref.agency}] {ref.label}
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Footer Status + Actions */}
              <div className="pt-3 border-t border-[var(--tc-border)] flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-[var(--tc-text-secondary)]">
                  <span className="text-[var(--tc-text-secondary)]">Last activity: </span>
                  <span className="text-[var(--tc-text)]">{getLastActivityForDevice(dev.device_id)}</span>
                </div>
                <div className="flex items-center gap-2">
                  {(status === 'simulation' || status === 'connected' || status === 'unavailable' || status === 'error') && (
                    <button
                      type="button"
                      onClick={() => handleDisconnect(dev)}
                      className="px-2.5 py-1.5 rounded-lg text-xs border border-[var(--tc-border)] text-[var(--tc-text-secondary)] hover:text-[var(--tc-text)] bg-[var(--tc-elevated)] inline-flex items-center gap-1"
                    >
                      <Link2Off className="w-3.5 h-3.5" aria-hidden="true" />
                      Disconnect
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openDeviceConsole(dev)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--tc-btn-bg)] text-[var(--tc-btn-fg)] hover:bg-white transition inline-flex items-center gap-1.5"
                  >
                    <Stethoscope className="w-3.5 h-3.5" aria-hidden="true" />
                    {primaryActionLabel}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Interactive Device Workflow Modal Console */}
      {selectedDevice && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="device-console-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
        >
          <div className="mc-card max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-5 border border-[var(--tc-border)]">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[var(--tc-border)] pb-4">
              <div className="flex items-start gap-3">
                <DeviceIllustration type={selectedDevice.illustration_type} />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-[var(--tc-accent)]">{selectedDevice.code}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        deviceStatusMeta(deviceStates[selectedDevice.device_id]?.connection_status).badgeClass
                      }`}
                    >
                      {deviceStatusMeta(deviceStates[selectedDevice.device_id]?.connection_status).label}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${classificationMeta(selectedDevice.integration_classification).badgeClass}`}>
                      {classificationMeta(selectedDevice.integration_classification).label}
                    </span>
                  </div>
                  <h2 id="device-console-title" className="text-xl font-bold text-[var(--tc-text)] mt-1">
                    {selectedDevice.name}
                  </h2>
                  <p className="text-xs text-[var(--tc-text-secondary)] mt-0.5">{selectedDevice.limitations_notice}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close instrument workflow dialog"
                onClick={() => setSelectedDeviceId(null)}
                className="p-2 rounded-lg bg-[var(--tc-elevated)] border border-[var(--tc-border)] text-[var(--tc-text-secondary)] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setConsoleTab('connect')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                  consoleTab === 'connect'
                    ? 'bg-[var(--tc-btn-bg)] text-[var(--tc-btn-fg)]'
                    : 'bg-[var(--tc-elevated)] text-[var(--tc-text-secondary)] border border-[var(--tc-border)]'
                }`}
              >
                Connection &amp; Simulation
              </button>
              {selectedDevice.capabilities.supports_import && (
                <button
                  type="button"
                  onClick={() => setConsoleTab('import')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    consoleTab === 'import'
                      ? 'bg-[var(--tc-btn-bg)] text-[var(--tc-btn-fg)]'
                      : 'bg-[var(--tc-elevated)] text-[var(--tc-text-secondary)] border border-[var(--tc-border)]'
                  }`}
                >
                  Import CSV / JSON
                </button>
              )}
              {selectedDevice.capabilities.supports_guided_exam && (
                <button
                  type="button"
                  onClick={() => setConsoleTab('exam')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    consoleTab === 'exam'
                      ? 'bg-[var(--tc-btn-bg)] text-[var(--tc-btn-fg)]'
                      : 'bg-[var(--tc-elevated)] text-[var(--tc-text-secondary)] border border-[var(--tc-border)]'
                  }`}
                >
                  {selectedDevice.capabilities.is_countermeasure_only || selectedDevice.capabilities.is_wellbeing_activity
                    ? 'Log Activity / Session'
                    : 'Guided Examination & Uploads'}
                </button>
              )}
              {selectedDevice.capabilities.supports_biosample && (
                <button
                  type="button"
                  onClick={() => setConsoleTab('biosample')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                    consoleTab === 'biosample'
                      ? 'bg-[var(--tc-btn-bg)] text-[var(--tc-btn-fg)]'
                      : 'bg-[var(--tc-elevated)] text-[var(--tc-text-secondary)] border border-[var(--tc-border)]'
                  }`}
                >
                  Specimen &amp; Lab Assay Import
                </button>
              )}
            </div>

            {/* Status / Error Feedback */}
            {busyMsg && (
              <div className="rounded-lg bg-[var(--tc-elevated)] border border-[var(--tc-border-strong)] px-4 py-2.5 text-xs text-[var(--tc-accent)]">
                {busyMsg}
              </div>
            )}
            {feedbackBanner && (
              <div
                className={`rounded-lg px-4 py-3 text-xs border flex items-start justify-between gap-3 ${
                  feedbackBanner.tone === 'error'
                    ? 'bg-red-500/15 border-red-500/35 text-red-200'
                    : feedbackBanner.tone === 'warning'
                      ? 'bg-amber-500/15 border-amber-500/35 text-amber-200'
                      : feedbackBanner.tone === 'success'
                        ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-200'
                        : 'bg-[var(--tc-elevated)] border-[var(--tc-border)] text-[var(--tc-text)]'
                }`}
              >
                <div className="space-y-1">
                  <div>{feedbackBanner.text}</div>
                  {lastEvalStatus && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span>Updated Crew Health Status:</span>
                      <span className={`px-2 py-0.5 rounded font-semibold ${statusMeta(lastEvalStatus).badgeClass}`}>
                        {statusMeta(lastEvalStatus).label}
                      </span>
                      {onNavigateTab && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDeviceId(null);
                            onNavigateTab('assessment');
                          }}
                          className="underline text-[var(--tc-accent)] hover:text-white"
                        >
                          Open Health Assessment &amp; Recommendations →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 1: CONNECT & SIMULATION */}
            {consoleTab === 'connect' && (
              <div className="space-y-4">
                <div className="rounded-xl bg-[var(--tc-bg)] border border-[var(--tc-border)] p-4 space-y-3">
                  <div className="text-sm font-semibold text-[var(--tc-text)]">
                    Hardware Connection Probe vs. Labeled Simulation Mode
                  </div>
                  <p className="text-xs text-[var(--tc-text-secondary)]">
                    Clicking <strong>Connect Physical Hardware</strong> queries local USB, serial, or documented adapters honestly.
                    If no physical flight hardware is present on this computer, TARS Care marks it <strong>Hardware Unavailable</strong> instead of faking a live sensor stream.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleConnectHardware(selectedDevice, 'hardware')}
                      className="px-3.5 py-2 rounded-lg text-xs font-medium bg-[var(--tc-elevated)] border border-[var(--tc-border)] text-[var(--tc-text)] hover:border-[var(--tc-border)] inline-flex items-center gap-1.5"
                    >
                      <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
                      Connect Physical Hardware
                    </button>

                    {selectedDevice.capabilities.supports_simulation && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleConnectHardware(selectedDevice, 'simulation')}
                          className="px-3.5 py-2 rounded-lg text-xs font-medium bg-amber-500/15 border border-amber-500/35 text-amber-200 hover:bg-amber-500/25 inline-flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                          Enable Simulation Mode
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCollectSimulated(selectedDevice)}
                          className="px-3.5 py-2 rounded-lg text-xs font-semibold bg-[var(--tc-btn-bg)] text-[var(--tc-btn-fg)] hover:bg-white inline-flex items-center gap-1.5"
                        >
                          <Activity className="w-3.5 h-3.5" aria-hidden="true" />
                          Collect Simulated Readings
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDisconnect(selectedDevice)}
                      className="px-3 py-2 rounded-lg text-xs bg-[var(--tc-elevated)] border border-[var(--tc-border)] text-[var(--tc-text-secondary)] hover:text-white inline-flex items-center gap-1.5"
                    >
                      <Link2Off className="w-3.5 h-3.5" aria-hidden="true" />
                      Disconnect
                    </button>
                  </div>

                  {deviceStates[selectedDevice.device_id]?.last_error && (
                    <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/25 rounded-lg p-3">
                      <strong>Last Hardware Probe Result:</strong> {deviceStates[selectedDevice.device_id]?.last_error}
                    </div>
                  )}

                  {selectedDevice.device_id === 'ARTEMIS_AI_CONCEPT' && onNavigateTab && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDeviceId(null);
                          onNavigateTab('assessment');
                        }}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--tc-btn-bg)] text-[var(--tc-btn-fg)]"
                      >
                        Go to TARS Care Local Health Assessment Engine →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: FILE IMPORT */}
            {consoleTab === 'import' && selectedDevice.capabilities.supports_import && (
              <div className="rounded-xl bg-[var(--tc-bg)] border border-[var(--tc-border)] p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-semibold text-[var(--tc-text)]">
                    Import Device Telemetry Export (CSV or JSON)
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setImportFormat('csv');
                      setImportFilename(`${selectedDevice.device_id.toLowerCase()}_sample.csv`);
                      setImportRawText(deviceImportTemplate(selectedDevice.device_id));
                    }}
                    className="px-2.5 py-1 rounded text-xs bg-[var(--tc-elevated)] border border-[var(--tc-border)] text-[var(--tc-accent)] hover:border-[var(--tc-border-strong)]"
                  >
                    Load Device CSV Template
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="device-import-file" className="block text-xs text-[var(--tc-text-secondary)] mb-1">
                      Upload Local Telemetry File (.csv, .json)
                    </label>
                    <input
                      id="device-import-file"
                      name="device_import_file"
                      type="file"
                      accept=".csv,.json,.txt"
                      onChange={handleFileUpload}
                      className="block w-full text-xs text-[var(--tc-text-secondary)] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--tc-elevated)] file:text-[var(--tc-text)]"
                    />
                  </div>

                  <div>
                    <label htmlFor="device-import-format" className="block text-xs text-[var(--tc-text-secondary)] mb-1">
                      Parser Format
                    </label>
                    <select
                      id="device-import-format"
                      name="device_import_format"
                      value={importFormat}
                      onChange={(e) => setImportFormat(e.target.value as 'csv' | 'json')}
                      className="w-full px-3 py-1.5 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-xs text-[var(--tc-text)]"
                    >
                      <option value="csv">CSV (measurement_type,value,unit,recorded_at)</option>
                      <option value="json">JSON Array or &#123;measurements: [...]&#125;</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="device-import-textarea" className="block text-xs text-[var(--tc-text-secondary)] mb-1">
                    Raw Telemetry Payload (units &amp; Gy/Sv separation enforced automatically)
                  </label>
                  <textarea
                    id="device-import-textarea"
                    name="device_import_raw"
                    rows={5}
                    value={importRawText}
                    onChange={(e) => setImportRawText(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] font-mono text-xs text-[var(--tc-text)]"
                  />
                </div>

                {importErrors.length > 0 && (
                  <div className="rounded-lg bg-red-500/15 border border-red-500/35 p-3 text-xs text-red-200 space-y-1">
                    <div className="font-semibold flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4" aria-hidden="true" />
                      Validation Errors Detected
                    </div>
                    {importErrors.map((err, i) => (
                      <div key={i}>• {err}</div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleParseImport(selectedDevice)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--tc-btn-bg)] text-[var(--tc-btn-fg)] hover:bg-white inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  Parse &amp; Validate Units
                </button>
              </div>
            )}

            {/* SHARED STAGED CONFIRMATION WORKFLOW (Simulation & File Import) */}
            {stagedReadings.length > 0 && (
              <div className="rounded-xl bg-[var(--tc-elevated)] border border-[var(--tc-border-strong)] p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-bold text-[var(--tc-text)]">
                    Astronaut Review &amp; Confirmation ({stagedReadings.length} readings staged)
                  </div>
                  <span className="text-xs text-amber-300">
                    Unconfirmed readings are NOT saved to health records
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-[var(--tc-border)] text-[var(--tc-text-secondary)]">
                        <th className="py-2 pr-2">Confirm</th>
                        <th className="py-2 pr-3">Measurement</th>
                        <th className="py-2 pr-3">Value &amp; Unit</th>
                        <th className="py-2 pr-3">Source</th>
                        <th className="py-2 pr-3">Validation</th>
                        <th className="py-2">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {stagedReadings.map((r) => {
                        const isValid = r.quality_status === 'valid';
                        return (
                          <tr key={r.record_uid}>
                            <td className="py-2 pr-2">
                              <input
                                id={`confirm-row-${r.record_uid}`}
                                name={`confirm_${r.record_uid}`}
                                type="checkbox"
                                disabled={!isValid}
                                checked={Boolean(selectedUids[r.record_uid])}
                                onChange={(e) =>
                                  setSelectedUids((prev) => ({
                                    ...prev,
                                    [r.record_uid]: e.target.checked,
                                  }))
                                }
                                aria-label={`Confirm ${r.measurement_type} reading`}
                              />
                            </td>
                            <td className="py-2 pr-3 font-medium text-[var(--tc-text)]">
                              {r.measurement_type.replace(/_/g, ' ')}
                            </td>
                            <td className="py-2 pr-3 font-mono text-[var(--tc-accent)]">
                              {r.value ?? r.value_text ?? '—'} {r.unit}
                            </td>
                            <td className="py-2 pr-3">
                              <span
                                className={`px-2 py-0.5 rounded text-[11px] ${
                                  r.data_source === 'simulated'
                                    ? 'bg-amber-500/15 text-amber-300'
                                    : 'bg-[var(--tc-bg)] text-[var(--tc-text)] border border-[var(--tc-border)]'
                                }`}
                              >
                                {r.data_source === 'simulated' ? 'SIMULATED DEMO' : r.data_source}
                              </span>
                            </td>
                            <td className="py-2 pr-3">
                              <span className={isValid ? 'text-emerald-300' : 'text-red-300'}>
                                {r.quality_status}: {r.quality_note}
                              </span>
                            </td>
                            <td className="py-2 text-[var(--tc-text-secondary)]">{formatRecordedTime(r.recorded_at)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div>
                  <label htmlFor="confirm-device-note" className="block text-xs text-[var(--tc-text-secondary)] mb-1">
                    Astronaut / CMO Verification Note (Optional)
                  </label>
                  <input
                    id="confirm-device-note"
                    name="confirm_device_note"
                    type="text"
                    value={confirmNote}
                    onChange={(e) => setConfirmNote(e.target.value)}
                    placeholder="e.g., Post-exercise resting confirmation, Sol 184"
                    className="w-full px-3 py-1.5 rounded-lg bg-[var(--tc-bg)] border border-[var(--tc-border)] text-xs text-[var(--tc-text)]"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleConfirmMeasurements(selectedDevice, true)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--tc-btn-bg)] text-[var(--tc-btn-fg)] hover:bg-white inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Confirm, Save &amp; Run Health Assessment
                  </button>
                  <button
                    type="button"
                    onClick={() => handleConfirmMeasurements(selectedDevice, false)}
                    className="px-3.5 py-2 rounded-lg text-xs font-medium bg-[var(--tc-bg)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                  >
                    Confirm &amp; Save Only
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: GUIDED EXAMINATION / COUNTERMEASURE / ACTIVITY */}
            {consoleTab === 'exam' && selectedDevice.capabilities.supports_guided_exam && (
              <div className="rounded-xl bg-[var(--tc-bg)] border border-[var(--tc-border)] p-4 space-y-4">
                <div className="text-sm font-semibold text-[var(--tc-text)]">
                  Guided Examination &amp; Clinical Session Form
                </div>

                {selectedDevice.device_id === 'ULTRASOUND_VASCULAR' && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-200">
                      <AlertTriangle className="w-4 h-4 inline mr-1.5" aria-hidden="true" />
                      TARS Care logs ultrasound exam dates, vascular/cardiac window notes, and uploaded reports/images only. It does NOT perform automated ultrasound scanning or diagnosis.
                    </div>
                    <div>
                      <label htmlFor="us-window-input" className="block text-[var(--tc-text-secondary)] mb-1">
                        Ultrasound Anatomical Window / Protocol
                      </label>
                      <input
                        id="us-window-input"
                        name="ultrasound_window"
                        type="text"
                        value={ultrasoundWindow}
                        onChange={(e) => setUltrasoundWindow(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                      />
                    </div>
                    <label htmlFor="us-cmo-flag" className="inline-flex items-center gap-2 text-[var(--tc-text)]">
                      <input
                        id="us-cmo-flag"
                        name="ultrasound_cmo_flag"
                        type="checkbox"
                        checked={ultrasoundCmoFlag}
                        onChange={(e) => setUltrasoundCmoFlag(e.target.checked)}
                      />
                      Flag exam images/notes for priority Earth Flight Surgeon review
                    </label>
                  </div>
                )}

                {selectedDevice.device_id === 'OCULAR_TONOMETER_SANS' && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="iop-od-input" className="block text-[var(--tc-text-secondary)] mb-1">
                          Right Eye IOP OD (mmHg) — Flagged if &gt; 21 mmHg
                        </label>
                        <input
                          id="iop-od-input"
                          name="iop_od_mmhg"
                          type="number"
                          step="0.5"
                          value={iopOd}
                          onChange={(e) => setIopOd(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                        />
                      </div>
                      <div>
                        <label htmlFor="iop-os-input" className="block text-[var(--tc-text-secondary)] mb-1">
                          Left Eye IOP OS (mmHg) — Flagged if asymmetry &gt;= 4 mmHg
                        </label>
                        <input
                          id="iop-os-input"
                          name="iop_os_mmhg"
                          type="number"
                          step="0.5"
                          value={iopOs}
                          onChange={(e) => setIopOs(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <label htmlFor="iop-wavy-check" className="inline-flex items-center gap-2 text-[var(--tc-text)]">
                        <input
                          id="iop-wavy-check"
                          name="iop_wavy"
                          type="checkbox"
                          checked={iopWavy}
                          onChange={(e) => setIopWavy(e.target.checked)}
                        />
                        Wavy lines / Amsler distortion detected
                      </label>
                      <label htmlFor="iop-acuity-check" className="inline-flex items-center gap-2 text-[var(--tc-text)]">
                        <input
                          id="iop-acuity-check"
                          name="iop_acuity"
                          type="checkbox"
                          checked={iopAcuity}
                          onChange={(e) => setIopAcuity(e.target.checked)}
                        />
                        Hyperopic near-acuity shift noticed
                      </label>
                    </div>
                    {onOpenSansModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDeviceId(null);
                          onOpenSansModal();
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[var(--tc-elevated)] border border-[var(--tc-border-strong)] text-[var(--tc-accent)]"
                      >
                        Launch Interactive 8×8 SANS Amsler Vision Grid →
                      </button>
                    )}
                  </div>
                )}

                {selectedDevice.device_id === 'MRI_NEURO_OCULAR' && (
                  <div className="space-y-3 text-xs">
                    <div className="text-[var(--tc-text-secondary)]">
                      Specialized ground/medical-facility MRI archive only — NOT an onboard wearable or continuous spacecraft sensor.
                    </div>
                    <div>
                      <label htmlFor="mri-date-input" className="block text-[var(--tc-text-secondary)] mb-1">
                        MRI Examination Date
                      </label>
                      <input
                        id="mri-date-input"
                        name="mri_scan_date"
                        type="date"
                        value={mriStudyDate}
                        onChange={(e) => setMriStudyDate(e.target.value)}
                        className="w-full sm:w-64 px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                      />
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <label htmlFor="mri-vent-check" className="inline-flex items-center gap-2 text-[var(--tc-text)]">
                        <input
                          id="mri-vent-check"
                          name="mri_ventricle"
                          type="checkbox"
                          checked={mriVentricle}
                          onChange={(e) => setMriVentricle(e.target.checked)}
                        />
                        Ventricular volume change noted in radiology report
                      </label>
                      <label htmlFor="mri-globe-check" className="inline-flex items-center gap-2 text-[var(--tc-text)]">
                        <input
                          id="mri-globe-check"
                          name="mri_globe"
                          type="checkbox"
                          checked={mriGlobe}
                          onChange={(e) => setMriGlobe(e.target.checked)}
                        />
                        Posterior ocular globe flattening noted
                      </label>
                    </div>
                  </div>
                )}

                {selectedDevice.device_id === 'TBONE_3D_SCANNER' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label htmlFor="tbone-vbmd-input" className="block text-[var(--tc-text-secondary)] mb-1">
                        Distal Tibia Total vBMD (mg HA/cm³)
                      </label>
                      <input
                        id="tbone-vbmd-input"
                        name="tbone_vbmd"
                        type="number"
                        step="0.1"
                        value={tboneVbmd}
                        onChange={(e) => setTboneVbmd(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="tbone-delta-input" className="block text-[var(--tc-text-secondary)] mb-1">
                        Change vs. Pre-Flight Baseline (%)
                      </label>
                      <input
                        id="tbone-delta-input"
                        name="tbone_delta_pct"
                        type="number"
                        step="0.1"
                        value={tboneDeltaPct}
                        onChange={(e) => setTboneDeltaPct(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                      />
                    </div>
                  </div>
                )}

                {selectedDevice.device_id === 'THIGH_CUFFS_COUNTERMEASURE' && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-lg bg-[var(--tc-elevated)] border border-[var(--tc-border)] text-[var(--tc-text-secondary)]">
                      Countermeasure logging only: Thigh cuffs do NOT measure physiological vitals and never alter heart rate or blood pressure telemetry.
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="cuff-mins-input" className="block text-[var(--tc-text-secondary)] mb-1">
                          Session Duration (mins)
                        </label>
                        <input
                          id="cuff-mins-input"
                          name="cuff_duration_mins"
                          type="number"
                          value={cuffDuration}
                          onChange={(e) => setCuffDuration(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                        />
                      </div>
                      <div>
                        <label htmlFor="cuff-pressure-input" className="block text-[var(--tc-text-secondary)] mb-1">
                          Compression Protocol / Garment ID
                        </label>
                        <input
                          id="cuff-pressure-input"
                          name="cuff_compression"
                          type="text"
                          value={cuffPressure}
                          onChange={(e) => setCuffPressure(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {selectedDevice.device_id === 'RADI_N2_BUBBLE' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label htmlFor="radin-serial-input" className="block text-[var(--tc-text-secondary)] mb-1">
                        Detector Serial ID
                      </label>
                      <input
                        id="radin-serial-input"
                        name="radin_serial"
                        type="text"
                        value={radinSerial}
                        onChange={(e) => setRadinSerial(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="radin-loc-input" className="block text-[var(--tc-text-secondary)] mb-1">
                        Deployment Module Location
                      </label>
                      <input
                        id="radin-loc-input"
                        name="radin_location"
                        type="text"
                        value={radinLocation}
                        onChange={(e) => setRadinLocation(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                      />
                    </div>
                    <div>
                      <label htmlFor="radin-bubbles-input" className="block text-[var(--tc-text-secondary)] mb-1">
                        Manual / Reader Bubble Count
                      </label>
                      <input
                        id="radin-bubbles-input"
                        name="radin_bubbles"
                        type="number"
                        value={radinBubbles}
                        onChange={(e) => setRadinBubbles(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                      />
                    </div>
                  </div>
                )}

                {selectedDevice.device_id === 'BEHAVIORAL_SURVEY_SUITE' && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label htmlFor="survey-mood-input" className="block text-[var(--tc-text-secondary)] mb-1">
                          Mood Score (1–10)
                        </label>
                        <input
                          id="survey-mood-input"
                          name="survey_mood"
                          type="number"
                          min="1"
                          max="10"
                          step="0.5"
                          value={surveyMood}
                          onChange={(e) => setSurveyMood(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                        />
                      </div>
                      <div>
                        <label htmlFor="survey-stress-input" className="block text-[var(--tc-text-secondary)] mb-1">
                          Stress Level (1–10)
                        </label>
                        <input
                          id="survey-stress-input"
                          name="survey_stress"
                          type="number"
                          min="1"
                          max="10"
                          step="0.5"
                          value={surveyStress}
                          onChange={(e) => setSurveyStress(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                        />
                      </div>
                      <div>
                        <label htmlFor="survey-sleepq-input" className="block text-[var(--tc-text-secondary)] mb-1">
                          Sleep Quality (%)
                        </label>
                        <input
                          id="survey-sleepq-input"
                          name="survey_sleep_q"
                          type="number"
                          min="0"
                          max="100"
                          value={surveySleepQ}
                          onChange={(e) => setSurveySleepQ(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                        />
                      </div>
                    </div>
                    <div>
                      <label htmlFor="survey-private-journal" className="block text-[var(--tc-text-secondary)] mb-1">
                        Private Crewmember Reflection (PIN-isolated from fleet summaries)
                      </label>
                      <textarea
                        id="survey-private-journal"
                        name="survey_reflection"
                        rows={2}
                        value={surveyReflection}
                        onChange={(e) => setSurveyReflection(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                      />
                    </div>
                    <label htmlFor="exam-sync-telemetry" className="inline-flex items-center gap-2 text-[var(--tc-text)]">
                      <input
                        id="exam-sync-telemetry"
                        name="exam_sync_telemetry"
                        type="checkbox"
                        checked={examUpdateTelemetry}
                        onChange={(e) => setExamUpdateTelemetry(e.target.checked)}
                      />
                      Also recalculate Integrated Health Assessment from this behavioural score
                    </label>
                  </div>
                )}

                {selectedDevice.device_id === 'POSTUROGRAPHY_BALANCE' && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="posture-bal-input" className="block text-[var(--tc-text-secondary)] mb-1">
                          Balance Stability Score (/100)
                        </label>
                        <input
                          id="posture-bal-input"
                          name="posture_balance"
                          type="number"
                          min="0"
                          max="100"
                          value={postureBalance}
                          onChange={(e) => setPostureBalance(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                        />
                      </div>
                      <div>
                        <label htmlFor="posture-coord-input" className="block text-[var(--tc-text-secondary)] mb-1">
                          Coordination Score (/100)
                        </label>
                        <input
                          id="posture-coord-input"
                          name="posture_coord"
                          type="number"
                          min="0"
                          max="100"
                          value={postureCoord}
                          onChange={(e) => setPostureCoord(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                        />
                      </div>
                    </div>
                    <label htmlFor="posture-update-check" className="inline-flex items-center gap-2 text-[var(--tc-text)]">
                      <input
                        id="posture-update-check"
                        name="posture_update"
                        type="checkbox"
                        checked={examUpdateTelemetry}
                        onChange={(e) => setExamUpdateTelemetry(e.target.checked)}
                      />
                      Send confirmed balance score to Integrated Health Assessment Engine
                    </label>
                  </div>
                )}

                {selectedDevice.device_id === 'CYCLE_ERGOMETER_ASTROFIT' && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <label htmlFor="ergo-pwr-input" className="block text-[var(--tc-text-secondary)] mb-1">
                          Mean Output (W)
                        </label>
                        <input
                          id="ergo-pwr-input"
                          name="ergo_power"
                          type="number"
                          value={ergoPower}
                          onChange={(e) => setErgoPower(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                        />
                      </div>
                      <div>
                        <label htmlFor="ergo-mins-input" className="block text-[var(--tc-text-secondary)] mb-1">
                          Duration (mins)
                        </label>
                        <input
                          id="ergo-mins-input"
                          name="ergo_mins"
                          type="number"
                          value={ergoMins}
                          onChange={(e) => setErgoMins(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                        />
                      </div>
                      <div>
                        <label htmlFor="ergo-perf-input" className="block text-[var(--tc-text-secondary)] mb-1">
                          Performance (%)
                        </label>
                        <input
                          id="ergo-perf-input"
                          name="ergo_perf"
                          type="number"
                          value={ergoPerf}
                          onChange={(e) => setErgoPerf(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                        />
                      </div>
                      <div>
                        <label htmlFor="ergo-str-input" className="block text-[var(--tc-text-secondary)] mb-1">
                          Strength Index
                        </label>
                        <input
                          id="ergo-str-input"
                          name="ergo_strength"
                          type="number"
                          value={ergoStrength}
                          onChange={(e) => setErgoStrength(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                        />
                      </div>
                    </div>
                    <label htmlFor="ergo-update-check" className="inline-flex items-center gap-2 text-[var(--tc-text)]">
                      <input
                        id="ergo-update-check"
                        name="ergo_update"
                        type="checkbox"
                        checked={examUpdateTelemetry}
                        onChange={(e) => setExamUpdateTelemetry(e.target.checked)}
                      />
                      Send confirmed exercise performance metrics to Integrated Health Assessment Engine
                    </label>
                  </div>
                )}

                {selectedDevice.device_id === 'VEGGIE_SPACE_GARDENING' && (
                  <div className="space-y-3 text-xs">
                    <div className="p-3 rounded-lg bg-[var(--tc-elevated)] border border-[var(--tc-border)] text-[var(--tc-text-secondary)]">
                      Wellbeing Activity Notice: Space gardening supports crew psychological resilience — it is NOT a medical diagnostic device and never modifies vital signs.
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="veggie-crop-input" className="block text-[var(--tc-text-secondary)] mb-1">
                          Crop Pillow / Botanical Module
                        </label>
                        <input
                          id="veggie-crop-input"
                          name="veggie_crop"
                          type="text"
                          value={veggieCrop}
                          onChange={(e) => setVeggieCrop(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                        />
                      </div>
                      <div>
                        <label htmlFor="veggie-mood-input" className="block text-[var(--tc-text-secondary)] mb-1">
                          Subjective Restoration Score (1–10)
                        </label>
                        <input
                          id="veggie-mood-input"
                          name="veggie_mood"
                          type="number"
                          min="1"
                          max="10"
                          value={veggieMoodLift}
                          onChange={(e) => setVeggieMoodLift(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Shared Notes & Medical Document/Image Upload */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label htmlFor="exam-summary-note" className="block text-[var(--tc-text-secondary)] mb-1">
                      Examination / Session Notes
                    </label>
                    <input
                      id="exam-summary-note"
                      name="exam_summary_note"
                      type="text"
                      value={examSummary}
                      onChange={(e) => setExamSummary(e.target.value)}
                      placeholder="Clinical observations, position, or context..."
                      className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                    />
                  </div>
                  <div>
                    <label htmlFor="exam-file-upload" className="block text-[var(--tc-text-secondary)] mb-1">
                      Attach Report / Image / File (.pdf, .png, .jpg, .txt, .json)
                    </label>
                    <input
                      id="exam-file-upload"
                      name="exam_file_upload"
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.json"
                      onChange={handleAttachmentPick}
                      className="block w-full text-xs text-[var(--tc-text-secondary)] file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[var(--tc-elevated)] file:text-[var(--tc-text)]"
                    />
                  </div>
                </div>

                {examAttachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    {examAttachments.map((att, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--tc-elevated)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                      >
                        <FileText className="w-3.5 h-3.5 text-[var(--tc-accent)]" aria-hidden="true" />
                        {att.filename}
                      </span>
                    ))}
                  </div>
                )}

                <label htmlFor="exam-confirm-checkbox" className="inline-flex items-center gap-2 text-xs text-[var(--tc-text)]">
                  <input
                    id="exam-confirm-checkbox"
                    name="exam_confirmed"
                    type="checkbox"
                    checked={examConfirmed}
                    onChange={(e) => setExamConfirmed(e.target.checked)}
                  />
                  I have reviewed these examination inputs/files and confirm they accurately represent this Sol's session.
                </label>

                <div>
                  <button
                    type="button"
                    onClick={() => handleSaveExamination(selectedDevice)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--tc-btn-bg)] text-[var(--tc-btn-fg)] hover:bg-white inline-flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    Confirm &amp; Save Examination Record
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: BIOLOGICAL SAMPLES & ASSAYS */}
            {consoleTab === 'biosample' && selectedDevice.capabilities.supports_biosample && (
              <div className="space-y-4">
                <div className="rounded-xl bg-[var(--tc-bg)] border border-[var(--tc-border)] p-4 space-y-3 text-xs">
                  <div className="p-3 rounded-lg bg-[var(--tc-elevated)] border border-[var(--tc-border)] text-[var(--tc-text-secondary)]">
                    <FlaskConical className="w-4 h-4 inline mr-1.5 text-[var(--tc-accent)]" aria-hidden="true" />
                    <strong>Specimen Kit Rule:</strong> Collection kits record sample metadata and storage only — they NEVER fabricate live physiological vitals. Laboratory assay results must be imported separately once processed.
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="biosample-type-select" className="block text-[var(--tc-text-secondary)] mb-1">
                        Biological Matrix / Specimen Type
                      </label>
                      <select
                        id="biosample-type-select"
                        name="biosample_type"
                        value={bioType}
                        onChange={(e) => setBioType(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                      >
                        <option value="Saliva Filter-Paper Strip">Saliva Filter-Paper Strip</option>
                        <option value="Whole Blood">Whole Blood</option>
                        <option value="Blood Plasma">Blood Plasma</option>
                        <option value="PBMC">PBMC</option>
                        <option value="Serum">Serum</option>
                        <option value="Urine">Urine</option>
                        <option value="Stool">Stool</option>
                        <option value="Skin Biopsy">Skin Biopsy</option>
                        <option value="Microbiome Swab">Microbiome Swab</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="biosample-storage-input" className="block text-[var(--tc-text-secondary)] mb-1">
                        Cold Stowage / Booklet Archive Location
                      </label>
                      <input
                        id="biosample-storage-input"
                        name="biosample_storage"
                        type="text"
                        value={bioStorage}
                        onChange={(e) => setBioStorage(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="biosample-notes-input" className="block text-[var(--tc-text-secondary)] mb-1">
                      Collection Timing / Fasting Context
                    </label>
                    <input
                      id="biosample-notes-input"
                      name="biosample_notes"
                      type="text"
                      value={bioNotes}
                      onChange={(e) => setBioNotes(e.target.value)}
                      placeholder="e.g., Morning waking +30 min, pre-meal..."
                      className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLogBiosample(selectedDevice)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--tc-btn-bg)] text-[var(--tc-btn-fg)]"
                  >
                    Register Biological Specimen
                  </button>
                </div>

                {/* Separate Lab Assay Import Panel */}
                <div className="rounded-xl bg-[var(--tc-bg)] border border-[var(--tc-border)] p-4 space-y-3 text-xs">
                  <div className="text-sm font-semibold text-[var(--tc-text)]">
                    Separate Laboratory Assay Result Import
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="assay-sample-select" className="block text-[var(--tc-text-secondary)] mb-1">
                        Target Collected Sample UID
                      </label>
                      <select
                        id="assay-sample-select"
                        name="assay_sample_uid"
                        value={assaySampleUid}
                        onChange={(e) => setAssaySampleUid(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                      >
                        <option value="">-- Select Registered Sample --</option>
                        {biosamples
                          .filter((b) => b.device_id === selectedDevice.device_id)
                          .map((b) => (
                            <option key={b.sample_uid} value={b.sample_uid}>
                              {b.sample_uid} · {b.specimen_type} ({b.status})
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="assay-format-select" className="block text-[var(--tc-text-secondary)] mb-1">
                        Lab Report Format
                      </label>
                      <select
                        id="assay-format-select"
                        name="assay_format"
                        value={assayFormat}
                        onChange={(e) => setAssayFormat(e.target.value as 'json' | 'csv')}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] text-[var(--tc-text)]"
                      >
                        <option value="json">JSON Lab Assay</option>
                        <option value="csv">CSV Lab Assay</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label htmlFor="assay-raw-textarea" className="block text-[var(--tc-text-secondary)] mb-1">
                      Laboratory Assay Payload
                    </label>
                    <textarea
                      id="assay-raw-textarea"
                      name="assay_raw_text"
                      rows={3}
                      value={assayRaw}
                      onChange={(e) => setAssayRaw(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--tc-surface)] border border-[var(--tc-border)] font-mono text-[var(--tc-text)]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleImportAssay}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--tc-elevated)] border border-[var(--tc-border-strong)] text-[var(--tc-accent)] hover:bg-[var(--tc-accent-soft)]"
                  >
                    Attach Lab Assay Results to Sample
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
