"""
Digital Twin of the material flow.

Every scanned item is an event. The twin routes each item along the path it
would really take (bin -> collection -> facility -> outcome) and aggregates
the weights into a Sankey graph. simulate() runs what-if scenarios at
neighbourhood scale.

Recovery rates and per-household figures below are demo assumptions; they are
returned in the API response so the UI can show them openly.
"""
import time
from collections import defaultdict

ASSUMPTIONS = {
    "mrf_recovery_clean": 0.85,       # share of clean dry waste actually recycled at a sorting centre
    "mrf_recovery_dirty": 0.30,       # share recovered when contaminated
    "compost_yield": 0.90,            # share of wet waste composted when segregated
    "informal_recovery_mixed": 0.10,  # share rag-pickers recover from mixed waste
    "reuse_uptake": 0.60,             # share of reusable items that get a second life
    "kg_per_household_day": 1.2,
    "default_mix": {"biodegradable": 0.55, "recyclable": 0.30, "reusable": 0.12, "hazardous": 0.03},
    # weighted kabadiwala rate for a typical dry-waste mix (paper/cardboard heavy, some PET and metal), Aug 2026
    "value_rs_per_kg": {"recyclable": 12, "reusable": 8, "biodegradable": 2, "hazardous": 0},
    "co2_per_kg": {"recyclable": 1.4, "reusable": 2.0, "biodegradable": 0.5, "hazardous": 0.8},
}

STAGES = {
    "recyclable": ["Dry bin", "Sorting centre", "Recycled material"],
    "biodegradable": ["Wet bin", "Compost unit", "Compost"],
    "hazardous": ["Hazard drop-off", "Authorised handler", "Safe disposal"],
    "reusable": ["Reuse / donate", "Second life", "Reused"],
}
SOURCE, LANDFILL = "Scanned waste", "Landfill"


def _clean(it):
    return (it.get("condition") or "clean") in ("clean", "ok")


def build(items):
    """Return Sankey nodes/links (kg) plus twin KPIs from item events."""
    A = ASSUMPTIONS
    flow = defaultdict(float)  # (a, b) -> kg
    totals = defaultdict(float)
    for it in items:
        kg = (it.get("weight_g") or 0) / 1000
        cat = it.get("category", "recyclable")
        if kg <= 0 or cat not in STAGES:
            continue
        b, f, out = STAGES[cat]
        flow[(SOURCE, b)] += kg
        flow[(b, f)] += kg
        if cat == "recyclable":
            rate = A["mrf_recovery_clean"] if _clean(it) else A["mrf_recovery_dirty"]
        elif cat == "biodegradable":
            rate = A["compost_yield"]
        elif cat == "reusable":
            rate = A["reuse_uptake"]
        else:
            rate = 1.0
        flow[(f, out)] += kg * rate
        if rate < 1:
            flow[(f, LANDFILL)] += kg * (1 - rate)
        totals[out] += kg * rate
        totals[LANDFILL] += kg * (1 - rate)
        totals["input"] += kg

    names = []
    for a, b in flow:
        for n in (a, b):
            if n not in names:
                names.append(n)
    links = [{"source": names.index(a), "target": names.index(b), "value": round(v, 3)}
             for (a, b), v in flow.items() if v > 0.0005]
    total = totals["input"]
    diverted = total - totals[LANDFILL]
    return {
        "nodes": [{"name": n} for n in names],
        "links": links,
        "kpis": {
            "input_kg": round(total, 3),
            "diverted_kg": round(diverted, 3),
            "landfill_kg": round(totals[LANDFILL], 3),
            "diversion_rate": round(diverted / total * 100, 1) if total else 0,
            "outcomes": {k: round(v, 3) for k, v in totals.items() if k != "input"},
        },
        "assumptions": A,
    }


def mix_from(items):
    """Waste composition by weight from real scans (falls back to default)."""
    w = defaultdict(float)
    for it in items:
        w[it["category"]] += it.get("weight_g") or 0
    s = sum(w.values())
    d = ASSUMPTIONS["default_mix"]
    if s <= 0:
        return dict(d), "default"
    # blend towards the user's real mix as they scan more (full trust at 3 kg)
    t = min(1.0, s / 3000)
    mix = {k: (1 - t) * d[k] + t * w.get(k, 0) / s for k in d}
    return mix, f"{round(t * 100)}% from your scans"


def _scenario(mix, households, days, seg, contamination):
    A = ASSUMPTIONS
    total = households * days * A["kg_per_household_day"]
    R, B, U, H = (total * mix.get(k, 0) for k in ("recyclable", "biodegradable", "reusable", "hazardous"))
    recycled = R * seg * ((1 - contamination) * A["mrf_recovery_clean"] + contamination * A["mrf_recovery_dirty"]) \
        + R * (1 - seg) * A["informal_recovery_mixed"]
    composted = B * seg * A["compost_yield"]
    reused = U * seg * A["reuse_uptake"]
    safe = H * seg
    diverted = recycled + composted + reused + safe
    v, c = A["value_rs_per_kg"], A["co2_per_kg"]
    return {
        "total_kg": round(total),
        "recycled_kg": round(recycled),
        "composted_kg": round(composted),
        "reused_kg": round(reused),
        "hazard_safe_kg": round(safe),
        "hazard_unsafe_kg": round(H - safe),
        "landfill_kg": round(total - diverted),
        "diversion_rate": round(diverted / total * 100, 1) if total else 0,
        "value_rs": round(recycled * v["recyclable"] + reused * v["reusable"] + composted * v["biodegradable"]),
        "co2_saved_kg": round(recycled * c["recyclable"] + reused * c["reusable"]
                              + composted * c["biodegradable"] + safe * c["hazardous"]),
    }


def simulate(items, households=1000, days=30, segregation_pct=40, contamination_pct=30,
             baseline_segregation_pct=20, baseline_contamination_pct=40):
    mix, mix_source = mix_from(items)
    base = _scenario(mix, households, days, baseline_segregation_pct / 100, baseline_contamination_pct / 100)
    new = _scenario(mix, households, days, segregation_pct / 100, contamination_pct / 100)
    delta = {k: new[k] - base[k] for k in new if isinstance(new[k], (int, float))}
    return {"baseline": base, "scenario": new, "delta": delta, "mix": mix, "mix_source": mix_source,
            "inputs": {"households": households, "days": days, "segregation_pct": segregation_pct,
                       "contamination_pct": contamination_pct}}


def stats(items):
    by_cat = defaultdict(lambda: {"count": 0, "kg": 0.0})
    by_mat = defaultdict(float)
    by_day = defaultdict(lambda: defaultdict(int))
    for it in items:
        c = by_cat[it["category"]]
        c["count"] += 1
        c["kg"] += (it["weight_g"] or 0) / 1000
        by_mat[it["material"]] += (it["weight_g"] or 0) / 1000
        day = time.strftime("%d %b", time.localtime(it["created"]))
        by_day[day][it["category"]] += 1
    return {
        "items": len(items),
        "value_rs": round(sum(i["value_rs"] or 0 for i in items), 2),
        "co2_saved_kg": round(sum(i["co2_saved_kg"] or 0 for i in items), 3),
        "weight_kg": round(sum(i["weight_g"] or 0 for i in items) / 1000, 3),
        "by_category": {k: {"count": v["count"], "kg": round(v["kg"], 3)} for k, v in by_cat.items()},
        "by_material": {k: round(v, 3) for k, v in sorted(by_mat.items(), key=lambda x: -x[1])},
        "by_day": [{"day": d, **v} for d, v in list(by_day.items())[-14:]],
        "needs_cleaning": sum(1 for i in items if (i.get("condition") or "clean") not in ("clean", "ok")),
    }
