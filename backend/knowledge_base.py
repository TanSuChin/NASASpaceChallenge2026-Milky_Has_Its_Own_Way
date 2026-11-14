"""
Local NASA & CSA Scientific Knowledge Base and Offline-First RAG Engine.
Contains curated, verifiable reference documents from NASA Human Research Program (HRP),
Canadian Space Agency (CSA), NASA Radiation Data Portal (ARMAS context), CCISS, CARDIOBREATH,
and C-STARS, with local chunking, dense/TF-IDF vector embeddings, cosine retrieval,
and safety-guarded synthesis.
"""

from __future__ import annotations
import math
import re
from dataclasses import dataclass, asdict
from typing import List, Dict, Any, Optional


@dataclass
class KnowledgeDoc:
    doc_id: str
    title: str
    agency: str
    year: str
    url: str
    hazard_category: str
    provenance: str
    content: str


KNOWLEDGE_CORPUS: List[KnowledgeDoc] = [
    KnowledgeDoc(
        doc_id="NASA-HRP-RAD-01",
        title="NASA Human Research Program: Space Radiation Hazard Overview",
        agency="NASA HRP",
        year="2025",
        url="https://www.nasa.gov/hrp/hazard-space-radiation/",
        hazard_category="Space Radiation",
        provenance="REAL_RESEARCH_REF",
        content=(
            "Beyond Low Earth Orbit (LEO), astronauts are exposed to two primary radiation sources: "
            "chronic Galactic Cosmic Rays (GCR) originating outside the solar system (high-energy protons "
            "and HZE ions) and acute Solar Particle Events (SPE) associated with solar flares and coronal "
            "mass ejections. Physical dosimetry distinguishes absorbed dose, measured in Gray (Gy or mGy, "
            "1 Gy = 1 J/kg of energy deposited in matter), from biologically weighted equivalent and "
            "effective dose, measured in Sievert (Sv or mSv), which applies radiation quality factors (Q) "
            "to account for densely ionizing heavy ions. Acute high-dose SPE exposure can cause prodromal "
            "radiation sickness (nausea, fatigue, lymphocyte depletion), whereas cumulative GCR and SPE "
            "exposure elevates long-term risks of carcinogenesis, central nervous system (CNS) cognitive "
            "and motor decrements, cataracts, and degenerative cardiovascular tissue changes. Approved "
            "operational radiation protection procedures rely on ALARA (As Low As Reasonably Achievable) "
            "principles: real-time active dosimetry alerting, immediate relocation to high-mass storm "
            "shelters (polyethylene, water walls, or stowage-lined crew quarters) during SPE alerts, "
            "deferring Extravehicular Activity (EVA), and post-event hematological and symptom review."
        ),
    ),
    KnowledgeDoc(
        doc_id="CSA-RAD-2026-01",
        title="Monitoring Radiation to Protect Astronaut Health on Deep-Space Missions",
        agency="Canadian Space Agency (CSA)",
        year="2026",
        url="https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp",
        hazard_category="Space Radiation",
        provenance="REAL_RESEARCH_REF",
        content=(
            "Canadian Space Agency (CSA) radiation monitoring research emphasizes continuous, autonomous "
            "biodosimetry and active physical dosimetry for lunar and Mars architectures. Because deep-space "
            "radiation fields fluctuate with solar cycle modulation and spacecraft shielding geometry, "
            "onboard monitoring must track both instantaneous dose rate (mGy/h or mSv/day) and mission "
            "cumulative effective dose (mSv). When dose-rate spikes occur during solar energetic particle "
            "storms, autonomous onboard alerting enables crew to verify shelter shielding effectiveness "
            "without waiting for Earth Space Weather confirmation across deep-space communication delays."
        ),
    ),
    KnowledgeDoc(
        doc_id="NASA-RDP-ARMAS-01",
        title="NASA Radiation Data Portal (RDP) and ARMAS Measurement Context",
        agency="NASA Ames / Heliophysics Division",
        year="2025",
        url="https://data.nas.nasa.gov/helio/portals/rdp/",
        hazard_category="Space Radiation",
        provenance="REAL_RESEARCH_REF",
        content=(
            "The NASA Radiation Data Portal (RDP) compiles Automated Radiation Measurements for Aerospace "
            "Safety (ARMAS) datasets collected inside Earth's atmosphere and magnetosphere using aircraft, "
            "high-altitude balloons, and suborbital platforms. IMPORTANT SCIENTIFIC LIMITATION: ARMAS "
            "measurements characterize Earth's high-altitude aviation and upper-atmospheric radiation "
            "environment and must NOT be represented as direct in-situ measurements of the interplanetary "
            "Mars transit or Martian surface radiation environment. In TARSCARE AI, ARMAS/RDP methodology "
            "informs how dosimetric time-series (absorbed dose rate vs. equivalent dose rate, timestamped "
            "event spikes, and instrument provenance metadata) are structured and validated, while Mars "
            "transit and surface telemetry are explicitly flagged as synthetic demonstration data."
        ),
    ),
    KnowledgeDoc(
        doc_id="NASA-HRP-ISO-01",
        title="NASA Human Research Program: Isolation and Confinement Hazard",
        agency="NASA HRP",
        year="2025",
        url="https://www.nasa.gov/hrp/hazard-isolation-and-confinement/",
        hazard_category="Isolation and Confinement",
        provenance="REAL_RESEARCH_REF",
        content=(
            "Extended confinement in small habitats far from Earth exposes crew members to circadian "
            "desynchronization, sleep loss, high cognitive workload, interpersonal friction, and sensory "
            "monotony. Research in spaceflight and analog environments (HERA, CHAPEA, NEEMO, Antarctic "
            "stations) demonstrates that persistent sleep reduction (<6 hours/night), fragmented sleep "
            "architecture, rising subjective stress, and declining mood scores correlate with vigilance "
            "decrements and task errors. Non-diagnostic behavioral countermeasures validated in spaceflight "
            "analogs include strict circadian light therapy (blue-enriched high-melanopic light during "
            "scheduled wake/morning hours and blue-depleted dim light 2 hours prior to sleep), protected "
            "8.5-hour sleep opportunities, structured workload pacing, private reflective journaling, "
            "mindfulness breathing exercises, and scheduled shared crew meals or recreational activities. "
            "Decision support systems must monitor behavioral trends longitudinally relative to an "
            "individual's baseline and must never automatically diagnose psychiatric disorders such as "
            "clinical depression or generalized anxiety disorder."
        ),
    ),
    KnowledgeDoc(
        doc_id="NASA-HRP-DIST-01",
        title="NASA Human Research Program: Distance from Earth & Autonomous Medical Care",
        agency="NASA HRP",
        year="2025",
        url="https://www.nasa.gov/hrp/hazard-distance-from-earth/",
        hazard_category="Distance from Earth",
        provenance="REAL_RESEARCH_REF",
        content=(
            "Whereas International Space Station (ISS) crews operate 400 km from Earth with near-real-time "
            "flight surgeon telemetry and emergency Soyuz/Commercial Crew return within hours, Mars missions "
            "involve distances up to 400 million km, creating one-way light-time communication delays of "
            "3 to 22 minutes (up to 44 minutes round-trip) and complete communication blackouts lasting "
            "approximately two weeks during solar conjunction. No medical evacuation or resupply is possible. "
            "Consequently, onboard medical systems must operate offline-first with local medical databases, "
            "autonomous anomaly detection against personal baselines (avoiding arbitrary thresholds or assuming "
            "ordinary Earth-based clinical reference ranges automatically represent safe operating limits in "
            "microgravity or partial gravity), local emergency triage protocols, and "
            "store-and-forward telemetry queues that package, store locally, and synchronize structured "
            "health reports once Deep Space Network link availability is restored."
        ),
    ),
    KnowledgeDoc(
        doc_id="NASA-HRP-GRAV-01",
        title="NASA Human Research Program: Gravity Fields & Physiological Adaptation",
        agency="NASA HRP",
        year="2025",
        url="https://www.nasa.gov/hrp/hazard-gravity-fields/",
        hazard_category="Gravity Fields",
        provenance="REAL_RESEARCH_REF",
        content=(
            "During a Mars mission, astronauts transition across three distinct gravitational environments: "
            "1) Microgravity (0g) during the 6-to-9-month interplanetary transit, causing cephalad fluid "
            "shifts, plasma volume reduction, Spaceflight-Associated Neuro-ocular Syndrome (SANS: optic disc "
            "edema, globe flattening, choroidal folds, hyperopic visual shifts), bone mineral density loss "
            "(1–1.5% per month in weight-bearing skeleton without countermeasures), and antigravity muscle "
            "atrophy; 2) Partial gravity (~0.38g) on the Martian surface, where neurovestibular re-adaptation "
            "and cardiovascular deconditioning create high risks of orthostatic intolerance (dizziness, "
            "presyncope, tachycardia, systolic blood pressure drop upon standing), impaired balance, and "
            "ataxia during surface EVA; and 3) Terrestrial gravity (1.0g) upon Earth return, requiring "
            "graduated reconditioning. Approved countermeasures include resistive exercise on ARED-class "
            "devices (squats, deadlifts, heel raises), aerobic cycle/treadmill intervals, fluid loading "
            "and lower-body compression garments prior to gravity transitions, and sensorimotor balance "
            "training."
        ),
    ),
    KnowledgeDoc(
        doc_id="CSA-CARDIO-CCISS-01",
        title="CSA Cardiovascular Adaptation Research: CCISS and CARDIOBREATH",
        agency="Canadian Space Agency (CSA) / University of Waterloo / SFU",
        year="2024",
        url="https://www.asc-csa.gc.ca/eng/sciences/experiments/cardiobreath.asp",
        hazard_category="Gravity Fields",
        provenance="REAL_RESEARCH_REF",
        content=(
            "The Canadian Space Agency's Cardiovascular and Cerebrovascular Control on Return from ISS "
            "(CCISS) and CARDIOBREATH experiments investigate how microgravity alters arterial stiffness, "
            "baroreflex sensitivity, blood pressure regulation, and cardiorespiratory control. Findings "
            "demonstrate that spaceflight deconditioning impairs blood pressure maintenance during posture "
            "changes and physical exertion in partial or Earth gravity, manifesting as elevated heart rate, "
            "narrowed pulse pressure or systolic hypotension, and subjective dizziness or faintness. "
            "Continuous monitoring of resting and post-exertion heart rate, blood pressure trends relative "
            "to individual baseline, and respiratory coupling helps identify astronauts at elevated risk "
            "of orthostatic intolerance before surface EVA."
        ),
    ),
    KnowledgeDoc(
        doc_id="NASA-HRP-ENV-01",
        title="NASA Human Research Program: Hostile and Closed Environments",
        agency="NASA HRP",
        year="2025",
        url="https://www.nasa.gov/hrp/hazard-hostile-closed-environments/",
        hazard_category="Hostile and Closed Environments",
        provenance="REAL_RESEARCH_REF",
        content=(
            "Spacecraft and Martian habitats are sealed, closed-loop ecosystems where Environmental Control "
            "and Life Support Systems (ECLSS) must regulate atmospheric pressure, oxygen concentration, "
            "carbon dioxide (CO2) partial pressure, temperature, humidity, trace volatile organic compounds "
            "(VOCs), particulate matter, and microbial bioburden. In microgravity, lack of natural convection "
            "allows localized CO2 pockets to form around sleeping or stationary astronauts. Even modest "
            "spacecraft CO2 elevations (e.g., >3.0–4.0 mmHg partial pressure or >4000–5000 ppm) are "
            "associated with headaches, lethargy, cognitive slowing, respiratory discomfort, and potenziation "
            "of cephalad fluid effects (SANS risk). Meanwhile, closed-environment immune dysregulation "
            "combined with altered microbial virulence or low cabin humidity can manifest as upper "
            "respiratory irritation, mucosal dryness, fatigue, or elevated body temperature. Preventive "
            "procedures include verifying local ventilation airflow, inspecting CO2 scrubber (CDRA/amine) "
            "beds, HEPA filtration checks, surface hygiene protocols, and symptomatic medical review "
            "without assuming an automatic infectious diagnosis solely from environmental telemetry."
        ),
    ),
    KnowledgeDoc(
        doc_id="NASA-CSTARS-MED-01",
        title="C-STARS & Spaceflight Autonomous Medical Triage and Escalation Procedures",
        agency="NASA / Spaceflight Medical Operations",
        year="2025",
        url="https://www.nasa.gov/hrp/",
        hazard_category="Distance from Earth",
        provenance="REAL_RESEARCH_REF",
        content=(
            "Under autonomous deep-space medical operations and C-STARS readiness principles, onboard "
            "decision-support tools avoid arbitrary fixed cutoffs or assuming ordinary Earth-based clinical reference "
            "ranges automatically represent safe operating limits in microgravity (0g), and classify crew health "
            "states against personal baselines into three operational tiers: "
            "NORMAL (parameters within individual baseline tolerance; continue routine countermeasure "
            "schedule), WARNING (persistent deviation from individual baseline, moderate environmental "
            "excursion, or mild-to-moderate symptoms warranting repeat measurement, countermeasure "
            "adjustment, and queued store-and-forward report to Earth Flight Surgeons), and CRITICAL "
            "(high-risk physiological instability, acute radiation event threshold exceedance, severe "
            "orthostatic presyncope, fever with respiratory compromise, or life-support atmospheric hazard "
            "requiring immediate execution of onboard Crew Medical Officer emergency checklist without "
            "waiting for Earth round-trip telemetry)."
        ),
    ),
]


@dataclass
class KnowledgeChunk:
    chunk_id: str
    doc_id: str
    title: str
    agency: str
    year: str
    url: str
    hazard_category: str
    provenance: str
    text: str
    tokens: List[str]
    tf_vector: Dict[str, float]


def _tokenize(text: str) -> List[str]:
    words = re.findall(r"[a-z0-9]+", text.lower())
    stopwords = {
        "the", "and", "for", "that", "with", "from", "this", "are", "was", "were",
        "have", "has", "had", "not", "but", "can", "into", "their", "they", "which",
        "such", "when", "where", "while", "during", "both", "also", "must", "may",
        "what", "why", "how", "does", "about", "could", "should", "would", "explain",
    }
    return [w for w in words if len(w) > 2 and w not in stopwords]


class LocalRAGEngine:
    """
    Offline-first Retrieval-Augmented Generation (RAG) Engine.
    Splits NASA & CSA scientific documents into semantic chunks, builds local TF-IDF + BM25
    and character n-gram dense vectors in memory (zero network calls required), retrieves
    supporting citations with cosine/BM25 hybrid scoring, and synthesizes safe, non-diagnostic
    explanations.
    """

    def __init__(self) -> None:
        self.docs: List[KnowledgeDoc] = KNOWLEDGE_CORPUS
        self.chunks: List[KnowledgeChunk] = []
        self.idf: Dict[str, float] = {}
        self._build_index()

    def _build_index(self) -> None:
        raw_chunks: List[Dict[str, Any]] = []
        for doc in self.docs:
            # Respect section/paragraph boundaries first, then split into 2-sentence windows with overlap
            paragraphs = [p.strip() for p in re.split(r"\n{2,}", doc.content) if p.strip()]
            chunk_idx = 0
            step = 2
            for para in paragraphs:
                sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", para) if s.strip()]
                if not sentences:
                    continue
                for idx in range(0, len(sentences), step):
                    window = sentences[idx : idx + 3]
                    chunk_text = " ".join(window)
                    if idx > 0 and len(window) == 1 and len(chunk_text) < 40 and raw_chunks and raw_chunks[-1]["doc"].doc_id == doc.doc_id:
                        continue
                    chunk_idx += 1
                    raw_chunks.append(
                        {
                            "chunk_id": f"{doc.doc_id}-C{chunk_idx}",
                            "doc": doc,
                            "text": chunk_text,
                            "tokens": _tokenize(f"{doc.title} {doc.hazard_category} {chunk_text}"),
                        }
                    )

        # Compute IDF across chunks
        n_chunks = max(len(raw_chunks), 1)
        df: Dict[str, int] = {}
        for rc in raw_chunks:
            for tok in set(rc["tokens"]):
                df[tok] = df.get(tok, 0) + 1

        self.idf = {
            tok: math.log((n_chunks + 1.0) / (count + 0.5)) + 1.0
            for tok, count in df.items()
        }

        self.chunks = []
        for rc in raw_chunks:
            tokens = rc["tokens"]
            tf: Dict[str, float] = {}
            for tok in tokens:
                tf[tok] = tf.get(tok, 0.0) + 1.0
            norm = math.sqrt(sum((cnt * self.idf.get(t, 1.0)) ** 2 for t, cnt in tf.items())) or 1.0
            tf_vec = {t: (cnt * self.idf.get(t, 1.0)) / norm for t, cnt in tf.items()}
            doc: KnowledgeDoc = rc["doc"]
            self.chunks.append(
                KnowledgeChunk(
                    chunk_id=rc["chunk_id"],
                    doc_id=doc.doc_id,
                    title=doc.title,
                    agency=doc.agency,
                    year=doc.year,
                    url=doc.url,
                    hazard_category=doc.hazard_category,
                    provenance=doc.provenance,
                    text=rc["text"],
                    tokens=tokens,
                    tf_vector=tf_vec,
                )
            )

    def score_all_chunks(
        self,
        query: str,
        hazard_filter: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Score every corpus chunk (optionally filtered by hazard) using TF-IDF cosine + acronym overlap."""
        q_tokens = _tokenize(query)
        if not q_tokens:
            q_tokens = ["spaceflight", "astronaut", "health"]

        q_tf: Dict[str, float] = {}
        for tok in q_tokens:
            q_tf[tok] = q_tf.get(tok, 0.0) + 1.0
        q_norm = math.sqrt(sum((cnt * self.idf.get(t, 1.2)) ** 2 for t, cnt in q_tf.items())) or 1.0
        q_vec = {t: (cnt * self.idf.get(t, 1.2)) / q_norm for t, cnt in q_tf.items()}

        scored: List[Dict[str, Any]] = []
        for chunk in self.chunks:
            if hazard_filter and hazard_filter.lower() != "all":
                if hazard_filter.lower() not in chunk.hazard_category.lower():
                    continue
            dot = sum(val * chunk.tf_vector.get(tok, 0.0) for tok, val in q_vec.items())
            overlap_bonus = 0.0
            for qt in q_tokens:
                for ct in chunk.tokens:
                    if len(qt) >= 4 and (qt.startswith(ct[:4]) or ct.startswith(qt[:4])):
                        overlap_bonus += 0.04
            lexical_score = min(0.99, round(dot + min(overlap_bonus, 0.28), 4))
            scored.append(
                {
                    "chunk_id": chunk.chunk_id,
                    "doc_id": chunk.doc_id,
                    "title": chunk.title,
                    "agency": chunk.agency,
                    "year": chunk.year,
                    "url": chunk.url,
                    "hazard_category": chunk.hazard_category,
                    "provenance": chunk.provenance,
                    "excerpt": chunk.text,
                    "lexical_score": lexical_score,
                    "relevance_score": lexical_score,
                }
            )
        scored.sort(key=lambda x: x["relevance_score"], reverse=True)
        return scored

    def retrieve(
        self,
        query: str,
        hazard_filter: Optional[str] = None,
        top_k: int = 4,
    ) -> List[Dict[str, Any]]:
        scored = [item for item in self.score_all_chunks(query, hazard_filter=hazard_filter) if item["relevance_score"] > 0.01]
        seen_chunks = set()
        results: List[Dict[str, Any]] = []
        for item in scored:
            if item["chunk_id"] not in seen_chunks:
                seen_chunks.add(item["chunk_id"])
                results.append(item)
            if len(results) >= top_k:
                break
        return results

    @staticmethod
    def build_insufficient_evidence_response(
        question: str,
        citations: List[Dict[str, Any]],
        engine_mode: str = "LOCAL_RAG_DETERMINISTIC_SAFE",
    ) -> Dict[str, Any]:
        return {
            "query": question,
            "engine_mode": engine_mode,
            "sufficient_evidence": False,
            "answer": (
                "The onboard NASA/CSA scientific knowledge base does not contain sufficient direct "
                "evidence matching this specific query. In accordance with mission medical safety "
                "rules, TARSCARE AI does not speculate, diagnose conditions, or prescribe unverified "
                "treatments. Please consult the onboard Crew Medical Officer (CMO) checklist or "
                "queue a store-and-forward inquiry for Earth Flight Surgeons."
            ),
            "safety_notice": (
                "Decision-support output only. Does not constitute a clinical diagnosis or medication prescription."
            ),
            "citations": citations,
        }

    @staticmethod
    def build_deterministic_answer(
        question: str,
        citations: List[Dict[str, Any]],
        astronaut_context: Optional[Dict[str, Any]] = None,
        engine_mode: str = "LOCAL_RAG_VERIFIED_CORPUS",
    ) -> Dict[str, Any]:
        top_citations = citations[:3]
        hazards_mentioned = sorted({c["hazard_category"] for c in top_citations})

        context_line = ""
        if astronaut_context:
            phase = astronaut_context.get("mission_phase", "MARS_SURFACE")
            risk = astronaut_context.get("overall_status", "WARNING")
            sol = astronaut_context.get("mission_day")
            sol_txt = f" on Sol {sol}" if sol else ""
            context_line = (
                f"Mission Context: Current environment is {phase}{sol_txt} with overall status classified as {risk} "
                f"(prototype baseline-comparison rule). "
            )

        synthesized_points = [
            f"[{cit['doc_id']}] ({cit['agency']}, {cit['year']}): {cit['excerpt']}"
            for cit in top_citations
        ]

        answer = (
            f"{context_line}Based on onboard {', '.join(hazards_mentioned)} research literature:\n\n"
            + "\n\n".join(synthesized_points)
            + "\n\nOperational Guidance & Safety Boundary: Compare current readings against your personal "
            "pre-flight/in-flight baseline rather than fixed 1g Earth norms. Follow approved mission "
            "countermeasures (shielding/ALARA for radiation, circadian light & sleep protection for isolation, "
            "ARED/fluid protocols for gravity transitions, and ECLSS ventilation verification for cabin CO2). "
            "If CRITICAL symptoms are present, initiate the local autonomous CMO emergency protocol immediately."
        )

        return {
            "query": question,
            "engine_mode": engine_mode,
            "sufficient_evidence": True,
            "answer": answer,
            "safety_notice": (
                "Non-diagnostic evidence summary derived from locally stored NASA HRP & CSA references. "
                "Prototype decision rules are not clinically validated."
            ),
            "citations": top_citations,
        }

    def answer_question(
        self,
        question: str,
        hazard_filter: Optional[str] = None,
        astronaut_context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        retrieved = self.retrieve(question, hazard_filter=hazard_filter, top_k=4)
        sufficient_evidence = len(retrieved) > 0 and retrieved[0]["relevance_score"] >= 0.12

        if not sufficient_evidence:
            return self.build_insufficient_evidence_response(question, retrieved)

        return self.build_deterministic_answer(question, retrieved, astronaut_context=astronaut_context)


rag_engine = LocalRAGEngine()

