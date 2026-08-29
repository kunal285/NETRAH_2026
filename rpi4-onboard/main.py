#!/usr/bin/env python3
"""
PRAHARI Raspberry Pi 4 Main Daemon Entry Point
"""

import time
import signal
import sys
from robot_controller import RobotController

def main():
    robot = RobotController()

    def sig_handler(sig, frame):
        print("\n[MAIN] Termination signal received. Exiting safely...")
        robot.shutdown()
        sys.exit(0)

    signal.signal(signal.SIGINT, sig_handler)
    signal.signal(signal.SIGTERM, sig_handler)

    print("[MAIN] PRAHARI Onboard System Operational. Press Ctrl+C to stop.")
    while True:
        time.sleep(1)

if __name__ == "__main__":
    main()
