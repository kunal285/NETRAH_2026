import fetch from 'node-fetch';

async function runDeviceIntegrationTests() {
  console.log('====================================================');
  console.log('PRAHARI PHYSICAL DEVICE INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  const BASE_URL = 'http://localhost:4000';
  let passed = 0;
  let failed = 0;

  // Helper
  const assert = (testName, condition, details = '') => {
    if (condition) {
      console.log(`✓ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`✗ [FAIL] ${testName} - ${details}`);
      failed++;
    }
  };

  try {
    // 1. Test Backend Health
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const health = await healthRes.json();
    assert('1. Backend Server is Running', healthRes.status === 200 && health.service.includes('PRAHARI'));

    // 2. Test Physical Device Heartbeat (PRAHARI-01)
    const hbPayload = {
      robotId: 'PRAHARI-01',
      uptime: 120,
      wifiRSSI: -45,
      firmwareVersion: 'v2.4.0-ESP32-PROD',
      controlMode: 'WEB',
    };
    const hbRes = await fetch(`${BASE_URL}/api/device/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(hbPayload),
    });
    const hbData = await hbRes.json();
    assert('2. Ingest Physical ESP32 Heartbeat', hbRes.status === 200 && hbData.status === 'ONLINE');

    // 3. Test Full Physical Telemetry Ingestion (PRAHARI-01)
    const telemPayload = {
      robotId: 'PRAHARI-01',
      batteryVoltage: 38.2,
      batteryPercentage: 94,
      batteryCurrent: 1.45,
      leftMotorCurrent: 0.62,
      rightMotorCurrent: 0.65,
      leftMotorPWM: 160,
      rightMotorPWM: 160,
      obstacleDistance: 2.45,
      rearDistance: 4.10,
      temperature: 29.2,
      wifiRSSI: -48,
      controlMode: 'WEB',
      emergencyStop: false,
    };
    const telemRes = await fetch(`${BASE_URL}/api/device/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telemPayload),
    });
    const telemData = await telemRes.json();
    assert('3. Ingest Full Live Telemetry Packet', telemRes.status === 200 && telemData.success === true);

    // 4. Test GPS Ingestion
    const gpsPayload = {
      robotId: 'PRAHARI-01',
      latitude: 18.52043,
      longitude: 73.85674,
      speed: 12.5,
      accuracy: 1.2,
      satellites: 9,
    };
    const gpsRes = await fetch(`${BASE_URL}/api/device/gps`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gpsPayload),
    });
    const gpsData = await gpsRes.json();
    assert('4. Ingest GPS Hardware Coordinates', gpsRes.status === 200 && gpsData.gps.available === true && gpsData.gps.satellites === 9);

    // 5. Test IMU 6-DOF Ingestion
    const imuPayload = {
      robotId: 'PRAHARI-01',
      accel: { x: 0.02, y: -0.01, z: 9.81 },
      gyro: { x: 0.05, y: 0.02, z: -0.01 },
    };
    const imuRes = await fetch(`${BASE_URL}/api/device/imu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(imuPayload),
    });
    const imuData = await imuRes.json();
    assert('5. Ingest 6-DOF IMU Motion Vectors', imuRes.status === 200 && imuData.imu.available === true && imuData.imu.accel.z === 9.81);

    // 6. Test Multi-Device Registry & Status Retrieval
    const devListRes = await fetch(`${BASE_URL}/api/devices/all`);
    const devListData = await devListRes.json();
    assert('6. Multi-Device Discovery & Registry', devListRes.status === 200 && devListData.devices.length >= 1 && devListData.devices.some((d) => d.robotId === 'PRAHARI-01' && d.status === 'ONLINE'));

    // 7. Test Specific Device Detail Endpoint
    const devDetailRes = await fetch(`${BASE_URL}/api/devices/PRAHARI-01`);
    const devDetail = await devDetailRes.json();
    assert('7. Get Live State for Selected Robot (PRAHARI-01)', devDetailRes.status === 200 && devDetail.robot.battery.voltage === 38.2 && devDetail.robot.motors.left.pwm === 160);

    // 8. Test Invalid Payload Protection (Reject negative battery voltage)
    const invalidTelem = {
      robotId: 'PRAHARI-01',
      batteryVoltage: -12.5, // IMPOSSIBLE NEGATIVE VOLTAGE
    };
    const invRes = await fetch(`${BASE_URL}/api/device/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invalidTelem),
    });
    assert('8. Invalid Data Protection (Reject Negative Voltage)', invRes.status === 400);

    // 9. Test Command Dispatch & Physical Device Ack
    const cmdRes = await fetch(`${BASE_URL}/api/robot/control`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: 'FORWARD', speed: 60, robotId: 'PRAHARI-01' }),
    });
    const cmdData = await cmdRes.json();
    assert('9. Dispatch Control Command with CommandId', cmdRes.status === 200 && cmdData.commandId != null);

    // Simulate ESP32 sending Ack for that command
    const ackRes = await fetch(`${BASE_URL}/api/device/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        robotId: 'PRAHARI-01',
        commandId: cmdData.commandId,
        status: 'SUCCESS',
        command: 'FORWARD',
      }),
    });
    const ackData = await ackRes.json();
    assert('10. Physical Device Acknowledges Command', ackRes.status === 200 && ackData.status === 'SUCCESS');

    // 11. Test Live Data Debug Monitor Stats
    const debugRes = await fetch(`${BASE_URL}/api/device/debug/stats`);
    const debugData = await debugRes.json();
    assert('11. Developer Live Data Monitor Diagnostic Stats', debugRes.status === 200 && debugData.stats.packetsReceived > 0);

  } catch (err) {
    console.error('Fatal test error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');
  process.exit(failed > 0 ? 1 : 0);
}

runDeviceIntegrationTests();
