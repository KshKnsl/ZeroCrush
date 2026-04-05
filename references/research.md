# CrowdPulse Research & Reference Materials

---

## DROPOUT — Crowd Monitoring System

**Links:**
- [GitHub Repository](https://github.com/w2ll2am/A16ZxMistral)
- [Devpost Submission](https://devpost.com) — Mistral AI London Hackathon


### Core Features
1. **Multi-Hazard Detection** *(beyond crowd monitoring)*
   - Fire & smoke detection

2. **Interactive Operator Chatbot**
   - Deep image analysis on operator queries
   - AI-generated response strategies via natural language interface

---

## Technical Architecture

### Vision Language Model (VLM) Pipeline
- **Pixtral (Mistral VLM)** — semantic understanding of video content beyond basic object detection
- Multi-feed parallel analysis
- Operator can ask questions about specific alerts → deeper contextual re-analysis

### Inference-Time Compute / Chain-of-Thought
- **Inspired by OpenAI o1** — more compute at inference = better reasoning
- **Finetuned Mistral 7B** with Chain-of-Thought data
- **Validator model:** Prompt-optimised Mistral 7B Instruct rates CoT step validity
- **First inference-time compute implementation on Mistral**
- Produces strategic advice grounded in image content + camera metadata (not just alerts)

---

## Zero Stampede Nation — India's AI-Powered Crowd Safety

**Source:** ReThynk AI Innovation & Research Pvt Ltd  
**Links:**
- [YouTube Presentation](https://youtu.be/-PXS29vUZu8)
- [Medium Article](https://jaideeparashar.medium.com/zero-stampede-nation-a-new-india-vision-with-ai-powered-crowd-safety-26424448c03e)

---

### Step-by-Step Workflow

#### PHASE 1: Pre-Registration (Mandatory for ALL events — free or paid)
**Registration Output:**
- QR Code + Unique ID Number (via SMS)
- Gate Entry Number (distribute crowd across multiple gates)
- Seat Number (if applicable)
- Essential Carry Details (documents, ID proof)
- Facility Info: nearest parking, food ports, shuttle services

**Initial Capacity Rules:**
- Allow registration for **capacity + 5% only**
- Accounts for no-shows → actual turnout = 100% capacity
- Example: 10,000 capacity → allow 10,500 registrations

**Database Creation:**
- Name, contact (SMS, WhatsApp, Email), gate assignment, seat number
- Family group linking (same gate, nearby seats)

---

#### PHASE 2: Entry Control (QR/ID Scanning at Gates)
**Smart Gate System:**
- QR scan at assigned gate (if no smartphone → manual unique ID entry)
- Real-time validation: right gate, right time, right seat
- **Smart Signage:** Green (low load) / Yellow (moderate) / Red (at capacity)
- Family members enter together from same gate

**Gate Protocols:**
- Separate gates for: VVIP movement, emergency units (ambulance/fire), public entry
- Ensures emergency access without crowd interference

---

#### PHASE 3: Real-Time Communication & Monitoring
**Instant Alert System:**
- Schedule changes → bulk SMS + WhatsApp + Email to all attendees
- AI-powered Q&A chatbot (WhatsApp/SMS) for attendee questions
- Prevents rumors/misinformation with official event updates

**Advanced Stage — GPS Tracking:**
- Track family members within large stadium venues (hundreds of meters)
- Dashboard shows real-time crowd distribution heat maps
- Individual/group location tracking via registered phones

**AI Crowd Monitoring:**
- CCTV + YOLO AI → real-time density detection
- LSTM models → predict panic patterns before they escalate
- Alerts: *"Zone B approaching risk threshold - reroute traffic"*

---

#### PHASE 4: Emergency Protocols
**Exit Management:**
- Exit from same gate as entry (minimize confusion)
- Emergency gates kept clear for responders
- AI-triggered evacuation routes if stress spike detected

**Thermal Monitoring (Advanced):**
- IoT sensors at gates for movement tracking
- Thermal cameras detect unusual crowd heat patterns

---

### Technology Stack

| Component           | Technology                                    |
|---------------------|-----------------------------------------------|
| Detection           | YOLO AI Models (real-time crowd detection)    |
| Prediction          | LSTM Models (forecast panic patterns)         |
| Hardware            | IoT Sensor Gates, Thermal Monitoring          |
| Entry Control       | QR Code Scanning System                       |
| Communication       | SMS API, WhatsApp Business API                |
| Platform            | Website or Startup for registration           |
| Infrastructure      | AWS Cloud OR Edge Computing                   |
| Dashboard           | Live control room with GPS heat maps          |
| Data Privacy        | Minimal data collection, govt policy compliant|

---

### Implementation Roadmap

**Initial Stage:**
1. Stakeholder alignment (police, law enforcement, event organizers)
2. Platform setup (website/startup for registrations)
3. QR code + cloud logic configuration
4. **Dry runs with simulations** (5% over capacity for testing)

**Advanced Stage:**
5. AI camera + alert integration
6. GPS tracking for large venues
7. Thermal monitoring systems
8. Scale capacity rules based on test results

---

### Key Insights
> "Stampedes happen because of chaos, not crime. If anything can go wrong, it will go wrong — always prepare for worst case."

> "AI is powerful only when it gets actual data. No data = no planning = disaster."

**Vision:** Zero Stampede Nation — Make India the first country with zero stampede deaths

---