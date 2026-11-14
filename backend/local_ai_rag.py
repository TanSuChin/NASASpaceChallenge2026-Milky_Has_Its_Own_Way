"""
Local AI & Expanded NASA/CSA Scientific Corpus Helpers for TARSCARE / MarsCare AI.
Zero-hang offline detection for Sentence-Transformers (checks local HuggingFace cache folder before importing torch)
and local Ollama (127.0.0.1:11434), falling back deterministically to offline TF-IDF + template synthesis.
"""

from __future__ import annotations
import importlib.util
import json
import os
import time
import urllib.request
from typing import Any, Dict, List, Optional

_ST_MODEL = None
_ST_LOADING = False
_ST_CHECKED = False
_ST_CACHED = False
_ST_INSTALLED = importlib.util.find_spec("sentence_transformers") is not None

_OLLAMA_CACHE_TS = 0.0
_OLLAMA_CACHED_MODEL: Optional[str] = None


EXTRA_CORPUS_DICTS: List[Dict[str, Any]] = [
    {
        "doc_id": "NASA-RADLAB-01",
        "title": "NASA RadLab Space Radiation Biology and Dosimetry Portal",
        "agency": "NASA",
        "year": "2025",
        "url": "https://www.nasa.gov/biological-physical/data/",
        "hazard_category": "Space Radiation",
        "provenance": "REAL_RESEARCH_REF",
        "summary": (
            "NASA RadLab integrates experimental biological radiation exposure datasets and mission dosimetry metrics. "
            "Preserves strict physical separation between absorbed dose (Gy / mGy — energy deposited per unit mass) "
            "and equivalent or effective dose (Sv / mSv — weighted by radiation quality factor for biological risk). "
            "Supports GCR vs. SPE spectral risk interpretation without extrapolating unapproved career limits."
        ),
        "sections": [
            (
                "RadLab Absorbed Dose vs. Effective Dose Unit Integrity",
                "RadLab biological radiation records distinguish physical absorbed dose measured in Gray (Gy / mGy) from "
                "radiation-weighted equivalent or effective dose reported in Sievert (Sv / mSv). High-Z and energy (HZE) "
                "galactic cosmic ray ions carry higher quality factors than solar protons, so identical mGy absorbed readings "
                "produce distinct mSv biological risk estimates depending on radiation spectrum and tissue weighting."
            ),
            (
                "RadLab Autonomous Crew Dosimetry Monitoring",
                "In deep space beyond Earth's magnetosphere, onboard tissue-equivalent proportional counters and crew badges track "
                "cumulative exposure and transient dose-rate spikes. Rising solar particle flux warrants transition to higher-hydrogen "
                "shielding zones while retaining full raw unit metadata for post-conjunction Earth review."
            ),
        ],
    },
    {
        "doc_id": "NASA-OSDR-01",
        "title": "NASA Open Science Data Repository (OSDR) — Spaceflight Microbiology and Host Adaptation",
        "agency": "NASA",
        "year": "2025",
        "url": "https://osdr.nasa.gov/bio/",
        "hazard_category": "Hostile and Closed Environments",
        "provenance": "REAL_RESEARCH_REF",
        "summary": (
            "NASA OSDR provides open-access multi-omics, microbial monitoring, and cellular stress datasets from spaceflight habitats. "
            "Microgravity and closed spacecraft air/water loops can alter crew immune modulation and surface microbial biofilms, "
            "requiring environmental correlation and hygiene monitoring rather than automatic onboard diagnosis of infection."
        ),
        "sections": [
            (
                "Closed-Loop Habitat Microbial & Immune Shifts",
                "OSDR spaceflight microbiome and immune datasets document altered microbial persistence on cabin surfaces and subtle "
                "shifts in host mucosal barrier vigilance during long missions. Respiratory throat irritation or congestion in a closed habitat "
                "must be evaluated alongside cabin CO2, relative humidity, particulate filter status, and hygiene adherence rather than "
                "automatically diagnosing a clinical infection."
            ),
            (
                "OSDR Guidance for Environmental & Symptom Correlation",
                "When mild upper-airway irritation or skin discomfort is logged onboard, crew guidance pairs HEPA filter and humidity verification "
                "with surface disinfection protocols and symptom monitoring."
            ),
        ],
    },
    {
        "doc_id": "NASA-LSP-01",
        "title": "NASA Life Sciences Portal (NLSP) — Multi-System Astronaut Biomedical Baseline",
        "agency": "NASA",
        "year": "2024",
        "url": "https://nlsp.nasa.gov/",
        "hazard_category": "Distance from Earth",
        "provenance": "REAL_RESEARCH_REF",
        "summary": (
            "NASA Life Sciences Portal indexes longitudinal physiological data emphasizing individual pre-flight and in-flight baseline comparison "
            "across cardiovascular, sensorimotor, ophthalmic, and behavioral domains to support autonomous crew health decisions."
        ),
        "sections": [
            (
                "Individual Baseline Comparison Principles",
                "Because individual astronauts exhibit distinct resting heart rate, arterial pressure, sleep duration, and orthostatic tolerance baselines, "
                "meaningful in-flight health assessment compares current measurements against personal mission baselines rather than population averages alone."
            ),
            (
                "Autonomous Trend Interpretation Under Communication Delay",
                "Up to 22-minute one-way Earth communication delays during Mars conjunction require onboard decision-support companions to translate "
                "multi-day sensor trends into plain-language guidance ('How am I doing?', 'What has changed?', 'Should I take any action?')."
            ),
        ],
    },
    {
        "doc_id": "NASA-EDA-01",
        "title": "NASA Environmental Data Application — Spacecraft Cabin Atmosphere Monitoring",
        "agency": "NASA",
        "year": "2024",
        "url": "https://eda.jsc.nasa.gov/",
        "hazard_category": "Hostile and Closed Environments",
        "provenance": "REAL_RESEARCH_REF",
        "summary": (
            "Tracks closed-loop spacecraft Environmental Control and Life Support System (ECLSS) indicators including partial pressure of CO2, "
            "O2 concentration, total pressure, temperature, relative humidity, and airborne particulate load."
        ),
        "sections": [
            (
                "Cabin CO2, Humidity & Cognitive/Airway Comfort",
                "In poorly ventilated zones within microgravity or sealed habitats, CO2 pockets and low humidity (below 30-35% RH) are "
                "frequently correlated with headaches, slowed concentration, and dry cough before systemic vital signs change."
            ),
            (
                "Scrubber & Airflow Countermeasures",
                "Elevated cabin CO2 or particulate trends call for portable fan mixing, Carbon Dioxide Removal Assembly (CDRA) bed switching, "
                "and HEPA filter inspection while tracking respiratory rate and SpO2."
            ),
        ],
    },
    {
        "doc_id": "CSA-TBONE-01",
        "title": "Canadian Space Agency TBone Study — 3D Trabecular Bone Structure and Load Recovery",
        "agency": "CSA",
        "year": "2024",
        "url": "https://www.asc-csa.gc.ca/eng/sciences/tbone.asp",
        "hazard_category": "Gravity Fields",
        "provenance": "REAL_RESEARCH_REF",
        "summary": (
            "CSA's TBone study uses high-resolution imaging to characterize weight-bearing trabecular bone density and microarchitecture "
            "loss in microgravity and incomplete post-flight recovery, underscoring strict resistive exercise adherence."
        ),
        "sections": [
            (
                "Weight-Bearing Skeletal Unloading in 0g and 0.38g",
                "Without Earth 1g mechanical loading on the tibia and hip, bone resorption outpaces formation in weight-bearing trabecular bone. "
                "Mars partial gravity (~0.38g) supplies only partial skeletal loading, making daily high-load resistive exercise (ARED) and "
                "vitamin D / calcium nutritional compliance essential to protect long-term bone strength."
            ),
            (
                "Surface Transition Fracture & Load Caution",
                "After months of 0g transit, returning to gravitational loading on Mars (~0.38g) or Earth (1g) requires graduated impact progression "
                "while musculoskeletal strength and postural balance re-adapt."
            ),
        ],
    },
    {
        "doc_id": "CSA-VASCULAR-01",
        "title": "Canadian Space Agency Vascular & Vascular Echo — Arterial Stiffness in Long-Duration Flight",
        "agency": "CSA",
        "year": "2024",
        "url": "https://www.asc-csa.gc.ca/eng/sciences/vascular.asp",
        "hazard_category": "Gravity Fields",
        "provenance": "REAL_RESEARCH_REF",
        "summary": (
            "CSA's Vascular research investigates accelerated arterial stiffening, insulin-related vascular stress, and headward fluid shift "
            "after 6 months of spaceflight, reinforcing combined aerobic, resistive, and hydration countermeasures."
        ),
        "sections": [
            (
                "Arterial Stiffness and Blood Pressure Monitoring",
                "Long-duration weightlessness alters arterial compliance and baroreceptor sensitivity. Tracking resting heart rate alongside "
                "systolic and diastolic blood pressure helps astronauts spot early cardiovascular deconditioning during transit and landing transitions."
            ),
            (
                "Cardiovascular & Vascular Conditioning Countermeasures",
                "Combining aerobic cycle/treadmill intervals with adequate fluid-electrolyte intake mitigates post-transit orthostatic dizziness "
                "and supports vascular elasticity."
            ),
        ],
    },
]


def _has_local_st_cache() -> bool:
    hf_home = os.environ.get("HF_HOME") or os.path.join(os.path.expanduser("~"), ".cache", "huggingface")
    hub_dir = os.path.join(hf_home, "hub", "models--sentence-transformers--all-MiniLM-L6-v2", "snapshots")
    return os.path.isdir(hub_dir) and any(True for _ in os.scandir(hub_dir))


def _warmup_st_async() -> None:
    global _ST_MODEL, _ST_LOADING, _ST_CACHED
    if _ST_LOADING or _ST_MODEL is not None or not _ST_CACHED:
        return
    _ST_LOADING = True
    import threading

    def _loader() -> None:
        global _ST_MODEL, _ST_LOADING, _ST_CACHED
        try:
            os.environ["HF_HUB_OFFLINE"] = "1"
            os.environ["TRANSFORMERS_OFFLINE"] = "1"
            from sentence_transformers import SentenceTransformer  # type: ignore
            _ST_MODEL = SentenceTransformer("all-MiniLM-L6-v2", local_files_only=True)
        except Exception:
            _ST_MODEL = None
            _ST_CACHED = False
        finally:
            _ST_LOADING = False

    threading.Thread(target=_loader, daemon=True).start()


def _probe_sentence_transformer(load_if_cached: bool = False) -> None:
    global _ST_CHECKED, _ST_CACHED
    if not _ST_CHECKED:
        _ST_CHECKED = True
        _ST_CACHED = _ST_INSTALLED and _has_local_st_cache()
    if load_if_cached and _ST_CACHED and _ST_MODEL is None:
        _warmup_st_async()


def _probe_ollama() -> Optional[str]:
    """Quick 0.4s local check for Ollama daemon on 127.0.0.1:11434, cached 20s."""
    global _OLLAMA_CACHE_TS, _OLLAMA_CACHED_MODEL
    now = time.time()
    if now - _OLLAMA_CACHE_TS < 20.0:
        return _OLLAMA_CACHED_MODEL
    _OLLAMA_CACHE_TS = now
    try:
        req = urllib.request.Request("http://127.0.0.1:11434/api/tags", method="GET")
        with urllib.request.urlopen(req, timeout=0.4) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            models = data.get("models", [])
            _OLLAMA_CACHED_MODEL = (
                str(models[0].get("name") or models[0].get("model") or "local-ollama")
                if models else None
            )
            return _OLLAMA_CACHED_MODEL
    except Exception:
        _OLLAMA_CACHED_MODEL = None
        return None


def get_local_ai_status() -> Dict[str, Any]:
    _probe_sentence_transformer(load_if_cached=False)
    ollama_model = _probe_ollama()
    if ollama_model and _ST_CACHED:
        mode = "LOCAL_OLLAMA_PLUS_EMBEDDINGS"
    elif ollama_model:
        mode = "LOCAL_OLLAMA_PLUS_TFIDF"
    elif _ST_CACHED:
        mode = "OFFLINE_SENTENCE_TRANSFORMERS"
    else:
        mode = "DETERMINISTIC_OFFLINE_RAG"

    return {
        "ollama_available": ollama_model is not None,
        "ollama_model": ollama_model,
        "sentence_transformers_installed": _ST_INSTALLED,
        "sentence_transformers_cached": _ST_CACHED,
        "active_engine_mode": mode,
        "offline_guaranteed": True,
    }


def rerank_with_embeddings_if_cached(
    query: str,
    candidate_texts: List[str],
    base_scores: List[float],
) -> List[float]:
    _probe_sentence_transformer(load_if_cached=True)
    if _ST_MODEL is None or not candidate_texts:
        return base_scores
    try:
        q_vec = _ST_MODEL.encode([query], normalize_embeddings=True)[0]
        d_vecs = _ST_MODEL.encode(candidate_texts, normalize_embeddings=True)
        combined: List[float] = []
        for idx, base in enumerate(base_scores):
            cos = float(sum(float(a) * float(b) for a, b in zip(q_vec, d_vecs[idx])))
            combined.append(round(0.65 * base + 0.35 * max(0.0, cos), 4))
        return combined
    except Exception:
        return base_scores


def synthesize_with_ollama_if_available(
    question: str,
    citations: List[Dict[str, Any]],
    astronaut_context: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    model_name = _probe_ollama()
    if not model_name or not citations:
        return None
    context_lines = "\n".join(
        f"[{c['doc_id']}] {c['title']}: {c['excerpt']}" for c in citations[:4]
    )
    ctx_summary = ""
    if astronaut_context:
        ctx_summary = (
            f"\nAstronaut Telemetry Snapshot (Day {astronaut_context.get('mission_day', 184)}, "
            f"{astronaut_context.get('gravity_g', 0.38)}g): "
            f"HR {astronaut_context.get('heart_rate_bpm', 73)} bpm, "
            f"SpO2 {astronaut_context.get('spo2_pct', 97.2)}%, "
            f"Sleep {astronaut_context.get('sleep_duration_hrs', 5.7)} hrs, "
            f"CO2 {astronaut_context.get('co2_mmhg', 3.4)} mmHg, "
            f"Dose rate {astronaut_context.get('equivalent_dose_rate_msv_day', 1.68)} mSv/day."
        )
    prompt = (
        "You are MarsCare AI, a calm, reassuring onboard deep-space astronaut health companion.\n"
        "Answer ONLY from the provided NASA/CSA passages and telemetry below. "
        "State uncertainties clearly if evidence is insufficient. Never diagnose psychiatric conditions or infections automatically, "
        "never prescribe medication, and never invent NASA exposure limits. Keep response concise and structured.\n\n"
        f"Question: {question}{ctx_summary}\n\nReference Passages:\n{context_lines}"
    )
    payload = json.dumps({
        "model": model_name,
        "prompt": prompt,
        "stream": False,
        "options": {"temperature": 0.2, "num_predict": 320},
    }).encode("utf-8")
    try:
        req = urllib.request.Request(
            "http://127.0.0.1:11434/api/generate",
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=8.0) as resp:
            body = json.loads(resp.read().decode("utf-8"))
            text = (body.get("response") or "").strip()
            return text if len(text) > 25 else None
    except Exception:
        return None
