"""
Generative AI layer: personalised recommendations + an AI coach chat.

Grounding: the model gets (a) the user's real scan history from the twin and
(b) a small knowledge base of Indian waste rules below, so answers are specific
instead of generic. Without a Gemini key, rule-based tips are returned so the
app still works offline.
"""
import json
import os

from detector import explain, gemini_client, gemini_generate

KNOWLEDGE = """
Indian waste rules and practice (summary, for grounding):
- Solid Waste Management Rules, 2016: households must segregate waste at source into
  wet (biodegradable), dry (non-biodegradable) and domestic hazardous waste, and hand it
  to authorised collectors. Bulk generators should compost or process wet waste on site.
- Bengaluru (BBMP) asks households for separate wet, dry and sanitary/reject waste; dry
  waste can go to Dry Waste Collection Centres (DWCCs).
- E-Waste (Management) Rules, 2022: producers have Extended Producer Responsibility (EPR);
  consumers should give e-waste to authorised collectors, recyclers or take-back schemes.
- Plastic Waste Management Rules: many single-use plastic items (straws, plastic cutlery,
  earbuds with plastic sticks, thin carry bags, etc.) are banned in India since July 2022.
- Batteries, CFL/tube lights (mercury), paint, pesticides, expired medicines, sanitary
  waste and syringes must not go into wet or dry bins.
- The informal sector (kabadiwalas / scrap dealers) buys paper, cardboard, PET, metal and
  glass; clean and dry material fetches better prices.
- Contamination (food residue, wet paper, mixed waste) is the main reason recyclables end
  up in landfill.
"""

LANGS = {"en": "English", "kn": "Kannada", "hi": "Hindi", "ta": "Tamil", "te": "Telugu"}


def _history_summary(stats, sim=None):
    return json.dumps({
        "items_scanned": stats["items"],
        "by_category": stats["by_category"],
        "by_material_kg": stats["by_material"],
        "scrap_value_rs": stats["value_rs"],
        "co2_saved_kg": stats["co2_saved_kg"],
        "items_needing_cleaning": stats["needs_cleaning"],
    })


def _ask(prompt, json_mode=False):
    client = gemini_client()
    if not client:
        return None
    cfg = {"temperature": 0.6}
    if json_mode:
        cfg["response_mime_type"] = "application/json"
    resp = gemini_generate(prompt, cfg)
    return resp.text


def recommend(stats, lang="en"):
    language = LANGS.get(lang, "English")
    prompt = f"""{KNOWLEDGE}

User's real recycling data from the digital twin:
{_history_summary(stats)}

Write 4 personalised, specific recommendations in {language} that improve this
user's recycling and support a circular economy. Use their actual numbers.
Include at least one money-saving or money-earning tip and one reduce/reuse tip.
Return ONLY a JSON array of objects:
{{"title": short title, "detail": 1-2 sentences, "impact": short measurable impact,
  "type": one of "reduce","reuse","recycle","safety","earn"}}"""
    try:
        text = _ask(prompt, json_mode=True)
        if text:
            data = json.loads(text)
            if isinstance(data, dict):
                data = data.get("recommendations", [])
            return {"source": "gemini", "items": data[:6]}
    except Exception:
        pass
    return {"source": "rules", "items": rule_tips(stats)}


def coach(question, stats, history=None, lang="en"):
    language = LANGS.get(lang, "English")
    convo = "\n".join(f"{m['role']}: {m['text']}" for m in (history or [])[-6:])
    prompt = f"""You are EcoLoop Coach, a friendly, practical recycling assistant for India.
{KNOWLEDGE}
User data: {_history_summary(stats)}
Conversation so far:
{convo}
User: {question}
Answer in {language}, in under 120 words, practical and specific. If the item is
hazardous, say clearly that it must not go in normal bins."""
    try:
        text = _ask(prompt)
        if text:
            return {"source": "gemini", "answer": text.strip()}
    except Exception as e:
        return {"source": "error", "answer": explain(e)}
    return {"source": "rules",
            "answer": "The AI coach needs a Gemini API key. Add GEMINI_API_KEY to backend/.env "
                      "and restart the server. Meanwhile, your tips on the left are rule-based."}


def rule_tips(stats):
    cats = stats.get("by_category", {})
    tips = []
    if stats.get("needs_cleaning"):
        tips.append({"title": "Rinse before you bin",
                     "detail": f"{stats['needs_cleaning']} of your items were dirty or had caps on. "
                               "Contaminated recyclables usually end up in landfill.",
                     "impact": "Up to 3x more of your dry waste recycled", "type": "recycle"})
    if cats.get("hazardous", {}).get("count"):
        tips.append({"title": "Keep hazardous items separate",
                     "detail": "Store batteries and e-waste in a box and drop them at an authorised "
                               "e-waste collector once a month.",
                     "impact": "Keeps toxins out of soil and water", "type": "safety"})
    if cats.get("recyclable", {}).get("count"):
        tips.append({"title": "Sell your dry waste",
                     "detail": f"Your scans are worth about Rs {stats['value_rs']} at a scrap dealer "
                               "if kept clean and dry.",
                     "impact": f"Rs {stats['value_rs']} earned", "type": "earn"})
    if cats.get("biodegradable", {}).get("count"):
        tips.append({"title": "Start a small compost bin",
                     "detail": "Your wet waste can become compost in about 6 weeks with a simple "
                               "two-pot setup.",
                     "impact": "Less weight sent to landfill", "type": "reduce"})
    tips.append({"title": "Carry a refill bottle",
                 "detail": "PET bottles are among the most common scanned items. A steel bottle "
                           "replaces hundreds of them a year.",
                 "impact": "Fewer single-use plastics", "type": "reuse"})
    return tips[:4]
