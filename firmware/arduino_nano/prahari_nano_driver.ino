/*
 * ==============================================================================
 * PRAHARI V3 — ARDUINO NANO HARDWARE MOTOR & SENSOR CONTROLLER
 * ==============================================================================
 * Hardware Architecture:
 * - Microcontroller: Arduino Nano (ATmega328P, 16MHz, 5V)
 * - Motor Drivers: 2 × BTS7960 43A High-Power H-Bridge Drivers
 * - Motors: 2 × DC Geared Drive Motors (Rear-Wheel Differential Drive)
 * - Front Wheels: Passive 360° Industrial Caster Wheels (NO front steering motor/servo)
 * - Remote Control: 2-Channel / 4-Channel PWM RC Receiver (Interrupt-driven)
 * - Sensors: Battery Voltage Divider (A0), Current Sensors (A1, A2), Ultrasonic (D7, D8)
 * - Communication: 115200 Baud Serial / USB to Command Center Backend
 * - Failsafe: 400ms Hardware Command Timeout (Auto-Stop on connection loss)
 * ==============================================================================
 */

#include <Arduino.h>

// ------------------------------------------------------------------------------
// PIN DEFINITIONS
// ------------------------------------------------------------------------------

// Left Motor BTS7960 Driver Pins
#define LEFT_RPWM_PIN     5   // PWM Pin (Timer 0)
#define LEFT_LPWM_PIN     6   // PWM Pin (Timer 0)
#define LEFT_R_EN_PIN     4   // Right Enable
#define LEFT_L_EN_PIN     4   // Left Enable (Tied to D4)

// Right Motor BTS7960 Driver Pins
#define RIGHT_RPWM_PIN    9   // PWM Pin (Timer 1)
#define RIGHT_LPWM_PIN    10  // PWM Pin (Timer 1)
#define RIGHT_R_EN_PIN    7   // Right Enable
#define RIGHT_L_EN_PIN    7   // Left Enable (Tied to D7)

// Ultrasonic HC-SR04 Range Sensor Pins
#define US_TRIG_PIN       8
#define US_ECHO_PIN       12

// Analog Sensor Input Pins
#define BATTERY_VOLTAGE_PIN A0  // Voltage Divider (R1=30k, R2=7.5k -> Factor 5.0)
#define LEFT_CURRENT_PIN    A1  // ACS712-30A Current Sensor
#define RIGHT_CURRENT_PIN   A2  // ACS712-30A Current Sensor
#define TEMP_SENSOR_PIN     A3  // NTC Thermistor

// Physical RC Receiver Inputs (Interrupt-driven pins)
#define RC_THROTTLE_PIN     2   // INT0 (Pin D2)
#define RC_STEERING_PIN     3   // INT1 (Pin D3)

// Status Indicator LED
#define STATUS_LED_PIN      13

// ------------------------------------------------------------------------------
// CONSTANTS & CONFIGURATION
// ------------------------------------------------------------------------------

#define SERIAL_BAUD_RATE        115200
#define COMMAND_TIMEOUT_MS      400     // Failsafe auto-stop if no packet received in 400ms
#define TELEMETRY_INTERVAL_MS   100     // 10 Hz Telemetry Broadcast
#define ULTRASONIC_INTERVAL_MS  150     // ~6.6 Hz Obstacle Scanning
#define RC_DEADZONE_US          30      // Microseconds deadband around neutral 1500us
#define RC_TIMEOUT_MS           300     // Switch from RC to WEB if RC signal stops

// ------------------------------------------------------------------------------
// GLOBAL STATE VARIABLES
// ------------------------------------------------------------------------------

// RC Pulse Measurement Variables (Interrupt handlers)
volatile unsigned long rc_throttle_start = 0;
volatile unsigned long rc_steering_start = 0;
volatile int rc_throttle_pwm = 1500; // Neutral 1500us
volatile int rc_steering_pwm = 1500; // Neutral 1500us
volatile unsigned long last_rc_pulse_time = 0;

// Motor Outputs (-100 to +100)
int left_motor_power = 0;
int right_motor_power = 0;

// Operational Modes: "WEB", "RC", "ESTOP"
enum RobotControlMode {
  MODE_WEB,
  MODE_RC,
  MODE_ESTOP
};

RobotControlMode active_mode = MODE_WEB;
bool emergency_stop_active = false;
unsigned long last_valid_command_time = 0;
unsigned long last_telemetry_time = 0;
unsigned long last_ultrasonic_time = 0;

// Sensor Readings
float battery_voltage = 36.0;
float left_motor_current = 0.0;
float right_motor_current = 0.0;
float system_temperature = 38.0;
int obstacle_distance_cm = 120;

// Serial Buffer
String serial_buffer = "";

// ------------------------------------------------------------------------------
// INTERRUPT SERVICE ROUTINES FOR PHYSICAL RC RECEIVER
// ------------------------------------------------------------------------------

void isr_throttle_pulse() {
  if (digitalRead(RC_THROTTLE_PIN) == HIGH) {
    rc_throttle_start = micros();
  } else {
    unsigned long duration = micros() - rc_throttle_start;
    if (duration >= 900 && duration <= 2100) {
      rc_throttle_pwm = duration;
      last_rc_pulse_time = millis();
    }
  }
}

void isr_steering_pulse() {
  if (digitalRead(RC_STEERING_PIN) == HIGH) {
    rc_steering_start = micros();
  } else {
    unsigned long duration = micros() - rc_steering_start;
    if (duration >= 900 && duration <= 2100) {
      rc_steering_pwm = duration;
      last_rc_pulse_time = millis();
    }
  }
}

// ------------------------------------------------------------------------------
// BTS7960 MOTOR CONTROL FUNCTIONS
// ------------------------------------------------------------------------------

void init_motor_drivers() {
  pinMode(LEFT_RPWM_PIN, OUTPUT);
  pinMode(LEFT_LPWM_PIN, OUTPUT);
  pinMode(LEFT_R_EN_PIN, OUTPUT);
  pinMode(LEFT_L_EN_PIN, OUTPUT);

  pinMode(RIGHT_RPWM_PIN, OUTPUT);
  pinMode(RIGHT_LPWM_PIN, OUTPUT);
  pinMode(RIGHT_R_EN_PIN, OUTPUT);
  pinMode(RIGHT_L_EN_PIN, OUTPUT);

  // Enable Drivers
  digitalWrite(LEFT_R_EN_PIN, HIGH);
  digitalWrite(LEFT_L_EN_PIN, HIGH);
  digitalWrite(RIGHT_R_EN_PIN, HIGH);
  digitalWrite(RIGHT_L_EN_PIN, HIGH);

  stop_motors();
}

void set_left_motor(int speed_percent) {
  speed_percent = constrain(speed_percent, -100, 100);
  int pwm_val = map(abs(speed_percent), 0, 100, 0, 255);

  if (speed_percent > 0) {
    // Forward
    analogWrite(LEFT_RPWM_PIN, pwm_val);
    analogWrite(LEFT_LPWM_PIN, 0);
  } else if (speed_percent < 0) {
    // Reverse
    analogWrite(LEFT_RPWM_PIN, 0);
    analogWrite(LEFT_LPWM_PIN, pwm_val);
  } else {
    // Stop / Brake
    analogWrite(LEFT_RPWM_PIN, 0);
    analogWrite(LEFT_LPWM_PIN, 0);
  }
}

void set_right_motor(int speed_percent) {
  speed_percent = constrain(speed_percent, -100, 100);
  int pwm_val = map(abs(speed_percent), 0, 100, 0, 255);

  if (speed_percent > 0) {
    // Forward
    analogWrite(RIGHT_RPWM_PIN, pwm_val);
    analogWrite(RIGHT_LPWM_PIN, 0);
  } else if (speed_percent < 0) {
    // Reverse
    analogWrite(RIGHT_RPWM_PIN, 0);
    analogWrite(RIGHT_LPWM_PIN, pwm_val);
  } else {
    // Stop / Brake
    analogWrite(RIGHT_RPWM_PIN, 0);
    analogWrite(RIGHT_LPWM_PIN, 0);
  }
}

void set_motors(int left, int right) {
  if (emergency_stop_active) {
    left_motor_power = 0;
    right_motor_power = 0;
    set_left_motor(0);
    set_right_motor(0);
    return;
  }

  left_motor_power = left;
  right_motor_power = right;
  set_left_motor(left);
  set_right_motor(right);
}

void stop_motors() {
  left_motor_power = 0;
  right_motor_power = 0;
  set_left_motor(0);
  set_right_motor(0);
}

void execute_emergency_stop() {
  emergency_stop_active = true;
  active_mode = MODE_ESTOP;
  stop_motors();
}

void reset_emergency_stop() {
  emergency_stop_active = false;
  active_mode = MODE_WEB;
  stop_motors();
}

// ------------------------------------------------------------------------------
// DIFFERENTIAL DRIVE CALCULATION
// ------------------------------------------------------------------------------

void compute_differential_drive(float throttle, float steering, int speed_limit_percent) {
  // throttle: -1.0 to +1.0
  // steering: -1.0 to +1.0
  float raw_left = throttle + steering;
  float raw_right = throttle - steering;

  raw_left = constrain(raw_left, -1.0, 1.0);
  raw_right = constrain(raw_right, -1.0, 1.0);

  float limit_factor = constrain(speed_limit_percent, 10, 100) / 100.0;
  int left_power = (int)(raw_left * limit_factor * 100.0);
  int right_power = (int)(raw_right * limit_factor * 100.0);

  set_motors(left_power, right_power);
}

// ------------------------------------------------------------------------------
// SENSOR READING FUNCTIONS
// ------------------------------------------------------------------------------

void read_sensors() {
  // Battery Voltage Divider (36V Pack Nominal)
  int raw_volt = analogRead(BATTERY_VOLTAGE_PIN);
  battery_voltage = (raw_volt * (5.0 / 1023.0)) * 7.6; // Calibration factor

  // Current Sensors ACS712 (2.5V Offset, 66mV/A for 30A model)
  int raw_cur_l = analogRead(LEFT_CURRENT_PIN);
  int raw_cur_r = analogRead(RIGHT_CURRENT_PIN);
  left_motor_current = abs(((raw_cur_l * (5.0 / 1023.0)) - 2.5) / 0.066);
  right_motor_current = abs(((raw_cur_r * (5.0 / 1023.0)) - 2.5) / 0.066);

  // Temperature Sensor NTC
  int raw_temp = analogRead(TEMP_SENSOR_PIN);
  system_temperature = 25.0 + (raw_temp * 0.05);
}

void read_ultrasonic_distance() {
  digitalWrite(US_TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(US_TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(US_TRIG_PIN, LOW);

  long duration = pulseIn(US_ECHO_PIN, HIGH, 25000); // 25ms timeout (~4.3m max)
  if (duration > 0) {
    obstacle_distance_cm = duration * 0.034 / 2;
  } else {
    obstacle_distance_cm = 400; // Clear
  }
}

// ------------------------------------------------------------------------------
// PHYSICAL RC CONTROL ARBITRATION
// ------------------------------------------------------------------------------

void check_rc_control() {
  unsigned long now = millis();
  bool rc_connected = (now - last_rc_pulse_time < RC_TIMEOUT_MS);

  if (rc_connected && !emergency_stop_active) {
    // Check if RC sticks are moved outside deadzone
    int throttle_delta = abs(rc_throttle_pwm - 1500);
    int steering_delta = abs(rc_steering_pwm - 1500);

    if (throttle_delta > RC_DEADZONE_US || steering_delta > RC_DEADZONE_US) {
      // Physical RC has control priority (Priority 2)
      active_mode = MODE_RC;

      float rc_throttle = (rc_throttle_pwm - 1500) / 500.0;
      float rc_steering = (rc_steering_pwm - 1500) / 500.0;
      rc_throttle = constrain(rc_throttle, -1.0, 1.0);
      rc_steering = constrain(rc_steering, -1.0, 1.0);

      compute_differential_drive(rc_throttle, rc_steering, 85);
      return;
    }
  }

  // If we were in RC mode but sticks are now neutral or RC is off, revert to WEB mode
  if (active_mode == MODE_RC) {
    active_mode = MODE_WEB;
    stop_motors();
  }
}

// ------------------------------------------------------------------------------
// SERIAL COMMAND PARSER
// ------------------------------------------------------------------------------

void process_serial_command(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;

  last_valid_command_time = millis();

  // 1. Emergency Stop Command
  if (cmd.indexOf("\"type\":\"emergency_stop\"") >= 0 || cmd.equalsIgnoreCase("ESTOP")) {
    execute_emergency_stop();
    Serial.println("{\"ack\":\"ESTOP_EXECUTED\"}");
    return;
  }

  // 2. Reset Safety Command
  if (cmd.indexOf("\"type\":\"reset_safety\"") >= 0 || cmd.equalsIgnoreCase("RESET")) {
    reset_emergency_stop();
    Serial.println("{\"ack\":\"SAFETY_RESET\"}");
    return;
  }

  // 3. Stop Command
  if (cmd.indexOf("\"type\":\"stop\"") >= 0 || cmd.equalsIgnoreCase("STOP")) {
    stop_motors();
    Serial.println("{\"ack\":\"STOPPED\"}");
    return;
  }

  // 4. Drive Vector Command: {"type":"drive","throttle":0.75,"steering":-0.20,"speed":70}
  if (cmd.indexOf("\"type\":\"drive\"") >= 0) {
    if (active_mode == MODE_RC) {
      // Web commands ignored while physical RC is driving
      Serial.println("{\"ack\":\"RC_ACTIVE_IGNORED\"}");
      return;
    }

    float throttle = 0.0;
    float steering = 0.0;
    int speed_limit = 70;

    int t_idx = cmd.indexOf("\"throttle\":");
    if (t_idx >= 0) {
      throttle = cmd.substring(t_idx + 11).toFloat();
    }

    int s_idx = cmd.indexOf("\"steering\":");
    if (s_idx >= 0) {
      steering = cmd.substring(s_idx + 11).toFloat();
    }

    int sp_idx = cmd.indexOf("\"speed\":");
    if (sp_idx >= 0) {
      speed_limit = cmd.substring(sp_idx + 8).toInt();
      if (speed_limit <= 0) speed_limit = 70;
    }

    compute_differential_drive(throttle, steering, speed_limit);
    Serial.println("{\"ack\":\"DRIVE_OK\"}");
    return;
  }

  // 5. Direct Motor Command: {"type":"motor","left":55,"right":95}
  if (cmd.indexOf("\"type\":\"motor\"") >= 0) {
    int left_val = 0;
    int right_val = 0;

    int l_idx = cmd.indexOf("\"left\":");
    if (l_idx >= 0) left_val = cmd.substring(l_idx + 7).toInt();

    int r_idx = cmd.indexOf("\"right\":");
    if (r_idx >= 0) right_val = cmd.substring(r_idx + 8).toInt();

    set_motors(left_val, right_val);
    Serial.println("{\"ack\":\"MOTOR_OK\"}");
    return;
  }
}

// ------------------------------------------------------------------------------
// TELEMETRY BROADCAST
// ------------------------------------------------------------------------------

void send_telemetry() {
  int battery_pct = constrain((int)((battery_voltage - 31.0) / (37.8 - 31.0) * 100), 0, 100);
  bool rc_connected = (millis() - last_rc_pulse_time < RC_TIMEOUT_MS);

  // Formatted JSON Telemetry Output (Read by Backend Serial Parser)
  Serial.print("{\"type\":\"telemetry\"");
  Serial.print(",\"battery\":"); Serial.print(battery_pct);
  Serial.print(",\"voltage\":"); Serial.print(battery_voltage, 1);
  Serial.print(",\"leftMotor\":"); Serial.print(left_motor_power);
  Serial.print(",\"rightMotor\":"); Serial.print(right_motor_power);
  Serial.print(",\"leftCurrent\":"); Serial.print(left_motor_current, 1);
  Serial.print(",\"rightCurrent\":"); Serial.print(right_motor_current, 1);
  Serial.print(",\"temperature\":"); Serial.print((int)system_temperature);
  Serial.print(",\"obstacle\":"); Serial.print(obstacle_distance_cm);
  Serial.print(",\"rcStatus\":"); Serial.print(rc_connected ? "\"CONNECTED\"" : "\"DISCONNECTED\"");
  Serial.print(",\"arduinoStatus\":\"CONNECTED\"");
  Serial.print(",\"mode\":");
  if (emergency_stop_active) Serial.print("\"ESTOP\"");
  else if (active_mode == MODE_RC) Serial.print("\"RC\"");
  else Serial.print("\"WEB\"");
  Serial.println("}");
}

// ------------------------------------------------------------------------------
// ARDUINO SETUP & MAIN LOOP
// ------------------------------------------------------------------------------

void setup() {
  Serial.begin(SERIAL_BAUD_RATE);
  serial_buffer.reserve(128);

  pinMode(STATUS_LED_PIN, OUTPUT);
  pinMode(US_TRIG_PIN, OUTPUT);
  pinMode(US_ECHO_PIN, INPUT);

  // Setup Physical RC Interrupts
  pinMode(RC_THROTTLE_PIN, INPUT_PULLUP);
  pinMode(RC_STEERING_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(RC_THROTTLE_PIN), isr_throttle_pulse, CHANGE);
  attachInterrupt(digitalPinToInterrupt(RC_STEERING_PIN), isr_steering_pulse, CHANGE);

  // Initialize BTS7960 Drivers
  init_motor_drivers();

  last_valid_command_time = millis();
  digitalWrite(STATUS_LED_PIN, HIGH);
  Serial.println("{\"status\":\"PRAHARI_NANO_ONLINE\",\"baud\":115200,\"drivers\":\"2xBTS7960\",\"version\":\"v3.0-NANO\"}");
}

void loop() {
  unsigned long now = millis();

  // 1. Read Incoming Serial Characters from Backend
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\n' || c == '\r') {
      if (serial_buffer.length() > 0) {
        process_serial_command(serial_buffer);
        serial_buffer = "";
      }
    } else {
      if (serial_buffer.length() < 120) {
        serial_buffer += c;
      }
    }
  }

  // 2. Hardware Safety Failsafe: Command Timeout (300-500ms)
  if (active_mode == MODE_WEB && !emergency_stop_active) {
    if (now - last_valid_command_time > COMMAND_TIMEOUT_MS) {
      // Auto-stop motors if communication interrupted
      if (left_motor_power != 0 || right_motor_power != 0) {
        stop_motors();
      }
    }
  }

  // 3. Check Physical RC Remote State & Priority Arbitration
  check_rc_control();

  // 4. Periodically Read Sensors & Ultrasonic Distance
  if (now - last_ultrasonic_time >= ULTRASONIC_INTERVAL_MS) {
    last_ultrasonic_time = now;
    read_ultrasonic_distance();
    read_sensors();

    // Automatic Obstacle Emergency Brake
    if (obstacle_distance_cm > 0 && obstacle_distance_cm < 25 && (left_motor_power > 0 || right_motor_power > 0)) {
      stop_motors();
    }
  }

  // 5. 10 Hz Telemetry Publication Loop
  if (now - last_telemetry_time >= TELEMETRY_INTERVAL_MS) {
    last_telemetry_time = now;
    send_telemetry();
  }
}
