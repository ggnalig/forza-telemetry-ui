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
  // Resolved from car.ordinal against the merged Forza Motorsport + Forza
  // Horizon 6 car database (both games share the same UDP telemetry format
  // and car-ordinal ID space) - null when the ordinal isn't in either source.
  carInfo: {
    carId: number;
    year: number;
    make: string;
    model: string;
    displayName: string;
  } | null;
  efficiency: {
    map: {
      [gear: number]: {
        rpmMin: number;
        rpmMax: number;
        rpmAvg: number;
        rpmOptimal: number;
        // Descriptive p10-p90 observed spread, NOT a decision boundary -
        // the real shift point is `finalShiftRPM` below. Named to match the
        // API (renamed from `shiftWindow` in the 2026-08-22 audit).
        observedRpmRange: [number, number];
      };
    };
    recommendations: {
      upshiftRecommended: boolean;
      downshiftRecommended: boolean;
    };
    // 10-position F1-style light bar, rendered literally position-by-position
    // (see ShiftLights.tsx) - not a rolling history, don't aggregate this
    // into a single "active count" / "blinking" flag.
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
  carName: string | null;
  shiftRecommendation: ShiftRecommendation;
  // Raw 10-position light bar straight from the API, rendered literally by
  // ShiftLights.tsx - see that component for why this isn't reduced to an
  // active-count/color/blink summary.
  shiftLights: string[];
}
