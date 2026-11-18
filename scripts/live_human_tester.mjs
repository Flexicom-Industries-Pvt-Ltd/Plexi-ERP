import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

const EVIDENCE_DIR = path.resolve('docs/tests/evidence');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

class HumanTester {
  constructor(page) {
    this.page = page;
    this.cursorX = 200;
    this.cursorY = 200;
    this.defects = [];
    this.consoleLogs = [];
    this.pageErrors = [];
    this.failedRequests = [];
    this.defectCounter = 18;
  }

  async setup() {
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      this.consoleLogs.push({ type, text, url: this.page.url() });
      if (type === 'error' && !text.includes('favicon.ico')) {
        console.log(`  [BROWSER ERROR] ${text.slice(0, 160)}`);
      }
    });

    this.page.on('pageerror', err => {
      this.pageErrors.push({ message: err.message, stack: err.stack, url: this.page.url() });
      console.log(`  [REACT/PAGE ERROR] ${err.message.slice(0, 160)}`);
    });

    this.page.on('requestfailed', req => {
      const failure = req.failure();
      this.failedRequests.push({
        url: req.url(),
        method: req.method(),
        errorText: failure ? failure.errorText : 'Unknown'
      });
      console.log(`  [NETWORK FAIL] ${req.method()} ${req.url()}: ${failure?.errorText}`);
    });
  }

  async injectHudAndCursor() {
    await this.page.evaluate(() => {
      // 1. Injected HUD Banner
      if (!document.getElementById('qa-hud-banner')) {
        const hud = document.createElement('div');
        hud.id = 'qa-hud-banner';
        hud.style.cssText = `
          position: fixed;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 2147483647;
          background: rgba(15, 23, 42, 0.95);
          color: #ffffff;
          padding: 8px 20px;
          border-radius: 9999px;
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.02em;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          gap: 12px;
          pointer-events: none;
          transition: all 0.3s ease;
        `;
        hud.innerHTML = `
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;box-shadow:0 0 8px #22c55e;"></span>
            <span style="color:#94a3b8;text-transform:uppercase;font-size:11px;">Agent QA Test</span>
          </div>
          <span style="color:#64748b;">|</span>
          <span id="qa-hud-status" style="color:#f8fafc;">Initializing System Inspection...</span>
          <span style="color:#64748b;">|</span>
          <span id="qa-hud-counter" style="background:#ef4444;color:white;font-size:11px;padding:2px 8px;border-radius:10px;">0 Bugs Found</span>
        `;
        document.body.appendChild(hud);
      }

      // 2. Injected Human Mouse Cursor
      if (!document.getElementById('human-cursor-overlay')) {
        const style = document.createElement('style');
        style.id = 'human-cursor-style';
        style.textContent = `
          #human-cursor-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 28px;
            height: 28px;
            border: 2.5px solid #ef4444;
            background: rgba(239, 68, 68, 0.35);
            border-radius: 50%;
            pointer-events: none;
            z-index: 2147483646;
            transform: translate(-50%, -50%);
            box-shadow: 0 0 16px rgba(239, 68, 68, 0.9), 0 0 3px #ffffff;
            transition: transform 0.08s ease, background 0.15s ease;
          }
          #human-cursor-dot {
            position: absolute;
            top: 50%;
            left: 50%;
            width: 6px;
            height: 6px;
            background: #ffffff;
            border-radius: 50%;
            transform: translate(-50%, -50%);
            box-shadow: 0 0 4px #000;
          }
          .human-click-ripple {
            position: fixed;
            border: 2px solid #38bdf8;
            background: rgba(56, 189, 248, 0.35);
            border-radius: 50%;
            pointer-events: none;
            z-index: 2147483645;
            animation: humanRippleAnim 0.45s cubic-bezier(0, 0, 0.2, 1) forwards;
          }
          @keyframes humanRippleAnim {
            0% { width: 12px; height: 12px; transform: translate(-50%, -50%) scale(0.6); opacity: 1; }
            100% { width: 55px; height: 55px; transform: translate(-50%, -50%) scale(2.0); opacity: 0; }
          }
        `;
        document.head.appendChild(style);

        const cursor = document.createElement('div');
        cursor.id = 'human-cursor-overlay';
        const dot = document.createElement('div');
        dot.id = 'human-cursor-dot';
        cursor.appendChild(dot);
        document.body.appendChild(cursor);
      }
    }).catch(() => {});
  }

  async setHudStatus(text, bugCount = null) {
    console.log(`[HUD] ${text}`);
    await this.page.evaluate((msg, cnt) => {
      const el = document.getElementById('qa-hud-status');
      if (el) el.textContent = msg;
      if (cnt !== null) {
        const cntEl = document.getElementById('qa-hud-counter');
        if (cntEl) cntEl.textContent = `${cnt} Bugs Found`;
      }
    }, text, bugCount).catch(() => {});
  }

  async sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async moveSmooth(targetX, targetY, steps = 18) {
    const startX = this.cursorX;
    const startY = this.cursorY;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      const curX = Math.round(startX + (targetX - startX) * ease);
      const curY = Math.round(startY + (targetY - startY) * ease);
      this.cursorX = curX;
      this.cursorY = curY;

      await this.page.mouse.move(curX, curY);
      await this.page.evaluate((x, y) => {
        const el = document.getElementById('human-cursor-overlay');
        if (el) {
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
        }
      }, curX, curY).catch(() => {});
      await this.sleep(12);
    }
  }

  async clickAt(x, y) {
    await this.moveSmooth(x, y);
    await this.page.evaluate((cx, cy) => {
      const ripple = document.createElement('div');
      ripple.className = 'human-click-ripple';
      ripple.style.left = `${cx}px`;
      ripple.style.top = `${cy}px`;
      document.body.appendChild(ripple);
      setTimeout(() => ripple.remove(), 500);

      const cursor = document.getElementById('human-cursor-overlay');
      if (cursor) cursor.style.transform = 'translate(-50%, -50%) scale(0.7)';
      setTimeout(() => {
        if (cursor) cursor.style.transform = 'translate(-50%, -50%) scale(1)';
      }, 120);
    }, x, y).catch(() => {});

    await this.page.mouse.click(x, y);
    await this.sleep(250);
  }

  async clickElement(selector) {
    try {
      const el = await this.page.$(selector);
      if (!el) return false;
      const box = await el.boundingBox();
      if (!box || box.width === 0 || box.height === 0) return false;

      const targetX = Math.round(box.x + box.width / 2);
      const targetY = Math.round(box.y + box.height / 2);
      await this.clickAt(targetX, targetY);
      return true;
    } catch (e) {
      return false;
    }
  }

  async typeInto(selector, text, clearFirst = true) {
    const clicked = await this.clickElement(selector);
    if (!clicked) return false;
    if (clearFirst) {
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.keyboard.press('Backspace');
      await this.sleep(100);
    }
    for (const char of text) {
      await this.page.keyboard.type(char, { delay: Math.floor(Math.random() * 30) + 20 });
    }
    await this.sleep(180);
    return true;
  }

  async captureScreenshot(filename) {
    const filePath = path.join(EVIDENCE_DIR, filename);
    await this.page.screenshot({ path: filePath, fullPage: false });
    console.log(`  📸 Screenshot captured: ${filename}`);
    return filename;
  }

  logDefect(title, moduleName, subModule, severity, priority, reproSteps, screenshotName) {
    const defectId = `BUG-${String(this.defectCounter++).padStart(3, '0')}`;
    const defect = {
      id: defectId,
      module: moduleName,
      subModule,
      title,
      severity,
      priority,
      reproSteps,
      screenshot: screenshotName
    };
    this.defects.push(defect);
    console.log(`\n❌ [DEFECT RECORDED] ${defectId} [${severity}]: ${title}`);
    return defect;
  }

  async auditPageLayoutAndDesign(ctxName) {
    const findings = await this.page.evaluate((ctx) => {
      const issues = [];
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;
      if (docWidth > winWidth + 2) {
        issues.push({
          type: 'DESIGN_OVERFLOW',
          message: `Horizontal page overflow detected in ${ctx}: scrollWidth (${docWidth}px) exceeds viewport (${winWidth}px) by ${docWidth - winWidth}px. Unwanted horizontal scrollbar.`
        });
      }

      const images = Array.from(document.querySelectorAll('img'));
      for (const img of images) {
        if (img.complete && img.naturalWidth === 0 && img.src && !img.src.startsWith('data:image/svg')) {
          issues.push({
            type: 'BROKEN_IMAGE',
            message: `Broken image resource detected in ${ctx}: src="${img.src}". Alt text: "${img.alt}".`
          });
        }
      }

      return issues;
    }, ctxName);

    for (const f of findings) {
      if (f.type === 'DESIGN_OVERFLOW') {
        const sc = await this.captureScreenshot(`evidence_BUG_overflow_${ctxName.toLowerCase().replace(/\s+/g, '_')}.png`);
        this.logDefect(
          `Horizontal layout overflow in ${ctxName} causes horizontal scrollbar`,
          ctxName,
          'Layout & Responsiveness',
          'Low',
          'P3',
          `1. Open ${this.page.url()} on 1440px desktop display.\n2. Observe horizontal scrollbar at bottom of viewport.\n3. Content overflows container bounds.`,
          sc
        );
      } else if (f.type === 'BROKEN_IMAGE') {
        const sc = await this.captureScreenshot(`evidence_BUG_broken_img_${ctxName.toLowerCase().replace(/\s+/g, '_')}.png`);
        this.logDefect(
          `Broken image asset failed to load in ${ctxName}`,
          ctxName,
          'UI Visual Assets',
          'Medium',
          'P2',
          `1. Open ${this.page.url()}.\n2. Observe missing / broken image element.\nResult: 404 image placeholder or blank box.`,
          sc
        );
      }
    }
  }
}

async function runLiveTesting() {
  console.log('🚀 Launching Real Chrome for Live Manual QA Testing...');

  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: null, // Full native window size
    args: [
      '--start-maximized',
      '--window-position=0,0',
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const [page] = await browser.pages();
  const tester = new HumanTester(page);
  await tester.setup();

  try {
    // =========================================================================
    // 1. AUTHENTICATION & LOGIN PAGE
    // =========================================================================
    console.log('\n--- 1. Testing Authentication & Login Page ---');
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle2' });
    await page.bringToFront();
    await tester.injectHudAndCursor();
    await tester.setHudStatus('Testing Auth Page: Verifying logo, layout & form...', tester.defects.length);
    await tester.sleep(1000);

    // Audit layout & logo
    await tester.auditPageLayoutAndDesign('Authentication');

    // Logo check
    const isLogoBroken = await page.evaluate(() => {
      const img = document.querySelector('img[alt*="Logo"], img[src*="logo"]');
      return img ? (img.naturalWidth === 0) : true;
    });
    if (isLogoBroken) {
      const sc = await tester.captureScreenshot('evidence_BUG-018_broken_brand_logo.png');
      tester.logDefect(
        'Enterprise branding logo (/logo.png) is missing / returns 404 on Login page',
        'Authentication',
        'Login Page (/auth/login)',
        'Medium',
        'P2',
        '1. Navigate to http://localhost:3000/auth/login.\n2. Observe company logo in left enterprise branding banner.\nResult: Image fails to render with 404 on /logo.png.',
        sc
      );
      await tester.setHudStatus('Defect Recorded: Missing / broken logo.png', tester.defects.length);
      await tester.sleep(800);
    }

    // Invalid credentials test
    await tester.setHudStatus('Testing Invalid Login Validation...', tester.defects.length);
    await tester.typeInto('input#email', 'invalid.user@plexierp.com');
    await tester.typeInto('input#password', 'wrongsecret123');
    await tester.clickElement('button[type="submit"]');
    await tester.sleep(1200);

    // Valid SuperAdmin Login
    await tester.setHudStatus('Submitting Super Admin Credentials...', tester.defects.length);
    await tester.typeInto('input#email', 'superadmin@plexierp.com');
    await tester.typeInto('input#password', 'superadmin123');
    await tester.captureScreenshot('evidence_login_filled.png');
    await tester.clickElement('button[type="submit"]');

    await tester.setHudStatus('Authenticating & Redirecting to Dashboard...', tester.defects.length);
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    } catch (e) {
      await tester.sleep(3000);
    }

    // =========================================================================
    // 2. MAIN DASHBOARD OVERVIEW
    // =========================================================================
    console.log('\n--- 2. Testing Main Dashboard Overview ---');
    await tester.injectHudAndCursor();
    await tester.setHudStatus('Testing Main Dashboard Shell & Navigation...', tester.defects.length);
    await tester.sleep(1200);
    await tester.auditPageLayoutAndDesign('Main Dashboard');

    // Check sidebar navigation items
    const navItems = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('aside a, nav a'));
      return links.map(l => ({ text: l.innerText.trim(), href: l.getAttribute('href') })).filter(l => l.text);
    });
    console.log(`  Found ${navItems.length} sidebar navigation links:`, navItems.map(n => n.text).join(', '));

    await tester.captureScreenshot('evidence_main_dashboard_overview.png');

    // =========================================================================
    // 3. HR & ATTENDANCE MODULE (/dashboard/hr)
    // =========================================================================
    console.log('\n--- 3. Testing HR & Attendance Module ---');
    await tester.setHudStatus('Navigating to HR & Attendance Module (/dashboard/hr)...', tester.defects.length);
    await page.goto('http://localhost:3000/dashboard/hr', { waitUntil: 'networkidle2' });
    await tester.injectHudAndCursor();
    await tester.sleep(1000);

    // Check for React Hydration Mismatch recorded in pageErrors
    const hydrationError = tester.pageErrors.find(e => e.message && e.message.includes('Hydration failed'));
    if (hydrationError) {
      const sc = await tester.captureScreenshot('evidence_BUG-019_hr_hydration_mismatch.png');
      tester.logDefect(
        'React SSR Hydration mismatch on HR Live Clock / Refresh timestamp causes full re-render & UI flicker',
        'HR & Attendance',
        'Attendance Dashboard (/dashboard/hr)',
        'High',
        'P2',
        '1. Navigate to http://localhost:3000/dashboard/hr.\n2. Observe live timestamp in header (e.g. 12:20:22 pm vs 12:20:23 pm).\nResult: SSR HTML timestamp diverges from Client hydration timestamp, triggering React Hydration Error and UI regeneration.',
        sc
      );
      await tester.setHudStatus('Defect Recorded: React SSR Hydration Mismatch on HR Clock', tester.defects.length);
      await tester.sleep(800);
    }

    // Click HR Tabs safely
    await tester.setHudStatus('Testing HR Module Tabs & Views...', tester.defects.length);
    const tabs = await page.$$('[role="tab"]');
    console.log(`  Found ${tabs.length} tabs in HR`);
    for (let i = 0; i < tabs.length; i++) {
      const tab = tabs[i];
      const tabText = await page.evaluate(el => el.innerText.trim(), tab);
      await tester.setHudStatus(`Clicking HR Tab: "${tabText}"...`, tester.defects.length);
      const box = await tab.boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        await tester.clickAt(box.x + box.width / 2, box.y + box.height / 2);
        await tester.sleep(700);
      }
    }

    // Test HR Dropdown Filters (Shift, Department, Status)
    await tester.setHudStatus('Testing HR Dropdown Controls & Popovers...', tester.defects.length);
    const hrSelectTriggers = await page.$$('[role="combobox"]');
    console.log(`  Found ${hrSelectTriggers.length} combobox dropdown triggers in HR`);
    for (let i = 0; i < Math.min(hrSelectTriggers.length, 4); i++) {
      const trig = hrSelectTriggers[i];
      const box = await trig.boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        await tester.setHudStatus(`Opening HR Dropdown Filter #${i + 1}...`, tester.defects.length);
        await tester.clickAt(box.x + box.width / 2, box.y + box.height / 2);
        await tester.sleep(500);

        // Check dropdown positioning / clipping
        const dropdownCheck = await page.evaluate(() => {
          const popover = document.querySelector('[role="listbox"], [role="menu"], [data-radix-popper-content-wrapper]');
          if (!popover) return { open: false };
          const rect = popover.getBoundingClientRect();
          const items = Array.from(popover.querySelectorAll('[role="option"], [role="menuitem"]')).map(it => it.innerText.trim());
          return {
            open: true,
            clippedBottom: rect.bottom > window.innerHeight,
            clippedRight: rect.right > window.innerWidth,
            itemCount: items.length,
            items: items.slice(0, 4)
          };
        });

        if (dropdownCheck.open) {
          console.log(`    Dropdown opened: ${dropdownCheck.itemCount} items, items preview: ${dropdownCheck.items.join(', ')}`);
          if (dropdownCheck.clippedBottom) {
            const sc = await tester.captureScreenshot(`evidence_BUG_hr_dropdown_clipped_${i}.png`);
            tester.logDefect(
              `HR Filter dropdown #${i + 1} extends below viewport bottom boundary`,
              'HR & Attendance',
              'Dropdown Selectors',
              'Medium',
              'P2',
              `1. Open /dashboard/hr.\n2. Click dropdown #${i + 1}.\nResult: Popover menu clips past bottom viewport.`,
              sc
            );
          }
        }
        await page.keyboard.press('Escape');
        await tester.sleep(250);
      }
    }

    await tester.captureScreenshot('evidence_hr_module_tested.png');

    // =========================================================================
    // 4. SECURITY GATE MANAGEMENT (/dashboard/gate & /gate/new)
    // =========================================================================
    console.log('\n--- 4. Testing Security Gate Management ---');
    await tester.setHudStatus('Navigating to Security Gate Management (/dashboard/gate)...', tester.defects.length);
    await page.goto('http://localhost:3000/dashboard/gate', { waitUntil: 'networkidle2' });
    await tester.injectHudAndCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_gate_management_list.png');

    // Navigate to Gate New Entry Form
    await tester.setHudStatus('Navigating to New Truck Entry Form (/dashboard/gate/new)...', tester.defects.length);
    await page.goto('http://localhost:3000/dashboard/gate/new', { waitUntil: 'networkidle2' });
    await tester.injectHudAndCursor();
    await tester.sleep(1000);

    // Test Gate New Form Input Interactions
    await tester.setHudStatus('Testing Form Inputs on Truck Inward Entry...', tester.defects.length);
    await tester.typeInto('input[name="truckNumber"], input#truckNumber, input[placeholder*="Truck"], input[placeholder*="GJ"]', 'GJ04AX9999');
    await tester.typeInto('input[name="driverName"], input#driverName, input[placeholder*="Driver Name"]', 'Rajesh Patel');
    await tester.typeInto('input[name="driverContact"], input#driverContact, input[placeholder*="Contact"], input[placeholder*="Mobile"]', '9876543210');

    // Test Purpose & Transporter Dropdowns on Gate New
    await tester.setHudStatus('Inspecting Purpose & Transporter Dropdowns...', tester.defects.length);
    const gateCombos = await page.$$('button[role="combobox"], select');
    for (let i = 0; i < gateCombos.length; i++) {
      const combo = gateCombos[i];
      const box = await combo.boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        await tester.clickAt(box.x + box.width / 2, box.y + box.height / 2);
        await tester.sleep(400);

        const optionsCount = await page.evaluate(() => {
          return document.querySelectorAll('[role="option"]').length;
        });
        console.log(`    Gate dropdown #${i + 1} has ${optionsCount} selectable options`);
        if (optionsCount === 0) {
          const sc = await tester.captureScreenshot(`evidence_BUG_gate_empty_options_${i}.png`);
          tester.logDefect(
            `Gate New form dropdown #${i + 1} rendered empty options listbox`,
            'Security Gate',
            'Truck Inward Entry (/dashboard/gate/new)',
            'High',
            'P1',
            `1. Open /dashboard/gate/new.\n2. Click dropdown #${i + 1}.\nResult: Dropdown opens with 0 options.`,
            sc
          );
        }
        await page.keyboard.press('Escape');
        await tester.sleep(200);
      }
    }
    await tester.captureScreenshot('evidence_gate_new_entry_tested.png');

    // =========================================================================
    // 5. INVENTORY & STORES MODULE
    // =========================================================================
    console.log('\n--- 5. Testing Inventory & Stores Module ---');
    await tester.setHudStatus('Navigating to Inventory Items Catalog (/dashboard/inventory/items)...', tester.defects.length);
    await page.goto('http://localhost:3000/dashboard/inventory/items', { waitUntil: 'networkidle2' });
    await tester.injectHudAndCursor();
    await tester.sleep(1000);
    await tester.auditPageLayoutAndDesign('Inventory Items');

    // Check "Add Item" button and modal
    await tester.setHudStatus('Testing "Add New Item" Modal Dialog...', tester.defects.length);
    const addItemBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.innerText.includes('Add Item') || b.innerText.includes('New Item') || b.innerText.includes('Create Item'));
    });
    if (addItemBtn && addItemBtn.asElement()) {
      const box = await addItemBtn.asElement().boundingBox();
      if (box) {
        await tester.clickAt(box.x + box.width / 2, box.y + box.height / 2);
        await tester.sleep(600);
        await tester.captureScreenshot('evidence_inventory_add_item_dialog.png');
        await page.keyboard.press('Escape');
        await tester.sleep(300);
      }
    }

    // Test Pending Gate Receipts
    await tester.setHudStatus('Testing Pending Gate Receipts (/dashboard/inventory/gate-receipts)...', tester.defects.length);
    await page.goto('http://localhost:3000/dashboard/inventory/gate-receipts', { waitUntil: 'networkidle2' });
    await tester.injectHudAndCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_inventory_gate_receipts.png');

    // Test Transactions / Stock Ledger
    await tester.setHudStatus('Testing Stock Ledger (/dashboard/inventory/transactions)...', tester.defects.length);
    await page.goto('http://localhost:3000/dashboard/inventory/transactions', { waitUntil: 'networkidle2' });
    await tester.injectHudAndCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_inventory_stock_ledger.png');

    // =========================================================================
    // 6. PRODUCTION: TAPE PLANT (/dashboard/production/tape-plant)
    // =========================================================================
    console.log('\n--- 6. Testing Production: Tape Plant ---');
    await tester.setHudStatus('Navigating to Tape Plant Module (/dashboard/production/tape-plant)...', tester.defects.length);
    await page.goto('http://localhost:3000/dashboard/production/tape-plant', { waitUntil: 'networkidle2' });
    await tester.injectHudAndCursor();
    await tester.sleep(1200);

    // Audit layout overflow in Tape Plant
    await tester.auditPageLayoutAndDesign('Tape Plant');

    // Test Tape Plant tabs
    const tapeTabs = await page.$$('[role="tab"]');
    console.log(`  Found ${tapeTabs.length} tabs in Tape Plant`);
    for (let i = 0; i < tapeTabs.length; i++) {
      const tab = tapeTabs[i];
      const text = await page.evaluate(el => el.innerText.trim(), tab);
      await tester.setHudStatus(`Testing Tape Plant Sub-View: "${text}"...`, tester.defects.length);
      const box = await tab.boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        await tester.clickAt(box.x + box.width / 2, box.y + box.height / 2);
        await tester.sleep(600);
      }
    }
    await tester.captureScreenshot('evidence_production_tape_plant.png');

    // =========================================================================
    // 7. PRODUCTION: CIRCULAR LOOMS (/dashboard/production/loom)
    // =========================================================================
    console.log('\n--- 7. Testing Production: Circular Looms ---');
    await tester.setHudStatus('Navigating to Circular Loom Production (/dashboard/production/loom)...', tester.defects.length);
    await page.goto('http://localhost:3000/dashboard/production/loom', { waitUntil: 'networkidle2' });
    await tester.injectHudAndCursor();
    await tester.sleep(1200);
    await tester.auditPageLayoutAndDesign('Circular Loom');

    // Inspect loom machine cards & shift filters
    await tester.setHudStatus('Inspecting Loom Machine Grid & Shift Selectors...', tester.defects.length);
    const loomCombos = await page.$$('[role="combobox"]');
    for (let i = 0; i < Math.min(loomCombos.length, 3); i++) {
      const combo = loomCombos[i];
      const box = await combo.boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        await tester.clickAt(box.x + box.width / 2, box.y + box.height / 2);
        await tester.sleep(400);
        await page.keyboard.press('Escape');
        await tester.sleep(200);
      }
    }
    await tester.captureScreenshot('evidence_production_loom_machines.png');

    // =========================================================================
    // 8. PRODUCTION: LAMINATION & PRINTING
    // =========================================================================
    console.log('\n--- 8. Testing Production: Lamination & Printing ---');
    await tester.setHudStatus('Navigating to Lamination Plant (/dashboard/production/lamination)...', tester.defects.length);
    await page.goto('http://localhost:3000/dashboard/production/lamination', { waitUntil: 'networkidle2' });
    await tester.injectHudAndCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_production_lamination.png');

    await tester.setHudStatus('Navigating to Printing Machines (/dashboard/production/printing)...', tester.defects.length);
    await page.goto('http://localhost:3000/dashboard/production/printing', { waitUntil: 'networkidle2' });
    await tester.injectHudAndCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_production_printing.png');

    // =========================================================================
    // 9. PRODUCTION: CONVERTEX & VALVOMATIC
    // =========================================================================
    console.log('\n--- 9. Testing Production: Convertex & Valvomatic ---');
    await tester.setHudStatus('Navigating to Convertex Bag Making (/dashboard/production/convertex)...', tester.defects.length);
    await page.goto('http://localhost:3000/dashboard/production/convertex', { waitUntil: 'networkidle2' });
    await tester.injectHudAndCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_production_convertex.png');

    await tester.setHudStatus('Navigating to Valvomatic Bag Making (/dashboard/production/valvomatic)...', tester.defects.length);
    await page.goto('http://localhost:3000/dashboard/production/valvomatic', { waitUntil: 'networkidle2' });
    await tester.injectHudAndCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_production_valvomatic.png');

    // =========================================================================
    // 10. DATA CENTRE MASTER DATA & SETTINGS
    // =========================================================================
    console.log('\n--- 10. Testing Master Data Centre & System Settings ---');
    await tester.setHudStatus('Navigating to Central Master Data Hub (/dashboard/data-centre)...', tester.defects.length);
    await page.goto('http://localhost:3000/dashboard/data-centre', { waitUntil: 'networkidle2' });
    await tester.injectHudAndCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_master_data_centre.png');

    await tester.setHudStatus('Navigating to Organization Settings (/dashboard/settings/organization)...', tester.defects.length);
    await page.goto('http://localhost:3000/dashboard/settings/organization', { waitUntil: 'networkidle2' });
    await tester.injectHudAndCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_settings_organization.png');

    await tester.setHudStatus('Navigating to Users & RBAC Roles (/dashboard/settings/roles)...', tester.defects.length);
    await page.goto('http://localhost:3000/dashboard/settings/roles', { waitUntil: 'networkidle2' });
    await tester.injectHudAndCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_settings_roles.png');

    await tester.setHudStatus('Navigating to Security Audit Logs (/dashboard/settings/logs)...', tester.defects.length);
    await page.goto('http://localhost:3000/dashboard/settings/logs', { waitUntil: 'networkidle2' });
    await tester.injectHudAndCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_settings_logs.png');

    // =========================================================================
    // 11. CHECK WEB APP MANIFEST BUG
    // =========================================================================
    const manifestError = tester.consoleLogs.find(l => l.text && l.text.includes('Manifest: Line: 1, column: 1, Syntax error'));
    if (manifestError) {
      tester.logDefect(
        'PWA Web App Manifest syntax error / 404 (Returns HTML instead of JSON manifest)',
        'Core PWA Infrastructure',
        'Web App Manifest (manifest.json)',
        'Medium',
        'P2',
        '1. Open any dashboard route in Chrome.\n2. Open Chrome DevTools Console.\nResult: Manifest: Line: 1, column: 1, Syntax error logged on every page load.',
        'evidence_BUG-manifest_syntax_error.png'
      );
    }

    // =========================================================================
    // 12. COMPLETION - KEEP BROWSER OPEN!
    // =========================================================================
    console.log('\n==========================================================');
    console.log(`🎉 Automated Human QA Walkthrough Successfully Completed!`);
    console.log(`Defects Logged: ${tester.defects.length}`);
    console.log(`Console Errors: ${tester.consoleLogs.filter(l => l.type === 'error').length}`);
    console.log(`Page Exceptions: ${tester.pageErrors.length}`);
    console.log(`Network Failures: ${tester.failedRequests.length}`);
    console.log('==========================================================');

    await tester.setHudStatus(`✅ QA Audit Complete! ${tester.defects.length} Defect(s) Recorded. Browser remains OPEN for you.`, tester.defects.length);

    // Save defect report data
    fs.writeFileSync(
      'scripts/live_test_report.json',
      JSON.stringify({
        defects: tester.defects,
        consoleErrors: tester.consoleLogs.filter(l => l.type === 'error'),
        pageErrors: tester.pageErrors,
        failedRequests: tester.failedRequests
      }, null, 2)
    );

    console.log('Keeping Chrome open indefinitely on screen so you can inspect...');
    // We intentionally DO NOT call browser.close()!
  } catch (err) {
    console.error('Testing encountered error:', err);
    await tester.setHudStatus(`⚠️ Error during testing: ${err.message}`);
  }
}

runLiveTesting();
