import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';

// Output directories
const EVIDENCE_DIR = path.resolve('docs/tests/evidence');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

class HumanTester {
  constructor(page) {
    this.page = page;
    this.cursorX = 100;
    this.cursorY = 100;
    this.defects = [];
    this.consoleLogs = [];
    this.pageErrors = [];
    this.failedRequests = [];
  }

  async setup() {
    this.page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      this.consoleLogs.push({ type, text, url: this.page.url() });
      if (type === 'error' && !text.includes('favicon.ico')) {
        console.log(`  [BROWSER ERROR] ${text.slice(0, 150)}`);
      }
    });

    this.page.on('pageerror', err => {
      this.pageErrors.push({ message: err.message, stack: err.stack, url: this.page.url() });
      console.log(`  [PAGE EXCEPTION] ${err.message}`);
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

    await this.injectCursor();
  }

  async injectCursor() {
    await this.page.evaluate(() => {
      if (document.getElementById('human-cursor-overlay')) return;

      const style = document.createElement('style');
      style.id = 'human-cursor-style';
      style.textContent = `
        #human-cursor-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 24px;
          height: 24px;
          border: 2px solid #ef4444;
          background: rgba(239, 68, 68, 0.4);
          border-radius: 50%;
          pointer-events: none;
          z-index: 2147483647;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 12px rgba(239, 68, 68, 0.8), 0 0 2px white;
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
        }
        .human-click-ripple {
          position: fixed;
          border: 2px solid #3b82f6;
          background: rgba(59, 130, 246, 0.3);
          border-radius: 50%;
          pointer-events: none;
          z-index: 2147483646;
          animation: humanRippleAnim 0.45s ease-out forwards;
        }
        @keyframes humanRippleAnim {
          0% { width: 10px; height: 10px; transform: translate(-50%, -50%) scale(0.8); opacity: 1; }
          100% { width: 45px; height: 45px; transform: translate(-50%, -50%) scale(2.2); opacity: 0; }
        }
      `;
      document.head.appendChild(style);

      const cursor = document.createElement('div');
      cursor.id = 'human-cursor-overlay';
      const dot = document.createElement('div');
      dot.id = 'human-cursor-dot';
      cursor.appendChild(dot);
      document.body.appendChild(cursor);
    });
  }

  async sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
  }

  async moveSmooth(targetX, targetY, steps = 18) {
    const startX = this.cursorX;
    const startY = this.cursorY;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      // Smooth easeInOutQuad
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
      await this.sleep(15);
    }
  }

  async clickAt(x, y) {
    await this.moveSmooth(x, y);
    // Show click animation
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
      if (!box) return false;

      const targetX = Math.round(box.x + box.width / 2);
      const targetY = Math.round(box.y + box.height / 2);
      await this.clickAt(targetX, targetY);
      return true;
    } catch (e) {
      return false;
    }
  }

  async hoverElement(selector) {
    try {
      const el = await this.page.$(selector);
      if (!el) return false;
      const box = await el.boundingBox();
      if (!box) return false;

      const targetX = Math.round(box.x + box.width / 2);
      const targetY = Math.round(box.y + box.height / 2);
      await this.moveSmooth(targetX, targetY);
      await this.sleep(200);
      return true;
    } catch (e) {
      return false;
    }
  }

  async typeInto(selector, text, clearFirst = true) {
    await this.clickElement(selector);
    if (clearFirst) {
      await this.page.keyboard.down('Control');
      await this.page.keyboard.press('KeyA');
      await this.page.keyboard.up('Control');
      await this.page.keyboard.press('Backspace');
      await this.sleep(100);
    }
    for (const char of text) {
      await this.page.keyboard.type(char, { delay: Math.floor(Math.random() * 40) + 20 });
    }
    await this.sleep(150);
  }

  async runLayoutAndDesignInspection(contextName) {
    const flaws = await this.page.evaluate((ctx) => {
      const findings = [];

      // 1. Check Horizontal Overflow (Causes awkward horizontal scrollbars)
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;
      if (docWidth > winWidth + 2) {
        findings.push({
          type: 'DESIGN_OVERFLOW',
          message: `Horizontal page overflow detected in ${ctx}: scrollWidth (${docWidth}px) > viewport (${winWidth}px) by ${docWidth - winWidth}px. Causes unwanted horizontal scrollbar.`
        });
      }

      // 2. Check Broken Images
      const images = Array.from(document.querySelectorAll('img'));
      for (const img of images) {
        if (img.complete && img.naturalWidth === 0 && img.src && !img.src.startsWith('data:image/svg')) {
          findings.push({
            type: 'BROKEN_IMAGE',
            message: `Broken image detected in ${ctx}: src="${img.src}". Alt text: "${img.alt}".`
          });
        }
      }

      // 3. Check for overlapping elements or unclickable dropdown menus
      const popovers = Array.from(document.querySelectorAll('[data-radix-popper-content-wrapper], [role="menu"], [role="listbox"], [role="dialog"]'));
      for (const p of popovers) {
        const rect = p.getBoundingClientRect();
        if (rect.right > window.innerWidth || rect.bottom > window.innerHeight) {
          findings.push({
            type: 'DROPDOWN_VIEWPORT_OVERFLOW',
            message: `Dropdown/Popover popped out of visible screen bounds: right=${rect.right}px (max ${window.innerWidth}px), bottom=${rect.bottom}px (max ${window.innerHeight}px).`
          });
        }
      }

      // 4. Check for unlabelled buttons or icon-only buttons with 0 dimensions
      const buttons = Array.from(document.querySelectorAll('button'));
      for (const btn of buttons) {
        const rect = btn.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue; // hidden
        const text = btn.innerText.trim();
        const ariaLabel = btn.getAttribute('aria-label');
        const hasSvg = btn.querySelector('svg') !== null;
        if (!text && !ariaLabel && !hasSvg) {
          findings.push({
            type: 'DESIGN_EMPTY_BUTTON',
            message: `Empty unlabelled button found without text, SVG icon, or aria-label.`
          });
        }
      }

      return findings;
    }, contextName);

    return flaws;
  }

  async captureScreenshot(filename) {
    const filePath = path.join(EVIDENCE_DIR, filename);
    await this.page.screenshot({ path: filePath, fullPage: false });
    console.log(`  📸 Screenshot saved: ${filename}`);
    return filePath;
  }
}

async function runManualTesting() {
  console.log('🚀 Starting Human-Like Manual Testing of Plexi-ERP...');
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1460,940', '--start-maximized']
  });

  const page = await browser.newPage();
  const tester = new HumanTester(page);
  await tester.setup();

  const defectsFound = [];
  let defectCounter = 18; // Continue from BUG-018

  function logDefect(title, moduleName, subModule, severity, priority, reproSteps, screenshotName) {
    const defectId = `BUG-${String(defectCounter++).padStart(3, '0')}`;
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
    defectsFound.push(defect);
    console.log(`\n❌ [DEFECT FOUND] ${defectId} [${severity}]: ${title}`);
    return defect;
  }

  try {
    // -------------------------------------------------------------
    // SECTION 1: AUTHENTICATION & LOGIN PAGE
    // -------------------------------------------------------------
    console.log('\n--- 1. Testing Auth & Login Page ---');
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle2' });
    await tester.injectCursor();
    await tester.sleep(800);

    let flaws = await tester.runLayoutAndDesignInspection('Login Page');
    for (const f of flaws) {
      console.log(`  ⚠️ Layout check: ${f.message}`);
    }

    // Inspect logo
    const brokenLogo = await page.evaluate(() => {
      const img = document.querySelector('img[alt="Flexicom Logo"]');
      return img ? (img.naturalWidth === 0) : true;
    });
    if (brokenLogo) {
      await tester.captureScreenshot('evidence_BUG-018_broken_login_logo.png');
      logDefect(
        'Login screen enterprise branding logo fails to load (404/broken image)',
        'Authentication',
        'Login Page (/auth/login)',
        'Medium',
        'P2',
        '1. Navigate to http://localhost:3000/auth/login.\n2. Observe company logo in left brand panel and top mobile header.\nResult: Broken image indicator / 404 on /logo.png.',
        'evidence_BUG-018_broken_login_logo.png'
      );
    }

    // Test invalid credentials validation
    console.log('  Testing invalid credentials login attempt...');
    await tester.typeInto('input#email', 'wrong@flexicom.com');
    await tester.typeInto('input#password', 'wrongpass');
    await tester.clickElement('button[type="submit"]');
    await tester.sleep(1200);

    // Test valid credentials login
    console.log('  Logging in as superadmin@plexierp.com...');
    await tester.typeInto('input#email', 'superadmin@plexierp.com');
    await tester.typeInto('input#password', 'superadmin123');
    await tester.captureScreenshot('test_auth_form_filled.png');
    await tester.clickElement('button[type="submit"]');

    // Wait for redirect to dashboard
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
    } catch (e) {
      // Turbopack may take longer
      await tester.sleep(3000);
    }
    console.log('  Current URL after login:', page.url());

    // -------------------------------------------------------------
    // SECTION 2: MAIN DASHBOARD & NAVIGATION
    // -------------------------------------------------------------
    console.log('\n--- 2. Testing Main Dashboard Navigation & Shell ---');
    await tester.injectCursor();
    await tester.sleep(1000);
    flaws = await tester.runLayoutAndDesignInspection('Main Dashboard');
    for (const f of flaws) {
      console.log(`  ⚠️ Layout check: ${f.message}`);
      if (f.type === 'DESIGN_OVERFLOW') {
        const sc = await tester.captureScreenshot('evidence_BUG-dashboard_overflow.png');
        logDefect(
          'Main dashboard has horizontal overflow causing horizontal scrollbar',
          'Dashboard Layout',
          'Dashboard Shell',
          'Low',
          'P3',
          '1. Log into Dashboard at 1440px viewport.\n2. Observe bottom horizontal scrollbar due to root container exceeding viewport width.',
          'evidence_BUG-dashboard_overflow.png'
        );
      }
    }

    // Test User Profile Dropdown in Topbar / Sidebar
    console.log('  Testing topbar user profile dropdown & theme toggle...');
    const userMenuButton = await page.$('button[aria-haspopup="menu"], [data-testid="user-menu"], header button:has(svg), .rounded-full');
    if (userMenuButton) {
      await tester.hoverElement('header');
      await tester.sleep(500);
    }

    // -------------------------------------------------------------
    // SECTION 3: HR & ATTENDANCE MODULE (/dashboard/hr)
    // -------------------------------------------------------------
    console.log('\n--- 3. Testing HR & Attendance Module (/dashboard/hr) ---');
    await page.goto('http://localhost:3000/dashboard/hr', { waitUntil: 'networkidle2' });
    await tester.injectCursor();
    await tester.sleep(1000);

    const hrFlaws = await tester.runLayoutAndDesignInspection('HR Module');
    for (const f of hrFlaws) console.log(`  ⚠️ HR check: ${f.message}`);

    // Check tabs in HR module
    const hrTabs = await page.$$eval('[role="tab"], button:has-text("Attendance"), button:has-text("Employees"), button:has-text("Shifts"), button:has-text("Biometric")', els => els.map(e => e.innerText));
    console.log('  Found HR Tabs:', hrTabs);

    // Click through each tab and look for errors
    const tabButtons = await page.$$('[role="tab"]');
    for (let i = 0; i < tabButtons.length; i++) {
      const tab = tabButtons[i];
      const tabName = await page.evaluate(el => el.innerText.trim(), tab);
      console.log(`  Clicking HR Tab: "${tabName}"`);
      const box = await tab.boundingBox();
      if (box) {
        await tester.clickAt(box.x + box.width / 2, box.y + box.height / 2);
        await tester.sleep(600);
      }
    }

    // Test HR Dropdown Filters (e.g. Shift / Department / Status dropdowns)
    console.log('  Testing HR Dropdowns and Select Triggers...');
    const selectTriggers = await page.$$('[role="combobox"], [data-radix-collection-item], select, button:has([class*="lucide-chevron"])');
    console.log(`  Found ${selectTriggers.length} potential dropdowns/select triggers in HR`);

    for (let i = 0; i < Math.min(selectTriggers.length, 5); i++) {
      const trigger = selectTriggers[i];
      const box = await trigger.boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        console.log(`  Opening dropdown trigger #${i + 1}...`);
        await tester.clickAt(box.x + box.width / 2, box.y + box.height / 2);
        await tester.sleep(500);

        // Check if popup/menu is visible and within bounds
        const popoverBounds = await page.evaluate(() => {
          const menu = document.querySelector('[role="listbox"], [role="menu"], [data-radix-popper-content-wrapper]');
          if (!menu) return null;
          const rect = menu.getBoundingClientRect();
          const items = Array.from(menu.querySelectorAll('[role="option"], [role="menuitem"]')).map(it => it.innerText.trim());
          return {
            visible: rect.width > 0 && rect.height > 0,
            rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right },
            itemCount: items.length,
            items: items.slice(0, 5),
            windowHeight: window.innerHeight,
            windowWidth: window.innerWidth
          };
        });

        if (popoverBounds) {
          console.log(`    Dropdown popped up! Items count: ${popoverBounds.itemCount}, Preview: ${popoverBounds.items.join(', ')}`);
          if (popoverBounds.rect.bottom > popoverBounds.windowHeight) {
            const sc = await tester.captureScreenshot(`evidence_BUG_hr_dropdown_${i}_clipped.png`);
            logDefect(
              `HR Dropdown menu bottom overflows viewport (${popoverBounds.rect.bottom}px > ${popoverBounds.windowHeight}px)`,
              'HR & Attendance',
              'Dropdown Menus',
              'Medium',
              'P2',
              `1. Navigate to /dashboard/hr.\n2. Click dropdown #${i + 1}.\nResult: Options clip outside the bottom viewport boundary.`,
              sc
            );
          }
        } else {
          console.log(`    ⚠️ Clicking trigger did not open a visible radix listbox/menu.`);
        }

        // Close dropdown
        await page.keyboard.press('Escape');
        await tester.sleep(200);
      }
    }

    await tester.captureScreenshot('evidence_hr_module_overview.png');

    // -------------------------------------------------------------
    // SECTION 4: SECURITY GATE MANAGEMENT (/dashboard/gate & /gate/new)
    // -------------------------------------------------------------
    console.log('\n--- 4. Testing Security Gate Management ---');
    await page.goto('http://localhost:3000/dashboard/gate', { waitUntil: 'networkidle2' });
    await tester.injectCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_gate_overview.png');

    // Test Gate New Form
    console.log('  Navigating to /dashboard/gate/new...');
    await page.goto('http://localhost:3000/dashboard/gate/new', { waitUntil: 'networkidle2' });
    await tester.injectCursor();
    await tester.sleep(1000);

    const gateFlaws = await tester.runLayoutAndDesignInspection('Gate New Entry');
    for (const f of gateFlaws) console.log(`  ⚠️ Gate New check: ${f.message}`);

    // Inspect dropdowns on /dashboard/gate/new
    console.log('  Inspecting dropdowns on Gate New page...');
    const gateSelects = await page.$$('button[role="combobox"], select');
    console.log(`  Found ${gateSelects.length} select dropdowns on Gate New`);

    for (let i = 0; i < gateSelects.length; i++) {
      const sel = gateSelects[i];
      const box = await sel.boundingBox();
      if (box) {
        await tester.clickAt(box.x + box.width / 2, box.y + box.height / 2);
        await tester.sleep(400);
        const optionsCount = await page.evaluate(() => {
          return document.querySelectorAll('[role="option"]').length;
        });
        console.log(`    Dropdown #${i + 1} opened with ${optionsCount} options.`);
        if (optionsCount === 0) {
          const sc = await tester.captureScreenshot(`evidence_BUG_gate_dropdown_${i}_empty.png`);
          logDefect(
            `Gate New form dropdown #${i + 1} has zero selectable options`,
            'Security Gate',
            'Truck Inward Entry (/dashboard/gate/new)',
            'High',
            'P1',
            `1. Open /dashboard/gate/new.\n2. Click dropdown #${i + 1}.\nResult: Empty listbox with 0 selectable options.`,
            `evidence_BUG_gate_dropdown_${i}_empty.png`
          );
        }
        await page.keyboard.press('Escape');
        await tester.sleep(200);
      }
    }

    // -------------------------------------------------------------
    // SECTION 5: INVENTORY & STORES MODULE
    // -------------------------------------------------------------
    console.log('\n--- 5. Testing Inventory & Stores Module ---');
    await page.goto('http://localhost:3000/dashboard/inventory', { waitUntil: 'networkidle2' });
    await tester.injectCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_inventory_overview.png');

    // Test Inventory Items
    console.log('  Navigating to /dashboard/inventory/items...');
    await page.goto('http://localhost:3000/dashboard/inventory/items', { waitUntil: 'networkidle2' });
    await tester.injectCursor();
    await tester.sleep(1000);

    // Look for "Add Item" button
    const addItemBtn = await page.$('button:has-text("Add Item"), button:has-text("New Item"), button:has-text("Create Item")');
    if (addItemBtn) {
      console.log('  Found Add Item button, clicking...');
      const box = await addItemBtn.boundingBox();
      if (box) {
        await tester.clickAt(box.x + box.width / 2, box.y + box.height / 2);
        await tester.sleep(600);

        // Inspect modal dialog
        const modalInfo = await page.evaluate(() => {
          const dialog = document.querySelector('[role="dialog"]');
          if (!dialog) return null;
          const inputs = Array.from(dialog.querySelectorAll('input, select, textarea, button[role="combobox"]'));
          const title = dialog.querySelector('h2, [class*="title"]')?.innerText;
          return {
            hasDialog: true,
            title,
            inputCount: inputs.length,
            inputNames: inputs.map(el => el.getAttribute('name') || el.id || el.tagName)
          };
        });

        if (modalInfo) {
          console.log(`    Add Item Dialog opened: Title="${modalInfo.title}", Inputs=${modalInfo.inputCount}`);
          await tester.captureScreenshot('evidence_inventory_add_item_dialog.png');
        }
        await page.keyboard.press('Escape');
        await tester.sleep(300);
      }
    }

    // Test Gate Receipts
    console.log('  Navigating to /dashboard/inventory/gate-receipts...');
    await page.goto('http://localhost:3000/dashboard/inventory/gate-receipts', { waitUntil: 'networkidle2' });
    await tester.injectCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_inventory_gate_receipts.png');

    // Test Transactions
    console.log('  Navigating to /dashboard/inventory/transactions...');
    await page.goto('http://localhost:3000/dashboard/inventory/transactions', { waitUntil: 'networkidle2' });
    await tester.injectCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_inventory_transactions.png');

    // -------------------------------------------------------------
    // SECTION 6: PRODUCTION MODULES
    // -------------------------------------------------------------
    console.log('\n--- 6. Testing Production: Circular Looms (/dashboard/production/loom) ---');
    await page.goto('http://localhost:3000/dashboard/production/loom', { waitUntil: 'networkidle2' });
    await tester.injectCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_production_loom.png');

    console.log('\n--- 7. Testing Production: Lamination (/dashboard/production/lamination) ---');
    await page.goto('http://localhost:3000/dashboard/production/lamination', { waitUntil: 'networkidle2' });
    await tester.injectCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_production_lamination.png');

    console.log('\n--- 8. Testing Production: Printing (/dashboard/production/printing) ---');
    await page.goto('http://localhost:3000/dashboard/production/printing', { waitUntil: 'networkidle2' });
    await tester.injectCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_production_printing.png');

    console.log('\n--- 9. Testing Production: Convertex & Valvomatic ---');
    await page.goto('http://localhost:3000/dashboard/production/convertex', { waitUntil: 'networkidle2' });
    await tester.injectCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_production_convertex.png');

    await page.goto('http://localhost:3000/dashboard/production/valvomatic', { waitUntil: 'networkidle2' });
    await tester.injectCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_production_valvomatic.png');

    // -------------------------------------------------------------
    // SECTION 10: SETTINGS MODULE (/dashboard/settings)
    // -------------------------------------------------------------
    console.log('\n--- 10. Testing Settings Module ---');
    await page.goto('http://localhost:3000/dashboard/settings/organization', { waitUntil: 'networkidle2' });
    await tester.injectCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_settings_organization.png');

    await page.goto('http://localhost:3000/dashboard/settings/users', { waitUntil: 'networkidle2' });
    await tester.injectCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_settings_users.png');

    await page.goto('http://localhost:3000/dashboard/settings/roles', { waitUntil: 'networkidle2' });
    await tester.injectCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_settings_roles.png');

    await page.goto('http://localhost:3000/dashboard/settings/logs', { waitUntil: 'networkidle2' });
    await tester.injectCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_settings_logs.png');

    // -------------------------------------------------------------
    // SECTION 11: DATA CENTRE MASTER DATA
    // -------------------------------------------------------------
    console.log('\n--- 11. Testing Data Centre Master Data ---');
    await page.goto('http://localhost:3000/dashboard/data-centre', { waitUntil: 'networkidle2' });
    await tester.injectCursor();
    await tester.sleep(1000);
    await tester.captureScreenshot('evidence_data_centre.png');

    console.log('\n✅ Testing suite execution finished!');
    console.log(`Total defects logged: ${defectsFound.length}`);
    console.log(`Browser console errors captured: ${tester.consoleLogs.filter(l => l.type === 'error').length}`);
    console.log(`Page exceptions: ${tester.pageErrors.length}`);
    console.log(`Failed network requests: ${tester.failedRequests.length}`);

    // Write defects JSON to scratch for artifact generation
    fs.writeFileSync(
      'scripts/test_defects_output.json',
      JSON.stringify({
        defects: defectsFound,
        consoleErrors: tester.consoleLogs.filter(l => l.type === 'error'),
        pageErrors: tester.pageErrors,
        failedRequests: tester.failedRequests
      }, null, 2)
    );

  } catch (err) {
    console.error('Test run encountered error:', err);
  } finally {
    console.log('Leaving browser open for user or closing after 5s...');
    await tester.sleep(5000);
    await browser.close();
  }
}

runManualTesting();
