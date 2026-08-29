export class AudioCapture {
  constructor() {
    this.isRecording = false;
    this.buffer = [];
  }

  start() {
    this.isRecording = true;
    console.log("[RPI5-AUDIO] Microphone recording initialized.");
  }

  stop() {
    this.isRecording = false;
    console.log("[RPI5-AUDIO] Microphone recording halted.");
  }

  getBuffer() {
    if (!this.isRecording) return [];
    return this.buffer || [];
  }
}
