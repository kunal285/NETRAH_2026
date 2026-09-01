/**
 * PRAHARI V3 — Master Snapshot, ANPR & Camera Flow Integration Test
 */

import { cameraSnapshotService } from '../services/cameraSnapshotService.js';
import { s3Service } from '../services/s3Service.js';

async function runMasterTests() {
  console.log('==============================================================');
  console.log('  PRAHARI MASTER SNAPSHOT, CAMERA & S3 VERIFICATION SUITE      ');
  console.log('==============================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. Test Camera Snapshot Capture
  try {
    console.log('[TEST 1] Testing Real Camera Snapshot Capture & Formatting...');
    const result = await cameraSnapshotService.captureSnapshot({
      robotId: 'PRAHARI-01',
      source: 'TEST_SUITE',
    });

    console.log('  Snapshot Result:', JSON.stringify({
      snapshotId: result.snapshotId,
      filename: result.filename,
      url: result.url,
      size: result.size,
      width: result.width,
      height: result.height,
    }));

    if (result.snapshotId && result.filename && result.filename.startsWith('prahari_') && result.size > 0) {
      console.log('  ✅ PASSED: Snapshot captured with standard filename and buffer\n');
      passed++;
    } else {
      console.log('  ❌ FAILED: Unexpected snapshot format\n');
      failed++;
    }
  } catch (err) {
    console.log('  ❌ FAILED:', err.message, '\n');
    failed++;
  }

  // 2. Test S3 Key Generation & URL Resolution
  try {
    console.log('[TEST 2] Testing S3 Key Generation & Resolution...');
    const key = s3Service.generateSnapshotKey('snap_test_123', 'PRAHARI-01');
    console.log('  Generated Key:', key);
    if (key.includes('prahari/snapshots/') && key.endsWith('snap_test_123.jpg')) {
      console.log('  ✅ PASSED: S3 Key hierarchy verified\n');
      passed++;
    } else {
      console.log('  ❌ FAILED: Invalid S3 key structure\n');
      failed++;
    }
  } catch (err) {
    console.log('  ❌ FAILED:', err.message, '\n');
    failed++;
  }

  // 3. Test Snapshot History Retrieval
  try {
    console.log('[TEST 3] Testing Snapshot History Retrieval...');
    const list = await cameraSnapshotService.getSnapshots({ limit: 5 });
    console.log(`  Snapshots in store: ${list.length}`);
    if (list.length >= 1) {
      console.log('  ✅ PASSED: Snapshot history query functional\n');
      passed++;
    } else {
      console.log('  ❌ FAILED: Empty snapshot history\n');
      failed++;
    }
  } catch (err) {
    console.log('  ❌ FAILED:', err.message, '\n');
    failed++;
  }

  console.log('==============================================================');
  console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('==============================================================\n');

  if (failed > 0) process.exit(1);
}

runMasterTests();
