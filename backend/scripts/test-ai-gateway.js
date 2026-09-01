/**
 * PRAHARI Backend — AI Gateway & Gemini Service Integration Test
 */

import { geminiService } from '../services/geminiService.js';

async function runTests() {
  console.log('==================================================');
  console.log('  PRAHARI BACKEND AI GATEWAY TEST SUITE           ');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  // 1. Health check test
  try {
    console.log('[TEST 1] Testing Gemini Gateway Health...');
    const health = await geminiService.getHealth();
    console.log('  Health Result:', JSON.stringify(health));
    if (health.service && (health.service.toLowerCase().includes('prahari') || health.service === 'prahari-ai')) {
      console.log('  ✅ PASSED: Health structure verified\n');
      passed++;
    } else {
      console.log('  ❌ FAILED: Unexpected health payload\n');
      failed++;
    }
  } catch (err) {
    console.log('  ❌ FAILED:', err.message, '\n');
    failed++;
  }

  // 2. Fallback / Active Incident Analysis test
  try {
    console.log('[TEST 2] Testing Incident Analysis...');
    const result = await geminiService.analyzeEvent({
      event_id: 'test_node_01',
      event_type: 'ambulance_detected',
      ambulance_detected: true,
      ambulance_confidence: 0.95,
      vehicle_counts: { cars: 4, motorcycles: 2 },
      robot: { battery_voltage: 34.8, obstacle_distance_cm: 85 },
    });
    console.log('  Incident Result:', JSON.stringify(result));
    if (result.severity === 'high' && result.event_type === 'ambulance_detected') {
      console.log('  ✅ PASSED: Ambulance incident severity and structure verified\n');
      passed++;
    } else {
      console.log('  ❌ FAILED: Unexpected incident response\n');
      failed++;
    }
  } catch (err) {
    console.log('  ❌ FAILED:', err.message, '\n');
    failed++;
  }

  // 3. Chat Assistant test
  try {
    console.log('[TEST 3] Testing AI Chat Assistant...');
    const chatRes = await geminiService.chat(
      'Was an ambulance detected?',
      [],
      {
        active_ambulance: true,
        vehicle_counts: { total: 6 },
        telemetry: { batteryVoltage: 34.8 },
      }
    );
    console.log('  Chat Result:', JSON.stringify(chatRes));
    if (chatRes.reply && Array.isArray(chatRes.suggested_actions)) {
      console.log('  ✅ PASSED: Chat reply and suggested actions verified\n');
      passed++;
    } else {
      console.log('  ❌ FAILED: Unexpected chat response\n');
      failed++;
    }
  } catch (err) {
    console.log('  ❌ FAILED:', err.message, '\n');
    failed++;
  }

  // 4. Telemetry Diagnostics test
  try {
    console.log('[TEST 4] Testing Robot Status Telemetry Diagnostics...');
    const telRes = await geminiService.analyzeRobotStatus({
      battery_voltage: 29.8,
      motor_current_left: 28.0,
      motor_current_right: 6.0,
      obstacle_distance_cm: 32.0,
    });
    console.log('  Telemetry Result:', JSON.stringify(telRes));
    if (telRes.health_rating && telRes.warnings) {
      console.log('  ✅ PASSED: Hardware warnings and rating verified\n');
      passed++;
    } else {
      console.log('  ❌ FAILED: Unexpected telemetry result\n');
      failed++;
    }
  } catch (err) {
    console.log('  ❌ FAILED:', err.message, '\n');
    failed++;
  }

  // 5. Detection Explanation test
  try {
    console.log('[TEST 5] Testing Detection Explanation...');
    const explRes = await geminiService.explainDetection({
      id: 'det_mh12',
      type: 'ANPR',
      detectionInfo: 'MH12AB1234',
      confidence: 0.94,
    });
    console.log('  Explanation Result:', JSON.stringify(explRes));
    if (explRes.explanation && explRes.confidence_assessment) {
      console.log('  ✅ PASSED: Detection explanation verified\n');
      passed++;
    } else {
      console.log('  ❌ FAILED: Unexpected explanation response\n');
      failed++;
    }
  } catch (err) {
    console.log('  ❌ FAILED:', err.message, '\n');
    failed++;
  }

  console.log('==================================================');
  console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
