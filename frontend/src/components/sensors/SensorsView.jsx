"use client";

import React, { useState } from 'react';
import { useRobot } from '../../context/RobotContext';
import { StatusBadge } from '../common/StatusBadge';
import {
  Cpu,
  Zap,
  Battery,
  Camera,
  Layers,
  Compass,
  MapPin,
} from 'lucide-react';

export const SensorsView = () => {
  const {
    liveBattery,
    liveMotors,
    liveUltrasonic,
    liveGps,
    liveImu,
    liveWifi,
    robotStatus,
    formatFreshness,
    selectedRobotId,
    dataSource,
  } = useRobot();

  const sensors = [
    {
      id: 'hc-sr04',
      name: 'HC-SR04 Ultrasonic Rangefinder',
      channel: 'GPIO 5 (TRIG) / GPIO 18 (ECHO)',
      status: liveUltrasonic.frontDistanceM != null ? 'NORMAL' : 'OFFLINE',
      value: liveUltrasonic.frontDistanceM != null ? `${liveUltrasonic.frontDistanceM} m (${liveUltrasonic.frontDistanceCm} cm)` : 'N/A',
      updatedAt: liveUltrasonic.updatedAt,
      desc: 'Front obstacle detection radar (range 0.02m - 4.0m)',
      type: 'Distance Sensor',
    },
    {
      id: 'acs712-l',
      name: 'ACS712-30A Current Sensor (Left)',
      channel: 'ADC1_CH0 (GPIO 36)',
      status: liveMotors.left.current != null ? 'NORMAL' : 'OFFLINE',
      value: liveMotors.left.current != null ? `${liveMotors.left.current} A (PWM: ${liveMotors.left.pwm ?? 0})` : 'N/A',
      updatedAt: liveMotors.updatedAt,
      desc: 'Measures Left MY1016 motor draw via BTS7960 low-side shunt',
      type: 'Hall Current',
    },
    {
      id: 'acs712-r',
      name: 'ACS712-30A Current Sensor (Right)',
      channel: 'ADC1_CH3 (GPIO 39)',
      status: liveMotors.right.current != null ? 'NORMAL' : 'OFFLINE',
      value: liveMotors.right.current != null ? `${liveMotors.right.current} A (PWM: ${liveMotors.right.pwm ?? 0})` : 'N/A',
      updatedAt: liveMotors.updatedAt,
      desc: 'Measures Right MY1016 motor draw via BTS7960 low-side shunt',
      type: 'Hall Current',
    },
    {
      id: 'voltage-divider',
      name: 'Precision Resistor Voltage Divider',
      channel: 'ADC1_CH6 (GPIO 34)',
      status: liveBattery.voltage != null ? (liveBattery.voltage < 31 ? 'CRITICAL' : 'NORMAL') : 'OFFLINE',
      value: liveBattery.voltage != null ? `${liveBattery.voltage} V (${liveBattery.percentage ?? 'N/A'}%)` : 'N/A',
      updatedAt: liveBattery.updatedAt,
      desc: 'Scales 36V-42V Li-ion pack voltage down to 0-3.3V ESP32 ADC range',
      type: 'Analog Voltage',
    },
    {
      id: 'imu-6dof',
      name: 'MPU6050 / 6-DOF IMU Sensor',
      channel: 'I2C Bus (SDA GPIO 21 / SCL GPIO 22)',
      status: liveImu.available ? 'NORMAL' : 'OFFLINE',
      value: liveImu.available ? `Accel: [${liveImu.accel.x}, ${liveImu.accel.y}, ${liveImu.accel.z}]` : 'IMU NOT AVAILABLE',
      updatedAt: liveImu.updatedAt,
      desc: 'Tri-axis accelerometer & gyroscope motion telemetry',
      type: 'Inertial Sensor',
    },
    {
      id: 'gps-neo6m',
      name: 'NEO-6M GPS Satellite Module',
      channel: 'UART2 (RX GPIO 16 / TX GPIO 17)',
      status: liveGps.available ? 'NORMAL' : 'OFFLINE',
      value: liveGps.available ? `${liveGps.latitude}, ${liveGps.longitude} (${liveGps.speed} km/h)` : 'GPS UNAVAILABLE',
      updatedAt: liveGps.updatedAt,
      desc: 'NMEA-0183 high-precision geodetic localization',
      type: 'Position Sensor',
    },
  ];

  return (
    <div id="sensors-view" className="space-y-6 max-w-6xl mx-auto font-sans">
      {/* Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 uppercase">
              HARDWARE SENSOR ARRAY & BUS STATUS — {selectedRobotId}
            </div>
            <p className="text-xs text-slate-500">
              Live ADC sampling, I2C IMU, and UART GPS telemetry from physical robot microcontroller.
            </p>
          </div>
        </div>
        <StatusBadge
          label={robotStatus === 'ONLINE' ? 'SENSORS LIVE' : 'HARDWARE OFFLINE'}
          variant={robotStatus === 'ONLINE' ? 'green' : 'slate'}
        />
      </div>

      {/* Sensor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sensors.map((s) => {
          const fresh = formatFreshness(s.updatedAt);
          return (
            <div
              key={s.id}
              className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.type}</span>
                  <StatusBadge
                    label={s.status}
                    variant={s.status === 'NORMAL' ? 'green' : s.status === 'CRITICAL' ? 'red' : 'slate'}
                  />
                </div>

                <div className="text-sm font-bold text-slate-900">{s.name}</div>
                <div className="text-xl font-black text-slate-900 font-mono truncate">{s.value}</div>
                <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>{s.channel}</span>
                <span className={fresh.isStale ? 'text-slate-400' : 'text-emerald-700 font-bold'}>{fresh.text}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
