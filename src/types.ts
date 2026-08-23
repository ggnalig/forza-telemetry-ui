export interface GearboxTune {
  id: string;
  carOrdinal: number;
  name: string;
  gearRatios: Record<number, number>;
  createdAt: string;
  updatedAt: string;
}

export type SessionStatus = "recording" | "completed" | "aborted";

export interface SessionSummary {
  id: string;
  buildKey: string;
  carOrdinal: number;
  maxRpm: number;
  idleRpm: number;
  startedAt: number;
  endedAt: number | null;
  frameCount: number;
  status: SessionStatus;
}

export interface SessionFrame {
  frameIndex: number;
  timestampMs: number;
  lapNumber: number | null;
  lapCurrent: number | null;
  lapLast: number | null;
  lapBest: number | null;
  raceTime: number | null;
  position: number | null;
  rpm: number;
  speed: number;
  gear: number;
  throttle: number;
  brake: number;
}

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
      // Boolean flag (1/0) in FH6's Data Out format, not a depth value.
      inPuddle: {
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
    };
    car: {
      ordinal: number;
      class: number;
      performanceIndex: number;
      drivetrain: number;
      group: number;
    };
    collision: {
      smashableVelDiff: number;
      smashableMass: number;
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
    distanceTraveled: number;
    ai: {
      normalizedDrivingLine: number;
      normalizedAIBrakeDifference: number;
    };
  };
  timestamp: number;
  // Resolved from car.ordinal against the merged Forza Motorsport + Forza
  // Horizon 6 car database (the two games share the same car-ordinal ID
  // space even though their UDP wire formats differ - the backend parses
  // FH6's own 324-byte Data Out format) - null when the ordinal isn't in
  // either source.
  carInfo: {
    carId: number;
    year: number;
    make: string;
    model: string;
    displayName: string;
  } | null;
  // The manually-entered gear-ratio tune active for this car, if any (see
  // the Tune API on port 3002) - null means no tune has been selected.
  activeTune: GearboxTune | null;
  diagnostics: {
    // Highest rpm ever observed at WOT for this car build - a passive info
    // stat for cross-checking engine.maxRpm against the actual
    // empirically-observed rev limiter.
    observedRpmCeiling: number;
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

export interface TelemetryData extends TelemetryFrame {
  rpmMax: number;
  redLine: number;
  carName: string | null;
  carOrdinal: number | null;
  activeTune: GearboxTune | null;
  // Highest rpm ever observed at WOT for this car build - see
  // TelemetryResponse.diagnostics.observedRpmCeiling.
  observedRpmCeiling: number;
}
