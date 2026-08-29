let i2c = null;
let SerialPort = null;
let i2cBusInstance = null;
let serialPortInstance = null;

export class HardwareAdapter {
  constructor(controller) {
    this.controller = controller;
    this.initialized = false;
  }
  
  async init() {
    try {
      const i2cBusModule = await import('i2c-bus');
      i2c = i2cBusModule.default;
      i2cBusInstance = i2c.openSync(1);
      console.log("[RPI5-HARDWARE] MPU-6050 I2C Bus 1 successfully opened.");
      this.initialized = true;
    } catch (e) {
      console.log("[RPI5-HARDWARE] I2C hardware library not found or bus unavailable. Falling back to mock.");
    }

    try {
      const serialportModule = await import('serialport');
      SerialPort = serialportModule.SerialPort;
      serialPortInstance = new SerialPort({
        path: '/dev/serial0',
        baudRate: 9600,
        autoOpen: false
      });
      serialPortInstance.open((err) => {
        if (!err) {
          console.log("[RPI5-HARDWARE] Serial GPS device /dev/serial0 opened successfully.");
        }
      });
    } catch (e) {
      console.log("[RPI5-HARDWARE] Serial hardware library not found.");
    }
  }

  readSensors() {
    this.controller.uptime = Math.floor((Date.now() - this.controller.startTime) / 1000);
    
    let readI2cSuccess = false;
    if (i2cBusInstance) {
      try {
        const buffer = Buffer.alloc(6);
        i2cBusInstance.readI2cBlockSync(0x68, 0x3B, 6, buffer);
        let ax = (buffer[0] << 8) | buffer[1];
        let ay = (buffer[2] << 8) | buffer[3];
        let az = (buffer[4] << 8) | buffer[5];
        if (ax > 32767) ax -= 65536;
        if (ay > 32767) ay -= 65536;
        if (az > 32767) az -= 65536;

        this.controller.accel = {
          x: Number((ax / 16384.0 * 9.81).toFixed(2)),
          y: Number((ay / 16384.0 * 9.81).toFixed(2)),
          z: Number((az / 16384.0 * 9.81).toFixed(2)),
        };
        this.controller.gyro = { x: 0, y: 0, z: 0 };
        readI2cSuccess = true;
      } catch (err) {
        // I2C read failure — keep previous or null sensor state
      }
    }
    
    if (!readI2cSuccess) {
      this.controller.imuAvailable = false;
    }
  }
  
  close() {
    if (i2cBusInstance) {
      try {
        i2cBusInstance.closeSync();
      } catch (e) {}
    }
    if (serialPortInstance && serialPortInstance.isOpen) {
      try {
        serialPortInstance.close();
      } catch (e) {}
    }
  }
}
