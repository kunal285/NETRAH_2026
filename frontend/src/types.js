// PRAHARI UI Domain Types and Constants (JavaScript)

export const MovementCommand = {
  FORWARD: 'FORWARD',
  REVERSE: 'REVERSE',
  LEFT: 'LEFT',
  RIGHT: 'RIGHT',
  STOP: 'STOP',
};

export const ControlMode = {
  WEB: 'WEB',
  RC: 'RC',
  AUTO: 'AUTO',
};

export const SafetyState = {
  SAFE: 'SAFE',
  WARNING: 'WARNING',
  DANGER: 'DANGER',
};

export const AIDetectionType = {
  AMBULANCE: 'ambulance',
  ANPR: 'anpr',
  VEHICLE: 'vehicle',
  FACE: 'face',
};
