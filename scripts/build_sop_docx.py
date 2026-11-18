import os
import sys
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

DOC_DIR = r"c:\Users\User\Desktop\Flexicom ERP"
ASSETS_DIR = r"c:\Users\User\Desktop\Flexicom ERP\Plexi-ERP\doc_assets"
OUTPUT_PATH = os.path.join(DOC_DIR, "PLEXI_ERP_END_TO_END_SOP_MANUAL.docx")
LOGO_PATH = os.path.join(DOC_DIR, "PLASCOM& FLEXICOM LOGO.png")

COLOR_NAVY = RGBColor(27, 54, 93)       # #1B365D
COLOR_STEEL = RGBColor(51, 83, 131)     # #335383
COLOR_CHARCOAL = RGBColor(30, 41, 59)   # #1E293B
COLOR_MUTED = RGBColor(100, 116, 139)   # #64748B
COLOR_EMERALD = RGBColor(16, 149, 106)  # #10956A
COLOR_WHITE = RGBColor(255, 255, 255)

HEX_NAVY = "1B365D"
HEX_LIGHT_BLUE = "F0F4F8"
HEX_ZEBRA = "F8FAFC"
HEX_BORDER = "CBD5E1"
HEX_HEADER_CELL = "1B365D"

def set_cell_background(cell, fill_hex):
    shading = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    cell._tc.get_or_add_tcPr().append(shading)

def set_cell_margins(cell, top=100, bottom=100, left=140, right=140):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'<w:tcMar {nsdecls("w")}><w:top w:w="{top}" w:type="dxa"/><w:bottom w:w="{bottom}" w:type="dxa"/><w:left w:w="{left}" w:type="dxa"/><w:right w:w="{right}" w:type="dxa"/></w:tcMar>')
    tcPr.append(tcMar)

def set_table_borders(table, color="CCCCCC"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(f'<w:tblBorders {nsdecls("w")}><w:top w:val="single" w:sz="4" w:space="0" w:color="{color}"/><w:left w:val="single" w:sz="4" w:space="0" w:color="{color}"/><w:bottom w:val="single" w:sz="4" w:space="0" w:color="{color}"/><w:right w:val="single" w:sz="4" w:space="0" w:color="{color}"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="{color}"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="{color}"/></w:tblBorders>')
    tblPr.append(borders)

def add_header(doc, text, level=1):
    h = doc.add_heading(text, level=level)
    h.paragraph_format.space_before = Pt(14)
    h.paragraph_format.space_after = Pt(4)
    h.paragraph_format.keep_with_next = True
    for r in h.runs:
        r.font.name = 'Arial'
        if level == 1:
            r.font.size = Pt(14)
            r.font.bold = True
            r.font.color.rgb = COLOR_NAVY
        elif level == 2:
            r.font.size = Pt(12)
            r.font.bold = True
            r.font.color.rgb = COLOR_STEEL
        else:
            r.font.size = Pt(10.5)
            r.font.bold = True
            r.font.color.rgb = COLOR_CHARCOAL
    return h

def add_p(doc, text="", bold_prefix=None, space_after=4, italic=False):
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = 'Arial'
        r_pre.font.size = Pt(9.5)
        r_pre.font.bold = True
        r_pre.font.color.rgb = COLOR_CHARCOAL
    if text:
        r = p.add_run(text)
        r.font.name = 'Arial'
        r.font.size = Pt(9.5)
        r.font.italic = italic
        r.font.color.rgb = COLOR_CHARCOAL
    return p

def add_bullet(doc, text, bold_prefix=None):
    p = doc.add_paragraph(style='List Bullet')
    p.paragraph_format.space_after = Pt(3)
    p.paragraph_format.line_spacing = 1.15
    if bold_prefix:
        r_pre = p.add_run(bold_prefix)
        r_pre.font.name = 'Arial'
        r_pre.font.size = Pt(9.5)
        r_pre.font.bold = True
        r_pre.font.color.rgb = COLOR_CHARCOAL
    if text:
        r = p.add_run(text)
        r.font.name = 'Arial'
        r.font.size = Pt(9.5)
        r.font.color.rgb = COLOR_CHARCOAL
    return p

def add_callout(doc, title, text):
    table = doc.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    cell = table.rows[0].cells[0]
    cell.width = Inches(6.8)
    set_cell_background(cell, "F8FAFC")
    set_cell_margins(cell, top=100, bottom=100, left=160, right=140)
    tcPr = cell._tc.get_or_add_tcPr()
    borders = parse_xml(f'<w:tcBorders {nsdecls("w")}><w:top w:val="none"/><w:left w:val="single" w:sz="24" w:color="{HEX_NAVY}"/><w:bottom w:val="none"/><w:right w:val="none"/></w:tcBorders>')
    tcPr.append(borders)
    p = cell.paragraphs[0]
    p.paragraph_format.space_after = Pt(0)
    r1 = p.add_run(f"📌 {title}: ")
    r1.font.name = 'Arial'
    r1.font.bold = True
    r1.font.size = Pt(9.5)
    r1.font.color.rgb = COLOR_NAVY
    r2 = p.add_run(text)
    r2.font.name = 'Arial'
    r2.font.size = Pt(9)
    r2.font.color.rgb = COLOR_CHARCOAL
    p_spacer = doc.add_paragraph()
    p_spacer.paragraph_format.space_before = Pt(0)
    p_spacer.paragraph_format.space_after = Pt(2)

def add_screenshot(doc, filename, caption, width_in=5.8):
    img_path = os.path.join(ASSETS_DIR, filename)
    if not os.path.exists(img_path):
        print(f"Warning: Screenshot {filename} not found.")
        return
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(2)
    p.paragraph_format.keep_with_next = True
    run = p.add_run()
    run.add_picture(img_path, width=Inches(width_in))
    
    p_cap = doc.add_paragraph()
    p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cap.paragraph_format.space_before = Pt(2)
    p_cap.paragraph_format.space_after = Pt(8)
    p_cap.paragraph_format.keep_with_next = False
    r_cap = p_cap.add_run(f"Figure: {caption}")
    r_cap.font.name = 'Arial'
    r_cap.font.size = Pt(8.5)
    r_cap.font.italic = True
    r_cap.font.color.rgb = COLOR_MUTED

def style_table(table, col_widths, headers, data):
    set_table_borders(table)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False

    # Header Row
    hdr_cells = table.rows[0].cells
    for i, title in enumerate(headers):
        hdr_cells[i].width = Inches(col_widths[i])
        set_cell_background(hdr_cells[i], HEX_HEADER_CELL)
        set_cell_margins(hdr_cells[i], top=90, bottom=90, left=90, right=90)
        p = hdr_cells[i].paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run(title)
        run.font.name = 'Arial'
        run.font.bold = True
        run.font.size = Pt(8.5)
        run.font.color.rgb = COLOR_WHITE

    # Data Rows
    for row_idx, row_data in enumerate(data):
        row_cells = table.add_row().cells
        bg_color = HEX_ZEBRA if row_idx % 2 == 1 else "FFFFFF"
        for col_idx, cell_value in enumerate(row_data):
            row_cells[col_idx].width = Inches(col_widths[col_idx])
            set_cell_background(row_cells[col_idx], bg_color)
            set_cell_margins(row_cells[col_idx], top=65, bottom=65, left=90, right=90)
            p = row_cells[col_idx].paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.LEFT
            p.paragraph_format.space_after = Pt(0)
            run = p.add_run(str(cell_value))
            run.font.name = 'Arial'
            run.font.size = Pt(8)
            run.font.color.rgb = COLOR_CHARCOAL

def build_complete_sop():
    print("Initializing document...")
    doc = docx.Document()

    # Set Margins (0.8 inch all sides)
    for section in doc.sections:
        section.top_margin = Inches(0.8)
        section.bottom_margin = Inches(0.8)
        section.left_margin = Inches(0.8)
        section.right_margin = Inches(0.8)
        
        # Footer
        p_foot = section.footer.paragraphs[0]
        p_foot.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        r_f = p_foot.add_run("PLEXI-ERP Standard Operating Procedure (SOP) | Flexicom Industries Pvt. Ltd.")
        r_f.font.name = 'Arial'
        r_f.font.size = Pt(8)
        r_f.font.color.rgb = COLOR_MUTED

    # -------------------------------------------------------------
    # COVER PAGE
    # -------------------------------------------------------------
    p_top = doc.add_paragraph()
    p_top.paragraph_format.space_before = Pt(36)
    p_top.paragraph_format.space_after = Pt(12)
    p_top.alignment = WD_ALIGN_PARAGRAPH.CENTER
    if os.path.exists(LOGO_PATH):
        p_top.add_run().add_picture(LOGO_PATH, width=Inches(3.2))

    p_title = doc.add_paragraph()
    p_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_title.paragraph_format.space_before = Pt(18)
    p_title.paragraph_format.space_after = Pt(6)
    r_t = p_title.add_run("PLEXI-ERP OPERATIONAL MANUAL & STANDARD OPERATING PROCEDURE (SOP)")
    r_t.font.name = 'Arial'
    r_t.font.size = Pt(20)
    r_t.font.bold = True
    r_t.font.color.rgb = COLOR_NAVY

    p_sub = doc.add_paragraph()
    p_sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_sub.paragraph_format.space_after = Pt(24)
    r_sub = p_sub.add_run("Comprehensive End-to-End Manufacturing Workflow from Gate Entry to Volvomatic Finished Goods")
    r_sub.font.name = 'Arial'
    r_sub.font.size = Pt(12)
    r_sub.font.italic = True
    r_sub.font.color.rgb = COLOR_STEEL

    # Metadata Box
    meta_table = doc.add_table(rows=1, cols=2)
    meta_table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(meta_table, "CCCCCC")
    c1, c2 = meta_table.rows[0].cells
    c1.width = Inches(3.4)
    c2.width = Inches(3.4)
    set_cell_background(c1, "F8FAFC")
    set_cell_background(c2, "F8FAFC")
    set_cell_margins(c1, top=140, bottom=140, left=140, right=140)
    set_cell_margins(c2, top=140, bottom=140, left=140, right=140)

    p1 = c1.paragraphs[0]
    p1.paragraph_format.space_after = Pt(2)
    p1.add_run("Organization: ").bold = True
    p1.add_run("Flexicom Industries Pvt. Ltd. / Plascom\n")
    p1.add_run("System: ").bold = True
    p1.add_run("Plexi-ERP Central CRM & Factory Floor\n")
    p1.add_run("Document ID: ").bold = True
    p1.add_run("SOP-MFG-2026-V1.0")

    p2 = c2.paragraphs[0]
    p2.paragraph_format.space_after = Pt(2)
    p2.add_run("Release Date: ").bold = True
    p2.add_run("October 2026 (Production Release)\n")
    p2.add_run("Target Audience: ").bold = True
    p2.add_run("Plant Mgrs, Shift In-Charges, QC, IT\n")
    p2.add_run("Classification: ").bold = True
    p2.add_run("Confidential Internal Standard (Controlled)")

    doc.add_page_break()

    # -------------------------------------------------------------
    # TABLE OF CONTENTS / OUTLINE
    # -------------------------------------------------------------
    add_header(doc, "Table of Contents & Operational Scope", level=1)
    add_p(doc, "This manual details the standard operating procedures, mathematical calculation models, data entry protocols, validation rules, screen interfaces, and role permissions across all 16 modules in Plexi-ERP.")

    toc_items = [
        ("Chapter 1", "Manufacturing Enterprise Architecture & End-to-End Material Flow", "Core CRM, offline sync, logging, and material lifecycle"),
        ("Chapter 2", "Security & Gate Operations SOP", "Vehicle entry, weighbridge capture, driver pass, unloading, and gate out"),
        ("Chapter 3", "Inventory & Raw Material Inwarding SOP", "Gate receipt transition, stock ledger, polymer resins, masterbatch issuance"),
        ("Chapter 4", "Data Centre Master Configuration SOP", "Recipes, Loom 1-91 mappings, characteristics, units, operators, contractors"),
        ("Chapter 5", "Tape Plant (Extrusion & Bobbin Winding) SOP", "Day/night shift planning, extrusion yield, bobbin inventory, issue slips"),
        ("Chapter 6", "Circular Loom Department (Looms 1 to 91) SOP", "Shift reading sheet, roll cutting register, WIP roll stock, changeovers, summary"),
        ("Chapter 7", "Lamination Department (Sandwich Extrusion Coating) SOP", "Loom roll inwarding, bonding coating, micron control, polymer consumption, wastage"),
        ("Chapter 8", "Printing Department (Multi-Color Flexographic) SOP", "Cylinder setup, party graphics, ink & solvent ratios, printed roll inventory"),
        ("Chapter 9", "Valvomatic Department (Valve Sack Conversion) SOP", "High-speed valve bag forming, bags/minute rate, standard bags/hour, conversion scrap"),
        ("Chapter 10", "Convertex Department (Tubular Bag Finishing) SOP", "Automated cutting, bottom folding, sewing, valve pasting, and shift summaries"),
        ("Chapter 11", "Quality Assurance, Factory Scrap & Recycling Plant (RP) SOP", "QC checkpoints, non-conformance disposition, scrap re-extrusion into RP granules"),
        ("Chapter 12", "Settings, Organization Master & RBAC Administration SOP", "Roles, granular module permissions, user accounts, and immutable audit logs"),
        ("Chapter 13", "Master Database User Accounts, Credentials & Permissions Matrix", "Complete database directory of all 14 factory accounts with initial passwords"),
    ]

    toc_table = doc.add_table(rows=1, cols=3)
    style_table(toc_table, [1.3, 3.2, 2.3], ["Chapter", "Operational Module / Scope", "Key Deliverables"], toc_items)

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHAPTER 1: ENTERPRISE ARCHITECTURE
    # -------------------------------------------------------------
    add_header(doc, "Chapter 1: Manufacturing Enterprise Architecture & End-to-End Flow", level=1)
    add_p(doc, "Plexi-ERP operates on an architectural principle of One Central CRM + Multiple Independent Floor Subsystems + Single Authoritative Business Record. Factory floor execution runs with high availability, providing instant local response on ruggedized industrial terminals and Electron desktop clients while synchronizing idempotently with the cloud core.")

    add_header(doc, "1.1 The Complete Physical Material Flowchart", level=2)
    add_p(doc, "Manufacturing in Flexicom Industries follows a strict, traceable transformation chain where physical material batches move through sequential processing gates:")

    steps = [
        ("Gate Entry & Weighbridge", "Security logs incoming truck with PO/Challan. Weighbridge captures Gross Laden Weight in KG. Truck enters factory premises."),
        ("Inventory Raw Material Inwarding", "Storekeeper inspects cargo (Polypropylene, CaCO3, Masterbatch, Inks). Unloading authorized. Weighbridge captures Tare Empty Weight. Net Delivered KG auto-credited to Inventory."),
        ("Tape Plant Extrusion", "Extruder melts polymer blend according to approved recipe (Denier, tape width, CaCO3 %). Extruded film stretched into high-tenacity tapes wound onto bobbins."),
        ("Circular Weaving (91 Looms)", "Bobbins issued to Looms 1-91. Circular looms weave continuous tubular fabric. Shift pick readings captured every 2 hours. Rolls cut at target length (2,500m - 5,000m) and weighed."),
        ("Lamination Plant", "Tubular rolls extrusion-coated with molten LDPE/PP bonding film (15-30 micron) to achieve moisture-proof air-tight barrier properties. Edge trim scrap recycled."),
        ("Flexographic Printing", "Laminated or plain tubular fabric printed with customer brand graphics and statutory details using precision flexo cylinders and alcohol/solvent inks."),
        ("Valvomatic & Convertex Conversion", "Tubular rolls transformed into finished valve bags. Valvomatic forms bottom, inserts valve patch, folds, and seals sacks at speeds up to 100-120 bags/minute."),
        ("Quality Assurance & Testing", "In-line and final QC checks: Drop test, burst strength, air permeability, tensile break force, seam weld strength. Rejected lots marked for Rework or Scrap."),
        ("Recycling Plant (Closing the Loop)", "All factory scrap (Tape lumps, Loom trim, Lamination scrap, Printing rejects, Conversion trims) aggregated, washed, shredded, and re-extruded into RP Granules."),
        ("Finished Goods Baling & Dispatch", "Approved valve bags counted, compressed into bales (500/1000 bags), labeled with customer tags, loaded onto authorized outbound trucks, and cleared via Gate Out pass."),
    ]
    for s_title, s_desc in steps:
        add_bullet(doc, s_desc, bold_prefix=f"{s_title}: ")

    add_header(doc, "1.2 Traceability & Deep Audit Standard", level=2)
    add_p(doc, "Every business transaction, material issuance, roll cut, machine downtime, and status transition automatically captures nine immutable audit parameters: WHO performed it, WHAT action was executed, WHEN it occurred (microsecond precision), WHERE it took place, FROM WHICH IP/DEVICE, AGAINST WHICH LOT/RECORD, PREVIOUS STATE, NEW STATE, and EXECUTION DURATION.")

    add_screenshot(doc, "02_dashboard_overview.png", "Central Executive ERP Dashboard Overview with Live Operational Metrics")

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHAPTER 2: SECURITY & GATE OPERATIONS SOP
    # -------------------------------------------------------------
    add_header(doc, "Chapter 2: Security & Gate Operations SOP", level=1)
    add_callout(doc, "Assigned Role", "Security Gate In-Charge (gate.security@plexierp.com) | Module Access: SECURITY_GATE (Full)")

    add_p(doc, "The Security & Gate module governs the physical perimeter, controlling vehicular access, driver identity, document verification, laden/tare weighbridge logging, and departure gate clearance.")

    add_header(doc, "2.1 Step-by-Step Gate Inward Workflow", level=2)
    add_bullet(doc, "Navigate to /dashboard/gate on the gate security terminal and click \"New Gate Entry\".", bold_prefix="Step 1 (Arrival): ")
    add_bullet(doc, "Select Entry Type: RAW_MATERIAL_INWARD, MACHINERY_SPARE, DISPATCH_TRUCK, or VISITOR.", bold_prefix="Step 2 (Classification): ")
    add_bullet(doc, "Input Vehicle Number (e.g. MH-12-AB-1234), Transporter Name, Driver Name, Mobile Number, and Driver License Number.", bold_prefix="Step 3 (Driver & Vehicle): ")
    add_bullet(doc, "Record Purchase Order (PO) Number and Vendor Delivery Challan / Invoice Number.", bold_prefix="Step 4 (Documentation): ")
    add_bullet(doc, "Position truck on the electronic weighbridge scale. The system interfaces with the digital indicator or allows authorized entry of Gross Weight (KG).", bold_prefix="Step 5 (Gross Weighment): ")
    add_bullet(doc, "System generates a unique Gate Inward Slip with QR Code and marks truck status as IN_PREMISES.", bold_prefix="Step 6 (Slip Generation): ")

    add_screenshot(doc, "04_gate_new_entry.png", "Security Gate - New Vehicle Entry & Gross Weighbridge Capture Screen")

    add_header(doc, "2.2 Weighbridge Calculation & Gate Out Protocol", level=2)
    add_p(doc, "After physical unloading is completed by the warehouse storekeeper, the vehicle returns to the weighbridge for empty tare logging:")
    add_callout(doc, "Weighbridge Net Weight Formula", "Delivered Net Material Weight (KG) = Gross Laden Weight (KG) - Tare Empty Weight (KG) - Bag/Pallet Deduction (KG)")
    add_bullet(doc, "Empty vehicle positioned on weighbridge. Operator inputs Tare Weight (KG).", bold_prefix="Step 7 (Tare Weighment): ")
    add_bullet(doc, "Plexi-ERP auto-computes Net Received KG and validates against Challan declared weight. If variance exceeds ±0.5%, a Weighbridge Discrepancy Alert triggers.", bold_prefix="Step 8 (Variance Validation): ")
    add_bullet(doc, "Security inspects empty truck bed, confirms return of Gate Pass, stamps delivery invoice, and marks status as GATE_OUT.", bold_prefix="Step 9 (Gate Out Clearance): ")

    add_screenshot(doc, "03_gate_dashboard.png", "Security Gate Live Dashboard - In-Premises Vehicles, Weighbridge Status, and Activity Feed")

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHAPTER 3: INVENTORY & RAW MATERIAL INWARDING SOP
    # -------------------------------------------------------------
    add_header(doc, "Chapter 3: Inventory & Raw Material Inwarding SOP", level=1)
    add_callout(doc, "Assigned Role", "Inventory Storekeeper (inventory.store@plexierp.com) | Module Access: INVENTORY (Full), SECURITY_GATE (Read/Update)")

    add_p(doc, "The Inventory module converts verified Gate delivery receipts into active warehouse stock balances, manages batch allocation, and controls material issuance to manufacturing departments.")

    add_header(doc, "3.1 Gate Receipt Material Intake", level=2)
    add_p(doc, "When a vehicle is authorized for unloading at the raw material warehouse:")
    add_bullet(doc, "Open /dashboard/inventory/gate-receipts. Locate the pending entry by Truck Number or Gate Pass ID.", bold_prefix="Step 1: ")
    add_bullet(doc, "Perform physical sampling: Inspect bag packaging, check seal integrity, verify grade markings (e.g. Reliance Repol H030SG, IOCL Propel).", bold_prefix="Step 2: ")
    add_bullet(doc, "Click \"Confirm Unloading & Inward\". Select warehouse bin/location (e.g. Silo 1, RM Bay B-4).", bold_prefix="Step 3: ")
    add_bullet(doc, "The system creates an atomic InventoryTransaction of type INWARD, crediting the exact Net KG to the stock balance.", bold_prefix="Step 4: ")

    add_screenshot(doc, "06_inventory_gate_receipts.png", "Inventory Gate Receipts - Unloading Verification & Inward Stock Transition")

    add_header(doc, "3.2 Stock Cataloging & Departmental Issuance", level=2)
    add_p(doc, "All manufacturing materials are maintained with strict reorder levels, safety stock thresholds, and average unit costs:")
    add_bullet(doc, "Raw Polymers: PP Homopolymer Granules (Raffia Grade), LLDPE, LDPE coating grade, RP Recycled Granules.", bold_prefix="Material Classes: ")
    add_bullet(doc, "Additives: Calcium Carbonate (CaCO3) filler masterbatch, UV stabilizer, Optical brightener, Desiccant masterbatch.", bold_prefix="Additives & Pigments: ")
    add_bullet(doc, "Conversion Supplies: Flexographic printing inks (Cyan, Magenta, Yellow, Black, White), Solvents (Ethyl Acetate, IPA), Valve patch film, Stitching thread.", bold_prefix="Chemicals & Consumables: ")

    add_screenshot(doc, "05_inventory_items.png", "Inventory Items Master - Live Warehouse Stock Balances, Reorder Levels, and Valuation")
    add_screenshot(doc, "07_inventory_transactions.png", "Inventory Transactions Audit Ledger - Full History of Receipts, Transfers, and Issuances")

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHAPTER 4: DATA CENTRE MASTER CONFIGURATION SOP
    # -------------------------------------------------------------
    add_header(doc, "Chapter 4: Data Centre Master Configuration SOP", level=1)
    add_callout(doc, "Assigned Role", "Master Data Administrator (datacentre.admin@plexierp.com) | Module Access: DATA_CENTRE (Full)")

    add_p(doc, "The Data Centre serves as the single source of truth for technical manufacturing specifications, formulation recipes, machine-to-quality mappings, and labor rosters across the plant.")

    add_header(doc, "4.1 Key Master Data Configuration Submodules", level=2)
    dc_submodules = [
        ("Tape Plant Recipes", "Defines exact extrusion blend percentages (PP %, CaCO3 %, UV %), target tape width (mm), thickness (micron), and target Denier.", "09_datacentre_tape_recipe.png"),
        ("Circular Loom Mapping", "Maps Looms 1 through 91 to running Quality Code, reed width, mesh (e.g. 10x10, 12x12), target RPM, and pick factor.", "10_datacentre_loom_mapping.png"),
        ("Lamination Raw Materials", "Formulation of LDPE/PP polymer blend ratios for sandwich extrusion coating, standard coating thickness, and melt index.", "11_datacentre_lamination_materials.png"),
        ("Printing Raw Materials", "Standard ink formulations, solvent ratios (Ethyl Acetate : IPA = 80:20), and ink consumption standards per 1,000 meters.", "12_datacentre_printing_materials.png"),
        ("Party Printing Master", "Customer brand designs, cylinder circumference (inches), print repeat length, plate registration, and approved pantone shades.", "13_datacentre_party_printing.png"),
        ("Production Characteristics", "Standard fabric width tolerances, target GSM (Grams per Square Meter), warp/weft tenacity standards, and elongation limits.", "14_datacentre_production_chars.png"),
    ]
    for sub_name, sub_desc, sub_img in dc_submodules:
        add_p(doc, sub_desc, bold_prefix=f"{sub_name}: ")
        add_screenshot(doc, sub_img, f"Data Centre - {sub_name} Configuration Screen")

    add_header(doc, "4.2 Factory Resources & Labor Master", level=2)
    add_p(doc, "Data Centre also configures supporting operational masters including Stock Items (Figure 08), Product Categories (Figure 15), Units of Measurement (Figure 16), Labor Contractors (Figure 17), and Machine Operators (Figure 18).")

    add_screenshot(doc, "08_datacentre_stock.png", "Data Centre - Stock Master Registry")
    add_screenshot(doc, "17_datacentre_contractors.png", "Data Centre - Labor Contractor Registry")
    add_screenshot(doc, "18_datacentre_operators.png", "Data Centre - Skilled Machine Operator Roster")

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHAPTER 5: TAPE PLANT (EXTRUSION & BOBBIN WINDING) SOP
    # -------------------------------------------------------------
    add_header(doc, "Chapter 5: Tape Plant (Extrusion & Bobbin Winding) SOP", level=1)
    add_callout(doc, "Assigned Role", "Tape Plant Supervisor (tapeplant.head@plexierp.com) | Module Access: TAPE_PLANT (Full), PRODUCTION (Full)")

    add_p(doc, "The Tape Plant transforms raw polymer granules into high-tenacity polypropylene tapes (warp and weft yarns) wound onto precision bobbins for circular weaving.")

    add_header(doc, "5.1 Shift Planning & Extrusion Protocol", level=2)
    add_bullet(doc, "Open /dashboard/production/tape-plant. Select active Shift (Day Shift 08:00-20:00 or Night Shift 20:00-08:00).", bold_prefix="Step 1 (Shift Plan): ")
    add_bullet(doc, "Select approved Tape Plant Recipe (e.g. 800 Denier White, 650 Denier Natural). System auto-populates polymer feeder hopper settings.", bold_prefix="Step 2 (Recipe Selection): ")
    add_bullet(doc, "Operators verify extruder temperature profile: Zone 1 (190°C), Zone 2 (215°C), Die (235°C). Water bath quench at 32°C.", bold_prefix="Step 3 (Parameters): ")
    add_bullet(doc, "Film slit into uniform tapes, stretched through godet heating stand at orientation ratio (1:6.2), annealed, and fed to precision winders.", bold_prefix="Step 4 (Stretching & Winding): ")

    add_header(doc, "5.2 Realized Production & Yield Formula", level=2)
    add_callout(doc, "Extrusion Yield & Denier Calculation", 
        "Denier (Linear Density) = [Weight of 9,000 meters of tape in Grams]\n"
        "Realized Shift Yield (%) = [Total Bobbin Production Weight (KG) / Total Extruder Input Material (KG)] * 100\n"
        "Total Waste (%) = [Start-up Lumps (KG) + Edge Trim Scrap (KG)] / Total Input (KG) * 100")

    add_bullet(doc, "At shift conclusion, supervisor enters: Net Bobbins Produced (KG), Defective/Weak Yarn (KG), Start-up Lumps (KG), and Trim Scrap (KG).", bold_prefix="Step 5 (Production Logging): ")
    add_bullet(doc, "Bobbins are transferred to the Loom floor via the Bobbin Stock & Issue Register with an authorized Bobbin Issue Slip.", bold_prefix="Step 6 (Bobbin Issuance): ")

    add_screenshot(doc, "19_tape_plant_main.png", "Tape Plant Production Workspace - Shift Planning, Extrusion Runs, and Bobbin Issuance")

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHAPTER 6: CIRCULAR LOOM DEPARTMENT (LOOMS 1 TO 91) SOP
    # -------------------------------------------------------------
    add_header(doc, "Chapter 6: Circular Loom Department (Looms 1 to 91) SOP", level=1)
    add_callout(doc, "Assigned Role", "Loom & Weaving Supervisor (loom.supervisor@plexierp.com) | Module Access: LOOM (Full), PRODUCTION (Full)")

    add_p(doc, "The Loom department operates 91 high-speed 6-shuttle circular looms weaving continuous tubular PP fabric. This is the largest and most data-intensive department in the factory.")

    add_header(doc, "6.1 Loom Shift Reading Sheet (Looms 1 to 91)", level=2)
    add_p(doc, "Loom operators capture pick counter meter readings across all 91 machines:")
    add_bullet(doc, "Navigate to /dashboard/production/loom?tab=reading-sheet. Select Date and Shift (Day/Night).", bold_prefix="Step 1: ")
    add_bullet(doc, "The 91-machine matrix loads pre-populated with Previous Shift Reading and Assigned Quality Code.", bold_prefix="Step 2: ")
    add_bullet(doc, "Input Current Pick Counter reading for each active loom. The system automatically computes Diff Picks, Production Meters, and Running Efficiency % in real time.", bold_prefix="Step 3: ")
    add_bullet(doc, "Auto-Save ensures zero data loss during shop-floor shifts. Remarks can be logged for stopped machines (Warp break, Motor failure, Beam change).", bold_prefix="Step 4: ")

    add_callout(doc, "Circular Loom Production Formulas",
        "Diff Picks = Current Pick Reading - Previous Pick Reading\n"
        "Produced Fabric Length (Meters) = (Diff Picks * 1,000) / (Picks per Decimeter)\n"
        "Machine Efficiency (%) = [Actual Produced Meters / (Design Max Speed * Running Shift Hours)] * 100")

    add_screenshot(doc, "20_loom_reading_sheet.png", "Loom Reading Sheet - Complete 1-91 Machine Matrix with Real-Time Efficiency Calculation")

    add_header(doc, "6.2 Roll Cutting Register & WIP Identification", level=2)
    add_p(doc, "When woven tubular fabric on a circular loom reaches doff length (2,500 to 5,000 meters):")
    add_bullet(doc, "Open /dashboard/production/loom?tab=roll-cutting. Click \"Record New Roll Cut\".", bold_prefix="Step 5: ")
    add_bullet(doc, "Select Loom Number (1-91). System auto-fetches active quality, reed width, and mesh.", bold_prefix="Step 6: ")
    add_bullet(doc, "Weigh cut roll on floor scale. Input Gross Weight (KG) and Pipe/Core Tare Weight (standard 2.2 KG). System computes Net Weight (KG).", bold_prefix="Step 7: ")
    add_bullet(doc, "Plexi-ERP generates unique Roll Barcode ID (e.g. R-LM-042-261017-01) and adds the roll to the Loom Roll Stock Register.", bold_prefix="Step 8: ")

    add_screenshot(doc, "21_loom_roll_cutting.png", "Loom Roll Cutting Register - Roll ID Generation, Gross/Tare/Net Weighment, and Quality Assignment")
    add_screenshot(doc, "22_loom_roll_stock.png", "Loom Roll Stock Register - Active WIP Rolls Available for Downstream Lamination / Conversion")

    add_header(doc, "6.3 Changeovers & Departmental Summary", level=2)
    add_p(doc, "The Changeover Section (Figure 23) tracks beam changes, quality shifts, and mechanical downtime. The Loom Production Report (Figure 24b) and Overall Loom Summary (Figure 24) aggregate 24-hour meters, total KG, and machine utilization.")

    add_screenshot(doc, "23_loom_changeovers.png", "Loom Quality Changeover Register - Beam Replacements and Downtime Tracking")
    add_screenshot(doc, "24b_loom_production_report.png", "Loom Shift Production Report - Filterable by Date Range, Shift, and Loom Number")
    add_screenshot(doc, "24_loom_summary.png", "Loom Department Executive Summary - Machine-wise and Recipe-wise Aggregated Metrics")

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHAPTER 7: LAMINATION DEPARTMENT SOP
    # -------------------------------------------------------------
    add_header(doc, "Chapter 7: Lamination Department (Sandwich Extrusion Coating) SOP", level=1)
    add_callout(doc, "Assigned Role", "Lamination In-Charge (lamination.head@plexierp.com) | Module Access: LAMINATION (Full), PRODUCTION (Full)")

    add_p(doc, "The Lamination department applies an airtight, pinhole-free molten polymer coating onto circular woven fabric rolls, providing moisture resistance and high tensile barrier strength.")

    add_header(doc, "7.1 Daily Lamination Production Workflow", level=2)
    add_bullet(doc, "Open /dashboard/production/lamination. Click \"Add Lamination Report\".", bold_prefix="Step 1: ")
    add_bullet(doc, "Select Input Loom Roll using the Roll Stock Picker modal. System imports roll net weight, width, and mesh.", bold_prefix="Step 2: ")
    add_bullet(doc, "Set Extruder Parameters: Coating Micron (e.g. 20µm), Corona Treater Power (3.5 kW), Extruder Line Speed (90 m/min).", bold_prefix="Step 3: ")
    add_bullet(doc, "Weigh laminated output roll. System generates new Output Roll ID: R-LAM-[LoomRollID]-[Seq].", bold_prefix="Step 4: ")

    add_callout(doc, "Lamination Coating Weight Formula",
        "Coating Net Weight (KG) = Output Laminated Roll Net Weight (KG) - Input Loom Roll Net Weight (KG)\n"
        "Actual Coating GSM = [Coating Net Weight (KG) * 1,000] / [Total Meters * Width in Meters]\n"
        "Polymer Realization (%) = [Output Net Weight / (Input Roll Net Wt + Extruder Raw Materials Used)] * 100")

    add_screenshot(doc, "25_lamination_daily_report.png", "Lamination Daily Production Report - Input Roll Selection, Micron Setup, and Output Weighment")

    add_header(doc, "7.2 Raw Material Consumption & Trimming Wastage", level=2)
    add_p(doc, "Polymer consumption is tracked at /dashboard/production/lamination/raw-materials (Figure 26). Edge trims, start-up resin lumps, and delamination scrap are recorded in the Wastage Register (Figure 27) and reconciled in the Summary (Figure 28).")

    add_screenshot(doc, "26_lamination_raw_materials.png", "Lamination Raw Materials - Granule Hopper Consumption (PP, LDPE, Masterbatch)")
    add_screenshot(doc, "27_lamination_wastage.png", "Lamination Wastage Register - Edge Trims, Melt Lumps, and Setup Scrap")
    add_screenshot(doc, "28_lamination_summary.png", "Lamination Shift Summary - Total Laminated Meters, Net Weight, and Scrap Percentage")

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHAPTER 8: PRINTING DEPARTMENT SOP
    # -------------------------------------------------------------
    add_header(doc, "Chapter 8: Printing Department (Multi-Color Flexographic) SOP", level=1)
    add_callout(doc, "Assigned Role", "Printing In-Charge (printing.head@plexierp.com) | Module Access: PRINTING (Full), PRODUCTION (Full)")

    add_p(doc, "The Printing department prints customer graphics, brand identity, nutritional/chemical specifications, and barcodes on tubular woven rolls using roll-to-roll flexographic printing presses.")

    add_header(doc, "8.1 Printing Production Workflow", level=2)
    add_bullet(doc, "Open /dashboard/production/printing. Select Shift and Press (e.g. Printing Machine 1).", bold_prefix="Step 1: ")
    add_bullet(doc, "Mount Input Roll (Laminated Roll from Lamination or Plain Loom Roll from Loom Stock).", bold_prefix="Step 2: ")
    add_bullet(doc, "Select Party Printing Design from Data Centre master. System auto-verifies cylinder circumference (inches) and print repeat length.", bold_prefix="Step 3: ")
    add_bullet(doc, "Operator adjusts anilox roller pressure, ink viscosity (22-26 seconds in Zahn Cup #2), and hot-air drying tunnel (65°C).", bold_prefix="Step 4: ")
    add_bullet(doc, "Log completed output printed roll. Unique ID created: R-PRT-[InputRollID].", bold_prefix="Step 5: ")

    add_screenshot(doc, "29_printing_daily_report.png", "Printing Daily Production Report - Roll Mounting, Party Selection, and Meterage Tracking")

    add_header(doc, "8.2 Ink Formulation, Solvents & Wastage", level=2)
    add_p(doc, "Ink consumption is managed at /dashboard/production/printing/raw-materials (Figure 30). Misprints, shade-variation scrap, and core ends are logged in the Printing Wastage Register (Figure 31) and summarized in the Department Summary (Figure 32).")

    add_screenshot(doc, "30_printing_raw_materials.png", "Printing Raw Materials - Multi-Color Ink and Solvent Consumption Tracking")
    add_screenshot(doc, "31_printing_wastage.png", "Printing Wastage Register - Misprints, Core Scrap, and Ink Washing Loss")
    add_screenshot(doc, "32_printing_summary.png", "Printing Department Summary - Machine Utilization, Total Printed Meters, and Yield")

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHAPTER 9: VALVOMATIC DEPARTMENT SOP
    # -------------------------------------------------------------
    add_header(doc, "Chapter 9: Valvomatic Department (Valve Sack Conversion) SOP", level=1)
    add_callout(doc, "Assigned Role", "Valvomatic Operator (valvomatic.operator@plexierp.com) | Module Access: CONVERTEX/VALVOMATIC (Full), PRODUCTION (Full)")

    add_p(doc, "The Valvomatic department converts printed/laminated tubular rolls into high-strength, self-closing valve sacks used for automated packing of cement, minerals, and chemicals.")

    add_header(doc, "9.1 High-Speed Valve Sack Conversion Operations", level=2)
    add_bullet(doc, "Navigate to /dashboard/production/valvomatic. Click \"Record Valvomatic Daily Report\".", bold_prefix="Step 1: ")
    add_bullet(doc, "Mount printed roll onto heavy-duty shaftless unwinder. Thread fabric through tension compensator dancers.", bold_prefix="Step 2: ")
    add_bullet(doc, "Configure cut length (e.g. 840 mm), bottom width (e.g. 110 mm), and valve patch tape feeder.", bold_prefix="Step 3: ")
    add_bullet(doc, "Machine cuts tube, opens bottom, inserts polyethylene valve patch, applies hot-air weld / ultrasonic seal, folds bottom flap, and ejects sacks onto shingled conveyor.", bold_prefix="Step 4: ")
    add_bullet(doc, "Operator enters final sack counter: Total Bags Produced, Running Hours, and Downtime Reason.", bold_prefix="Step 5: ")

    add_callout(doc, "Valvomatic Key Performance Indicators (KPIs)",
        "Bags Per Minute (Speed) = Total Sacks Produced / Net Running Minutes\n"
        "Standard Bags/Hour Performance (%) = [Actual Sacks / (Standard Target Bags/Hour * Running Hours)] * 100\n"
        "Conversion Scrap Rate (%) = [Defective Bags + Trim Scrap (KG)] / Total Fabric Input (KG) * 100")

    add_screenshot(doc, "33_valvomatic_daily_report.png", "Valvomatic Daily Production Report - Valve Sack Output, Target Bags/Hour, and Machine Speed")

    add_header(doc, "9.2 Valve Sack Wastage Register & Shift Summary", level=2)
    add_p(doc, "Wastage in Valvomatic conversion (Figure 34) arises from start-up calibration bags, misaligned valve patches, and jam cuts. All defective sacks are counted, weighed, and summarized in the Valvomatic Summary (Figure 35).")

    add_screenshot(doc, "34_valvomatic_wastage.png", "Valvomatic Wastage Register - Defective Sacks, Valve Patch Offcuts, and Jam Trims")
    add_screenshot(doc, "35_valvomatic_summary.png", "Valvomatic Department Summary - Machine Efficiency, Total Bags Produced, and Rejection %")

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHAPTER 10: CONVERTEX DEPARTMENT SOP
    # -------------------------------------------------------------
    add_header(doc, "Chapter 10: Convertex Department (Tubular Bag Finishing) SOP", level=1)
    add_callout(doc, "Assigned Role", "Convertex Operator (convertex.operator@plexierp.com) | Module Access: CONVERTEX (Full), PRODUCTION (Full)")

    add_p(doc, "The Convertex module operates complementary bag finishing and bottom-pasting lines, handling standard open-mouth bags, bottom-stitched sacks, and customized tubular conversions.")

    add_header(doc, "10.1 Convertex Daily Operations", level=2)
    add_bullet(doc, "Navigate to /dashboard/production/convertex. Select Shift and Conversion Machine ID.", bold_prefix="Step 1: ")
    add_bullet(doc, "Mount inward roll. Set cut length and optical eye mark photocell sensor.", bold_prefix="Step 2: ")
    add_bullet(doc, "Record production counters: Finished Bag Count, Gross KG, and Running Shift Hours.", bold_prefix="Step 3: ")
    add_bullet(doc, "Wastage logged at /dashboard/production/convertex/wastage for edge slips and defective stitches.", bold_prefix="Step 4: ")

    add_screenshot(doc, "36_convertex_daily_report.png", "Convertex Daily Report - Tubular Bag Finishing and Production Log")
    add_screenshot(doc, "37_convertex_wastage.png", "Convertex Wastage Register - Stitching Defects and Cut Trims")
    add_screenshot(doc, "38_convertex_summary.png", "Convertex Summary - Conversion Efficiency and Bag Realization")

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHAPTER 11: QUALITY, RECYCLING & DISPATCH SOP
    # -------------------------------------------------------------
    add_header(doc, "Chapter 11: Quality Assurance, Recycling & Commercial Dispatch SOP", level=1)
    add_callout(doc, "Assigned Roles", 
        "Quality Assurance Lead (quality.qc@plexierp.com) | Module: QUALITY_CONTROL\n"
        "Recycling In-Charge (recycling.head@plexierp.com) | Module: RECYCLING_PLANT\n"
        "Dispatch Officer (dispatch.officer@plexierp.com) | Module: DISPATCH, FINISHED_GOODS")

    add_header(doc, "11.1 Quality Assurance & Non-Conformance Disposition", level=2)
    add_p(doc, "Quality is enforced at every manufacturing phase via formal pass/fail gates:")
    add_bullet(doc, "Warp & Weft Tenacity Testing: Measured in g/denier (Standard ≥ 3.8 g/denier) on tensile strength tester.", bold_prefix="Tape Plant QC: ")
    add_bullet(doc, "Width & Mesh Verification: Fabric width verified against characteristic tolerances (±5mm); mesh counted with optical glass.", bold_prefix="Loom Weaving QC: ")
    add_bullet(doc, "Bonding Adhesion & Pin Hole Test: Peeling force tested; water permeability verified under hydrostatic pressure.", bold_prefix="Lamination QC: ")
    add_bullet(doc, "Ink Rub & Tape Adhesion: Tape snap test (3M 610 tape) to ensure zero ink peeling; color shade verified against pantone card.", bold_prefix="Printing QC: ")
    add_bullet(doc, "Drop & Seam Strength: Sacks filled with 50 KG cement/material dropped from 1.5 meters height (Flat, Side, Bottom). Zero burst permitted.", bold_prefix="Finished Sack QC: ")

    add_header(doc, "11.2 Recycling Plant: Zero-Waste Reprocessing (Closing the Loop)", level=2)
    add_p(doc, "Flexicom Industries enforces a zero-landfill manufacturing policy. All scrap generated across Tape Plant, Looms, Lamination, Printing, and Valvomatic is systematically classified and reprocessed:")
    add_bullet(doc, "Scrap Collections: Color-coded bins placed at every station (White Tape Scrap, Plain Loom Trims, Laminated Offcuts, Printed Waste).", bold_prefix="Step 1: ")
    add_bullet(doc, "Agglomeration & Shredding: High-speed rotary blades shred film and tape into uniform flakes.", bold_prefix="Step 2: ")
    add_bullet(doc, "RP Extrusion: Flakes melted in vacuum degassing extruder, filtered through double hydraulic screen changers, and strand-pelletized into Reprocessed (RP) Granules.", bold_prefix="Step 3: ")
    add_bullet(doc, "Inward to Inventory: Tested RP Granules auto-credited to Inventory and blended back into Tape Plant non-critical recipes at approved percentages (5% - 15%).", bold_prefix="Step 4: ")

    add_header(doc, "11.3 Finished Goods Baling & Dispatch Loading", level=2)
    add_bullet(doc, "Finished valve bags stacked in bundles of 50. Bundles loaded into hydraulic baling press.", bold_prefix="Baling: ")
    add_bullet(doc, "Bale compressed under 20-ton ram pressure, wrapped with protective woven PP sheet, strapped with polyester bands. Bale ID generated (e.g. B-261017-001) containing 500 or 1,000 sacks.", bold_prefix="Bale Labeling: ")
    add_bullet(doc, "Customer Sales Order matched against available warehouse bales in Finished Goods.", bold_prefix="Order Allocation: ")
    add_bullet(doc, "Outbound truck cleared by Security Gate, Gross/Tare weighed, Dispatch Slip signed, and final Gate Out logged.", bold_prefix="Dispatch Loading: ")

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHAPTER 12: SETTINGS, RBAC & TELEMETRY SOP
    # -------------------------------------------------------------
    add_header(doc, "Chapter 12: Settings, Organization Master & RBAC Administration SOP", level=1)
    add_callout(doc, "Assigned Role", "System Super Admin (superadmin@plexierp.com) | Module Access: SETTINGS (Full), USERS (Full)")

    add_p(doc, "Plexi-ERP implements strict multi-role governance with least-privilege security. No user can access or modify manufacturing records outside their assigned operational domain.")

    add_header(doc, "12.1 Role-Based Access Control (RBAC) Matrix", level=2)
    add_p(doc, "Roles are configured at /dashboard/settings/roles (Figure 39). Each role defines granular Create, Read, Update, and Delete (CRUD) permissions across all 16 system modules:")
    add_bullet(doc, "SETTINGS, USERS, SECURITY_GATE, INVENTORY, FINISHED_GOODS, PRODUCTION, TAPE_PLANT, LOOM, LAMINATION, PRINTING, CONVERTEX, QUALITY_CONTROL, RECYCLING_PLANT, MAINTENANCE, DISPATCH, DATA_CENTRE.", bold_prefix="16 Governed Modules: ")

    add_screenshot(doc, "39_settings_roles.png", "Settings - Roles & Module Permission Matrix Configuration")
    add_screenshot(doc, "40_settings_users.png", "Settings - User Administration, Employee Mapping, and Role Assignment")

    add_header(doc, "12.2 Organization Hierarchy & Audit Telemetry", level=2)
    add_p(doc, "Enterprise organizational structure (Departments, Sections, Locations, Machines, Shifts) is maintained in Organization Settings (Figure 41). System telemetry and audit tracking are monitored at /dashboard/settings/logs (Figure 42), with full developer contract visibility in API Docs (Figure 43).")

    add_screenshot(doc, "41_settings_organization.png", "Settings - Enterprise Organization Hierarchy (Departments, Sections, Machines)")
    add_screenshot(doc, "42_settings_audit_logs.png", "Settings - System-wide Audit Trail & Security Event Logs")
    add_screenshot(doc, "43_api_docs.png", "Developer & System Documentation - OpenAPI 3.1 Contract Reference")

    doc.add_page_break()

    # -------------------------------------------------------------
    # CHAPTER 13: MASTER DATABASE USER DIRECTORY & CREDENTIALS
    # -------------------------------------------------------------
    add_header(doc, "Chapter 13: Master Database User Accounts, Credentials & Permissions", level=1)
    add_callout(doc, "Database Synchronization Status", 
        "All 14 factory roles, granular module permissions, and initial user accounts are seeded and active in the live PostgreSQL database.")

    add_p(doc, "The following master table lists all operational factory floor users, their login credentials, assigned roles, and exact module access rights. Use these credentials for plant deployment and shift operations:")

    users_data = [
        ("Super Admin", "superadmin@plexierp.com", "superadmin123", "SPDM-001", "SUPER ADMIN", "ALL (16 Modules)", "Full CRUD on All Modules"),
        ("Ramesh Sharma", "gate.security@plexierp.com", "gate@1234", "SEC-001", "Security & Gate In-Charge", "SECURITY_GATE, SETTINGS", "Create, Read, Update Gate; Read Settings"),
        ("Anil Verma", "inventory.store@plexierp.com", "store@1234", "INV-001", "Inventory Storekeeper", "INVENTORY, SECURITY_GATE", "Full CRUD Inventory; Read/Update Gate"),
        ("Mukesh Yadav", "tapeplant.head@plexierp.com", "tape@1234", "TP-001", "Tape Plant Supervisor", "TAPE_PLANT, PRODUCTION", "Full CRUD Tape & Production; Read Inv/DC"),
        ("Sanjay Singh", "loom.supervisor@plexierp.com", "loom@1234", "LM-001", "Loom & Weaving Supervisor", "LOOM, PRODUCTION", "Full CRUD Loom (1-91) & Prod; Read Tape/DC"),
        ("Rajesh Gupta", "lamination.head@plexierp.com", "lamination@1234", "LAM-001", "Lamination In-Charge", "LAMINATION, PRODUCTION", "Full CRUD Lamination & Prod; Read Loom/DC"),
        ("Sunil Kumar", "printing.head@plexierp.com", "printing@1234", "PRT-001", "Printing In-Charge", "PRINTING, PRODUCTION", "Full CRUD Printing & Prod; Read Lam/Loom/DC"),
        ("Pramod Tiwari", "valvomatic.operator@plexierp.com", "valvo@1234", "VLV-001", "Valvomatic Operator", "CONVERTEX, PRODUCTION", "Full CRUD Valvomatic & Prod; Read DC"),
        ("Deepak Sahu", "convertex.operator@plexierp.com", "convertex@1234", "CNV-001", "Convertex Operator", "CONVERTEX, PRODUCTION", "Full CRUD Convertex & Prod; Read DC"),
        ("Dr. Vikas Sen", "quality.qc@plexierp.com", "quality@1234", "QC-001", "Quality Assurance Lead", "QUALITY_CONTROL, PROD", "Full CRUD Quality; Read All Prod Stages"),
        ("Manoj Rawat", "recycling.head@plexierp.com", "recycle@1234", "RP-001", "Recycling Plant In-Charge", "RECYCLING_PLANT, INVENTORY", "Full CRUD Recycling; Read/Update Inv & DC"),
        ("Amitabh Banerjee", "dispatch.officer@plexierp.com", "dispatch@1234", "DSP-001", "Dispatch & Commercial Officer", "DISPATCH, FINISHED_GOODS", "Full CRUD Dispatch & FG; Read/Update Gate"),
        ("Kishore Nair", "maintenance.eng@plexierp.com", "maint@1234", "MNT-001", "Plant Maintenance Engineer", "MAINTENANCE, DATA_CENTRE", "Full CRUD Maintenance; Read DC"),
        ("Neha Joshi", "datacentre.admin@plexierp.com", "datacentre@1234", "DC-001", "Master Data Administrator", "DATA_CENTRE, SETTINGS", "Full CRUD Data Centre; Read/Update Settings"),
    ]

    cred_table = doc.add_table(rows=1, cols=7)
    style_table(cred_table, [1.0, 1.3, 0.8, 0.6, 1.1, 1.0, 1.0], 
                ["Employee Name", "Login Email", "Password", "Emp ID", "Assigned Role", "Primary Modules", "CRUD Rights"], 
                users_data)

    add_callout(doc, "First-Time Login Security Notice",
        "All factory accounts are initialized with the temporary passwords above. "
        "Upon first sign-in on the terminal, users must update their password under /dashboard/profile. "
        "Passwords are encrypted with bcrypt (salt rounds = 10) in the PostgreSQL database.")

    # Save document
    print(f"Saving final Word document to {OUTPUT_PATH}...")
    doc.save(OUTPUT_PATH)
    print("Document successfully created and saved!")

if __name__ == "__main__":
    build_complete_sop()
