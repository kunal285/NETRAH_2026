import { EventEmitter } from 'events';

/**
 * MockRobotAdapter
 * Realistic simulator for PRAHARI Traffic-Police Robot:
 * - 4-Wheel Differential Skid-Steer Drive
 * - Dual MY1016 350W 36V DC Motors via Dual BTS7960 H-Bridges
 * - Dual 36V 13Ah Li-ion Battery Packs in Parallel (26Ah Nominal)
 * - LM2596 DC-DC Step-Down Regulator for 5.0V Logic Rail
 * - HC-SR04 Ultrasonic Radar Front Rangefinder
 * - ACS712-30A Hall Effect Current Sensors
 */
export class MockRobotAdapter extends EventEmitter {
  constructor() {
    super();

    // Default robot state
    this.state = {
      status: 'ONLINE',
      mode: 'WEB',
      demoMode: false,
      movement: 'STOPPED',
      speed: 50,
      leftMotor: {
        speed: 0,
        current: 0.0,
        voltage: 36.0,
        temp: 32.0,
        status: 'NORMAL',
      },
      rightMotor: {
        speed: 0,
        current: 0.0,
        voltage: 36.0,
        temp: 32.0,
        status: 'NORMAL',
      },
      battery: {
        voltage: 37.8, // Nominal full charge for 36V pack
        current: 0.8, // Quiescent idle current
        percentage: 92,
        temperature: 28.5,
        status: 'NORMAL',
      },
      ultrasonic: {
        distance: 2.85, // Front obstacle distance in meters
        status: 'CLEAR',
      },
      safety: {
        emergencyStop: false,
        obstacleInterlock: false,
        overcurrentInterlock: false,
        undervoltageInterlock: false,
        state: 'SAFE',
        message: 'System nominal. Safety interlocks armed.',
      },
      uptimeSeconds: 0,
    };

    // Configuration / Safety Limits
    this.config = {
      defaultSpeed: 50,
      maxSpeed: 90,
      emergencyStopDistance: 0.35, // 35 cm emergency cutoff
      obstacleWarningDistance: 0.80, // 80 cm warning threshold
      maxMotorCurrent: 22.0, // Overcurrent trip threshold in Amps
      criticalBatteryVoltage: 31.0, // Critical undervoltage threshold in Volts
      telemetryIntervalMs: 200, // 5Hz telemetry loop
    };

    // Internal simulation physics state
    this.targetLeftSpeed = 0;
    this.targetRightSpeed = 0;
    this.currentLeftSpeed = 0;
    this.currentRightSpeed = 0;
    this.targetObstacleDist = 2.85;

    this.timer = null;
    this.startSimulation();
  }

  startSimulation() {
    if (this.timer) clearInterval(this.timer);

    this.timer = setInterval(() => {
      this.tickPhysics();
    }, this.config.telemetryIntervalMs);
  }

  stopSimulation() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.telemetryIntervalMs) {
      this.startSimulation();
    }
  }

  getConfig() {
    return { ...this.config };
  }

  getState() {
    return JSON.parse(JSON.stringify(this.state));
  }

  setMode(mode) {
    this.state.mode = mode;
    this.state.demoMode = mode === 'DEMO';
    if (mode === 'DEMO') {
      this.emit('event', {
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'info',
        title: 'Demo Mode Enabled',
        description: 'Synthetic robot telemetry and detections are active. Production hardware is offline.',
      });
    } else if (mode === 'RC') {
      // In RC mode, web commands yield to physical/simulated RC transmitter
      this.emit('event', {
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'info',
        title: 'Mode Changed to RC',
        description: 'Robot control switched to 2.4GHz RC Transmitter priority.',
      });
    } else {
      this.emit('event', {
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'info',
        title: 'Mode Changed to WEB',
        description: 'Robot control switched to Web Teleoperation Command Center.',
      });
    }
    this.emit('state', this.getState());
  }

  setMovement(command, speed, vector = null) {
    if (this.state.safety.emergencyStop) {
      return { success: false, reason: 'EMERGENCY_STOP_ACTIVE' };
    }

    if (this.state.safety.obstacleInterlock && (command === 'FORWARD' || (vector && vector.throttle > 0))) {
      return { success: false, reason: 'OBSTACLE_INTERLOCK_ACTIVE' };
    }

    const appliedSpeed = Math.min(
      Math.max(10, speed !== undefined ? speed : this.state.speed),
      this.config.maxSpeed
    );
    this.state.speed = appliedSpeed;

    if (command === 'DRIVE_VECTOR' && vector) {
      const throttle = Math.max(-1.0, Math.min(1.0, vector.throttle || 0));
      const steering = Math.max(-1.0, Math.min(1.0, vector.steering || 0));

      const leftNorm = Math.max(-1.0, Math.min(1.0, throttle + steering));
      const rightNorm = Math.max(-1.0, Math.min(1.0, throttle - steering));

      this.targetLeftSpeed = Math.round(leftNorm * appliedSpeed);
      this.targetRightSpeed = Math.round(rightNorm * appliedSpeed);

      if (throttle === 0 && steering === 0) {
        this.state.movement = 'STOPPED';
      } else if (throttle > 0.2) {
        this.state.movement = steering < -0.2 ? 'FORWARD_LEFT' : steering > 0.2 ? 'FORWARD_RIGHT' : 'FORWARD';
      } else if (throttle < -0.2) {
        this.state.movement = steering < -0.2 ? 'REVERSE_LEFT' : steering > 0.2 ? 'REVERSE_RIGHT' : 'REVERSE';
      } else {
        this.state.movement = steering < 0 ? 'SPIN_LEFT' : 'SPIN_RIGHT';
      }

      this.emit('state', this.getState());
      return { success: true, movement: this.state.movement, speed: appliedSpeed, leftMotor: this.targetLeftSpeed, rightMotor: this.targetRightSpeed };
    }

    switch (command) {
      case 'FORWARD':
        this.targetLeftSpeed = appliedSpeed;
        this.targetRightSpeed = appliedSpeed;
        this.state.movement = 'FORWARD';
        break;

      case 'REVERSE':
        this.targetLeftSpeed = -appliedSpeed;
        this.targetRightSpeed = -appliedSpeed;
        this.state.movement = 'REVERSE';
        break;

      case 'LEFT':
        // Differential Skid Turn Left: Left motor reverses, Right motor forward
        this.targetLeftSpeed = -Math.round(appliedSpeed * 0.75);
        this.targetRightSpeed = appliedSpeed;
        this.state.movement = 'TURNING_LEFT';
        break;

      case 'RIGHT':
        // Differential Skid Turn Right: Left motor forward, Right motor reverses
        this.targetLeftSpeed = appliedSpeed;
        this.targetRightSpeed = -Math.round(appliedSpeed * 0.75);
        this.state.movement = 'TURNING_RIGHT';
        break;

      case 'STOP':
      default:
        this.targetLeftSpeed = 0;
        this.targetRightSpeed = 0;
        this.state.movement = 'STOPPED';
        break;
    }

    this.emit('state', this.getState());
    return { success: true, movement: this.state.movement, speed: appliedSpeed };
  }

  stop() {
    return this.setMovement('STOP', this.state.speed);
  }

  emergencyStop(reason = 'Operator Manual E-Stop Triggered') {
    this.targetLeftSpeed = 0;
    this.targetRightSpeed = 0;
    this.currentLeftSpeed = 0;
    this.currentRightSpeed = 0;
    this.state.movement = 'STOPPED';
    this.state.leftMotor.speed = 0;
    this.state.rightMotor.speed = 0;
    this.state.leftMotor.current = 0.0;
    this.state.rightMotor.current = 0.0;

    this.state.safety.emergencyStop = true;
    this.state.safety.state = 'DANGER';
    this.state.safety.message = `EMERGENCY STOP: ${reason}`;

    this.emit('event', {
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      level: 'critical',
      title: 'EMERGENCY STOP TRIPPED',
      description: `Motors cut to 0% PWM. Reason: ${reason}`,
    });

    this.emit('state', this.getState());
    return { success: true };
  }

  resetSafety() {
    this.state.safety.emergencyStop = false;
    this.state.safety.obstacleInterlock = false;
    this.state.safety.overcurrentInterlock = false;
    this.state.safety.undervoltageInterlock = false;
    this.state.safety.state = 'SAFE';
    this.state.safety.message = 'System nominal. Safety interlocks armed.';

    this.emit('event', {
      id: `evt-${Date.now()}`,
      timestamp: new Date().toISOString(),
      level: 'info',
      title: 'Safety Interlocks Reset',
      description: 'Operator cleared emergency interlock. Normal operation armed.',
    });

    this.emit('state', this.getState());
    return { success: true };
  }

  // Simulation scenario injection
  triggerScenario(type) {
    switch (type) {
      case 'obstacle_close':
        this.targetObstacleDist = 0.25; // 25cm
        this.state.ultrasonic.distance = 0.25;
        this.emit('event', {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: 'danger',
          title: 'Obstacle Proximity Danger (0.25m)',
          description: 'Front HC-SR04 detected object inside critical zone.',
        });
        break;

      case 'low_battery':
        this.state.battery.voltage = 31.5;
        this.state.battery.percentage = 15;
        this.state.battery.status = 'LOW';
        this.emit('event', {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: 'warning',
          title: 'Battery Low Warning',
          description: 'Pack voltage sagged to 31.5V (15%). Recommend charging.',
        });
        break;

      case 'overcurrent':
        this.state.leftMotor.current = 26.5;
        this.state.rightMotor.current = 25.8;
        this.emit('event', {
          id: `evt-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: 'critical',
          title: 'Motor Overcurrent Detected (26.5A)',
          description: 'BTS7960 high-side current exceeded safety threshold.',
        });
        break;

      case 'clear':
      default:
        this.targetObstacleDist = 2.85;
        this.state.ultrasonic.distance = 2.85;
        this.state.battery.voltage = 37.5;
        this.state.battery.percentage = 88;
        this.state.battery.status = 'NORMAL';
        this.resetSafety();
        break;
    }
  }

  tickPhysics() {
    this.state.uptimeSeconds += Math.round(this.config.telemetryIntervalMs / 1000);

    // Motor ramp acceleration simulation (BTS7960 PWM ramp)
    const accelRate = 15; // 15% per tick
    if (this.currentLeftSpeed < this.targetLeftSpeed) {
      this.currentLeftSpeed = Math.min(this.targetLeftSpeed, this.currentLeftSpeed + accelRate);
    } else if (this.currentLeftSpeed > this.targetLeftSpeed) {
      this.currentLeftSpeed = Math.max(this.targetLeftSpeed, this.currentLeftSpeed - accelRate);
    }

    if (this.currentRightSpeed < this.targetRightSpeed) {
      this.currentRightSpeed = Math.min(this.targetRightSpeed, this.currentRightSpeed + accelRate);
    } else if (this.currentRightSpeed > this.targetRightSpeed) {
      this.currentRightSpeed = Math.max(this.targetRightSpeed, this.currentRightSpeed - accelRate);
    }

    this.state.leftMotor.speed = this.currentLeftSpeed;
    this.state.rightMotor.speed = this.currentRightSpeed;

    // Motor current calculation based on speed PWM + random small load fluctuation
    const isMoving = this.currentLeftSpeed !== 0 || this.currentRightSpeed !== 0;
    const baseCurrentLeft = Math.abs(this.currentLeftSpeed) * 0.12;
    const baseCurrentRight = Math.abs(this.currentRightSpeed) * 0.12;
    const noiseL = (Math.random() - 0.5) * 0.4;
    const noiseR = (Math.random() - 0.5) * 0.4;

    this.state.leftMotor.current = isMoving ? Math.max(0.4, +(baseCurrentLeft + noiseL).toFixed(2)) : 0.0;
    this.state.rightMotor.current = isMoving ? Math.max(0.4, +(baseCurrentRight + noiseR).toFixed(2)) : 0.0;

    // Thermal simulation for BTS7960 heatsinks
    if (isMoving) {
      this.state.leftMotor.temp = Math.min(65, +(this.state.leftMotor.temp + 0.05).toFixed(1));
      this.state.rightMotor.temp = Math.min(65, +(this.state.rightMotor.temp + 0.05).toFixed(1));
    } else {
      this.state.leftMotor.temp = Math.max(28, +(this.state.leftMotor.temp - 0.08).toFixed(1));
      this.state.rightMotor.temp = Math.max(28, +(this.state.rightMotor.temp - 0.08).toFixed(1));
    }

    // Battery Discharge & Sag under high current draw
    const totalDraw = +(this.state.leftMotor.current + this.state.rightMotor.current + 0.8).toFixed(2);
    this.state.battery.current = totalDraw;

    const voltageSag = totalDraw * 0.04;
    const nominalPack = 37.0;
    this.state.battery.voltage = +(Math.max(29.0, nominalPack - voltageSag + (Math.random() - 0.5) * 0.1)).toFixed(2);

    // Ultrasonic Radar distance jitter / simulation
    if (Math.abs(this.state.ultrasonic.distance - this.targetObstacleDist) > 0.05) {
      const step = (this.targetObstacleDist - this.state.ultrasonic.distance) * 0.2;
      this.state.ultrasonic.distance = +(this.state.ultrasonic.distance + step).toFixed(2);
    } else {
      // Natural sensor noise
      this.state.ultrasonic.distance = +(this.targetObstacleDist + (Math.random() - 0.5) * 0.04).toFixed(2);
    }

    // Safety checks against config
    if (this.state.ultrasonic.distance <= this.config.emergencyStopDistance) {
      this.state.ultrasonic.status = 'DANGER';
      if (!this.state.safety.emergencyStop && this.state.movement === 'FORWARD') {
        this.state.safety.obstacleInterlock = true;
        this.emergencyStop(`Ultrasonic Obstacle at ${this.state.ultrasonic.distance}m!`);
      }
    } else if (this.state.ultrasonic.distance <= this.config.obstacleWarningDistance) {
      this.state.ultrasonic.status = 'WARNING';
      this.state.safety.state = 'WARNING';
    } else {
      this.state.ultrasonic.status = 'CLEAR';
      if (!this.state.safety.emergencyStop) {
        this.state.safety.state = 'SAFE';
      }
    }

    // Overcurrent check
    if (this.state.leftMotor.current > this.config.maxMotorCurrent || this.state.rightMotor.current > this.config.maxMotorCurrent) {
      if (!this.state.safety.emergencyStop) {
        this.state.safety.overcurrentInterlock = true;
        this.emergencyStop('Motor Overcurrent Tripped (> 22A)');
      }
    }

    // Construct telemetry packet
    const telemetry = {
      timestamp: new Date().toISOString(),
      batteryVoltage: this.state.battery.voltage,
      batteryCurrent: this.state.battery.current,
      batteryPercentage: this.state.battery.percentage,
      batteryTemp: this.state.battery.temperature,
      leftMotorSpeed: this.state.leftMotor.speed,
      leftMotorCurrent: this.state.leftMotor.current,
      leftMotorVoltage: this.state.leftMotor.voltage,
      leftMotorTemp: this.state.leftMotor.temp,
      rightMotorSpeed: this.state.rightMotor.speed,
      rightMotorCurrent: this.state.rightMotor.current,
      rightMotorVoltage: this.state.rightMotor.voltage,
      rightMotorTemp: this.state.rightMotor.temp,
      obstacleDistance: this.state.ultrasonic.distance,
      obstacleStatus: this.state.ultrasonic.status,
      movement: this.state.movement,
      mode: this.state.mode,
      speedPWM: this.state.speed,
      emergencyStop: this.state.safety.emergencyStop,
      totalCurrent: totalDraw,
      internal5VRail: 5.02, // LM2596 output
      cpuLoad: Math.round(18 + totalDraw * 1.5 + Math.random() * 5),
      loopRateHz: 50,
    };

    this.emit('telemetry', telemetry);
  }
}

export const mockRobot = new MockRobotAdapter();
