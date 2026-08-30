import { chromium } from 'playwright';
import assert from 'assert';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://127.0.0.1:8000';

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let facultyId = '';
  
  // Helpers
  async function login(role) {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', `${role}@test.com`);
    await page.fill('input[type="password"]', 'Pass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => url.pathname === '/dashboard' || url.pathname.startsWith('/subjects'));
    // Ensure we are on dashboard
    if (page.url().includes('/subjects')) {
      await page.click('text=Home');
      await page.waitForURL(`${BASE_URL}/dashboard`);
    }
    const content = await page.textContent('.user-details');
    if (role === 'faculty') {
      const match = content.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i);
      if (match) facultyId = match[1];
    }
  }

  async function logout() {
    await page.click('button.nav-logout');
    await page.waitForURL(`${BASE_URL}/login`);
  }

  console.log('--- STARTING TESTS ---');

  try {
    // 1. AUTHENTICATION UX
    console.log('Testing Authentication UX...');
    await page.goto(`${BASE_URL}/subjects`);
    await page.waitForURL(`${BASE_URL}/login`);
    
    // Invalid token
    await page.goto(`${BASE_URL}/login`);
    await page.evaluate(() => { localStorage.setItem('token', 'invalid_token'); localStorage.setItem('user', '{}'); });
    await page.goto(`${BASE_URL}/subjects`);
    await page.waitForURL(`${BASE_URL}/login`);
    console.log('Authentication UX PASS');

    // 2. ADMIN UI TEST
    console.log('Testing Admin UI...');
    await login('admin');
    
    // Navigation
    let badge = await page.textContent('.role-badge');
    assert.match(badge, /Admin/i, 'Role badge should say Admin');
    await page.click('text=Subjects');
    await page.waitForURL(`${BASE_URL}/subjects`);
    
    const unique = Date.now();
    // Create Subject
    await page.click('button#create-subject-btn'); // + New Subject
    await page.fill('input#sf-name', `Admin Subject ${unique}`);
    await page.fill('input#sf-code', `ADM${unique}`);
    await page.click('button.sf-btn-save'); // Create Subject
    
    // Wait for optimistc UI
    await page.waitForSelector(`text=Admin Subject ${unique}`);
    
    // Click on Subject
    await page.click(`.sl-card:has-text("Admin Subject ${unique}")`);
    await page.waitForURL(/\/subjects\/.+/);
    
    // Create Unit
    await page.click('button#add-unit-btn');
    await page.fill('input#uf-num', '1');
    await page.fill('input#uf-title', 'Unit 1');
    await page.click('button.uf-btn-save');
    await page.waitForSelector('.unit-title:has-text("Unit 1")');
    
    // Edit Unit
    await page.click('.unit-btn-edit');
    await page.fill('input#uf-title', 'Unit 1 Edited');
    await page.click('button.uf-btn-save');
    await page.waitForSelector('.unit-title:has-text("Unit 1 Edited")');
    
    // Delete Unit
    await page.click('.unit-btn-delete');
    await page.click('.confirm-danger');
    await page.waitForSelector('.unit-title:has-text("Unit 1 Edited")', { state: 'detached' });
    
    // Edit Subject
    await page.click('.sd-back-btn'); // Back to Subjects
    await page.click(`.sl-card:has-text("Admin Subject ${unique}") .sl-btn-edit`);
    await page.fill('input#sf-code', `ADMX${unique}`);
    await page.click('button.sf-btn-save');
    await page.waitForSelector(`.sl-code-pill:has-text("ADMX${unique}")`);
    
    // Create subjects for Faculty test
    await logout();
    await login('faculty'); // Just to extract ID
    await logout();
    await login('admin');
    
    await page.click('text=Subjects');
    // Sub 1: Assigned to faculty
    await page.click('button#create-subject-btn');
    await page.fill('input#sf-name', `Faculty Sub ${unique}`);
    await page.fill('input#sf-code', `FAC${unique}`);
    await page.fill('input#sf-faculty', facultyId);
    await page.click('button.sf-btn-save');
    await page.waitForSelector(`.sl-card:has-text("Faculty Sub ${unique}")`);
    
    // Sub 2: Unassigned
    await page.click('button#create-subject-btn');
    await page.fill('input#sf-name', `Unassigned Sub ${unique}`);
    await page.fill('input#sf-code', `UNA${unique}`);
    await page.click('button.sf-btn-save');
    await page.waitForSelector(`.sl-card:has-text("Unassigned Sub ${unique}")`);

    await logout();
    console.log('Admin UI PASS');

    // 3. FACULTY UI TEST
    console.log('Testing Faculty UI...');
    await login('faculty');
    await page.click('text=Subjects');
    
    // Check no create subject button
    let createBtn = await page.$('button#create-subject-btn');
    assert.strictEqual(createBtn, null, 'Faculty should not see create subject button');
    
    // Check no edit/delete on cards
    let editBtns = await page.$$('.sl-btn-edit');
    assert.strictEqual(editBtns.length, 0, 'Faculty should not see subject edit buttons');
    
    // Test assigned subject
    await page.click(`.sl-card:has-text("Faculty Sub ${unique}")`);
    await page.waitForURL(/\/subjects\/.+/);
    await page.waitForSelector('.sd-subject-name');
    let addUnitBtn = await page.$('button#add-unit-btn');
    assert.notStrictEqual(addUnitBtn, null, 'Faculty should see add unit on assigned subject');
    // Add unit
    await page.click('button#add-unit-btn');
    await page.fill('input#uf-num', '1');
    await page.fill('input#uf-title', 'Fac Unit');
    await page.click('button.uf-btn-save');
    await page.waitForSelector('.unit-title:has-text("Fac Unit")');

    // Test unassigned subject
    await page.click('.sd-back-btn');
    await page.click(`.sl-card:has-text("Unassigned Sub ${unique}")`);
    await page.waitForURL(/\/subjects\/.+/);
    await page.waitForSelector('.sd-subject-name');
    addUnitBtn = await page.$('button#add-unit-btn');
    assert.strictEqual(addUnitBtn, null, 'Faculty should NOT see add unit on unassigned subject');
    
    // DIRECT URL SECURITY (API level)
    // Grab faculty token
    const facToken = await page.evaluate(() => localStorage.getItem('token'));
    // Try to delete Unassigned Sub via API
    const subUrl = page.url();
    const subId = subUrl.split('/').pop();
    const delRes = await fetch(`${API_URL}/api/v1/subjects/${subId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${facToken}` }
    });
    assert.strictEqual(delRes.status, 403, 'Backend should block faculty from deleting unassigned subject');

    await logout();
    console.log('Faculty UI PASS');

    // 4. STUDENT UI TEST
    console.log('Testing Student UI...');
    await login('student');
    await page.click('text=Subjects');
    
    createBtn = await page.$('button#create-subject-btn');
    assert.strictEqual(createBtn, null, 'Student should not see create subject button');
    
    await page.click(`.sl-card:has-text("Faculty Sub ${unique}")`);
    await page.waitForURL(/\/subjects\/.+/);
    await page.waitForSelector('.sd-subject-name');
    
    addUnitBtn = await page.$('button#add-unit-btn');
    assert.strictEqual(addUnitBtn, null, 'Student should not see add unit button');
    
    let unitEditBtns = await page.$$('.unit-btn-edit');
    assert.strictEqual(unitEditBtns.length, 0, 'Student should not see unit edit buttons');
    
    await logout();
    console.log('Student UI PASS');

    // 5. ERROR HANDLING TEST
    console.log('Testing Error Handling...');
    await login('admin');
    await page.goto(`${BASE_URL}/subjects/00000000-0000-0000-0000-000000000000`);
    await page.waitForSelector('.error-message');
    const errMsg = await page.textContent('.error-message-text');
    assert.match(errMsg, /Subject not found/i, 'Should show 404 error message');
    await logout();
    console.log('Error Handling PASS');

    // 6. RESPONSIVE UI TEST
    console.log('Testing Responsive UI...');
    await page.setViewportSize({ width: 375, height: 667 });
    await login('admin');
    await page.click('text=Subjects');
    // Ensure card grid renders
    await page.waitForSelector('.sl-card');
    await logout();
    console.log('Responsive UI PASS');

    // 7. CLEANUP
    console.log('Cleaning up test data...');
    await login('admin');
    await page.click('text=Subjects');
    // Delete Faculty Sub
    await page.click(`.sl-card:has-text("Faculty Sub ${unique}") .sl-btn-delete`);
    await page.click('.confirm-danger');
    await page.waitForSelector(`.sl-card:has-text("Faculty Sub ${unique}")`, { state: 'detached' });
    
    // Delete Unassigned Sub
    await page.click(`.sl-card:has-text("Unassigned Sub ${unique}") .sl-btn-delete`);
    await page.click('.confirm-danger');
    await page.waitForSelector(`.sl-card:has-text("Unassigned Sub ${unique}")`, { state: 'detached' });
    
    // Delete Admin Sub
    await page.click(`.sl-card:has-text("Admin Subject ${unique}") .sl-btn-delete`);
    await page.click('.confirm-danger');
    await page.waitForSelector(`.sl-card:has-text("Admin Subject ${unique}")`, { state: 'detached' });
    
    await logout();
    console.log('Cleanup PASS');

    console.log('ALL TESTS PASSED!');
  } catch (err) {
    console.error('TEST FAILED:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTests();
