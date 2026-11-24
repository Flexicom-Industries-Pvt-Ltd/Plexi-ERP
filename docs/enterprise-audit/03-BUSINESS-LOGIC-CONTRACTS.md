# Plexi-ERP Manufacturing Business Logic Contracts

> [!IMPORTANT]
> The contracts documented here represent authoritative manufacturing calculations, operational workflows, and invariants. Under the Zero-Regression Non-Negotiable Rules, **no remediation or security hardening may alter any formula, conversion factor, shift attribution rule, or rounding convention.**

---

## 1. Tape Plant Production Formulas
- **Calculated Denier**:
  $$\text{Denier} = \frac{\text{Weight of 9000 meters of tape in grams}}{\text{Meters}} \times 9000$$
  Equivalently, for a sample of length $L$ meters weighing $W$ grams:
  $$\text{Denier} = \frac{W \times 9000}{L}$$
- **Draw Ratio**:
  $$\text{Draw Ratio} = \frac{\text{Godet 2 Speed (mpm)}}{\text{Godet 1 Speed (mpm)}}$$
- **Material Consumption Ratio**:
  $$\sum \text{Percentage of Ingredients} = 100.0\%$$
  Raw Materials: PP Granules + Calcium Filler Masterbatch (CaCO3) + Color Masterbatch + Additives (UV/Antislip).

---

## 2. Loom Weaving & Fabric Calculation
- **Fabric Grams per Square Meter (GSM)**:
  $$\text{GSM} = \frac{\text{Net Weight (kg)} \times 1000}{\text{Fabric Width (m)} \times \text{Roll Length (m)}}$$
  For tubular woven circular fabric:
  $$\text{GSM} = \frac{\text{Net Weight (kg)} \times 1000}{2 \times \text{Lay-Flat Width (m)} \times \text{Roll Length (m)}}$$
- **Quality Grading Invariant**:
  - `Grade "A"`: Full specification compliance, zero warp/weft defects.
  - `Grade "B"`: Minor cosmetic variations, within secondary tolerance.
  - `Scrap / Cut-roll`: Severe warp breakage, re-routed to Recycling Plant (RP Granules).

---

## 3. Extrusion Lamination & Coating
- **Coating GSM**:
  $$\text{Coating GSM} = \text{Laminated Fabric GSM} - \text{Base Fabric GSM}$$
- **Lamination Wastage Rate**:
  $$\text{Wastage \%} = \frac{\text{Trim Wastage (kg)} + \text{Start-up Lump (kg)}}{\text{Total Polymer Consumed (kg)}} \times 100$$

---

## 4. Bag Conversion (Convertex & Valvomatic)
- **Cut Length Calculation**:
  $$\text{Cut Length (cm)} = \text{Bag Height (cm)} + \text{Top Patch Valve Allowance} + \text{Bottom Fold Allowance}$$
- **Standard Conversion Tolerances**:
  - Length: $\pm 3\text{ mm}$
  - Width: $\pm 2\text{ mm}$

---

## 5. Shift Schedule & Attendance Attribution
- **Factory Shift Structure**:
  - `Shift A`: 06:00 to 14:00 (Morning)
  - `Shift B`: 14:00 to 22:00 (Evening)
  - `Shift C`: 22:00 to 06:00 (Night - crosses calendar date midnight)
- **Punch Deduplication Window**:
  - $45\text{ seconds}$ duplicate filter window for double taps on biometric terminals.
