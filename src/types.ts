export interface TelemetryResponse {
  parsed: {
    isRaceOn: number;
    timestamp: number;
    engine: {
      rpm: number;
      maxRpm: number;
      idleRpm: number;
      cylinders: number;
    };
    motion: {
      acceleration: {
        x: number;
        y: number;
        z: number;
      };
      velocity: {
        x: number;
        y: number;
        z: number;
      };
      angularVelocity: {
        x: number;
        y: number;
        z: number;
      };
      orientation: {
        yaw: number;
        pitch: number;
        roll: number;
      };
    };
    wheels: {
      slipRatio: {
        frontLeft: number;
        frontRight: number;
        rearLeft: number;
        rearRight: number;
      };
      slipAngle: {
        frontLeft: number;
        frontRight: number;
        rearLeft: number;
        rearRight: number;
      };
      combinedSlip: {
        frontLeft: number;
        frontRight: number;
        rearLeft: number;
        rearRight: number;
      };
      rotationSpeed: {
        frontLeft: number;
        frontRight: number;
        rearLeft: number;
        rearRight: number;
      };
      suspensionTravel: {
        frontLeft: number;
        frontRight: number;
        rearLeft: number;
        rearRight: number;
      };
      suspensionMeters: {
        frontLeft: number;
        frontRight: number;
        rearLeft: number;
        rearRight: number;
      };
      onRumbleStrip: {
        frontLeft: number;
        frontRight: number;
        rearLeft: number;
        rearRight: number;
      };
      inPuddleDepth: {
        frontLeft: number;
        frontRight: number;
        rearLeft: number;
        rearRight: number;
      };
      surfaceRumble: {
        frontLeft: number;
        frontRight: number;
        rearLeft: number;
        rearRight: number;
      };
      tireTemp: {
        frontLeft: number;
        frontRight: number;
        rearLeft: number;
        rearRight: number;
      };
      tireWear: {
        frontLeft: number;
        frontRight: number;
        rearLeft: number;
        rearRight: number;
      };
    };
    car: {
      ordinal: number;
      class: number;
      performanceIndex: number;
      drivetrain: number;
    };
    position: {
      x: number;
      y: number;
      z: number;
    };
    performance: {
      speedKmh: number;
      powerKw: number;
      torqueNm: number;
      boost: number;
      fuel: number;
    };
    lap: {
      current: number;
      last: number;
      best: number;
      number: number;
      raceTime: number;
      position: number;
    };
    input: {
      throttle: number;
      brake: number;
      clutch: number;
      handbrake: number;
      gear: number;
      steer: number;
    };
    track: { ordinal: number; distanceTraveled: number };
    ai: {
      normalizedDrivingLine: number;
      normalizedAIBrakeDifference: number;
    };
  };
  timestamp: number;
  efficiency: {
    map: {
      "1": {
        rpmMin: number;
        rpmMax: number;
        rpmAvg: number;
        rpmOptimal: number;
        shiftWindow: [number, number];
      };
    };
    recommendations: {
      upshiftRecommended: boolean;
      downshiftRecommended: boolean;
    };
    lights: string[];
    currentRpm: number;
    finalShiftRPM: number;
  };
}

export interface TelemetryFrame {
  gear: string;
  rpm: number;
  speed: number;
  torque: number;
  throttle: number; // 0-1
  brake: number; // 0-1
  boost: number;
  power: number;
  fuel: number;
  position: number;
  lap: number;
}

export interface ShiftRecommendation {
  upShift: boolean;
  downShift: boolean;
  recommendation: "WAIT" | "UP" | "DOWN";
}

export interface TelemetryData extends TelemetryFrame {
  rpmMax: number;
  redLine: number;
  shiftWindow: { min: number; max: number };
  shiftRecommendation: ShiftRecommendation;
  shiftLights: {
    active: number; // number of lights to show
    blink: boolean;
    color: string;
  };
}
