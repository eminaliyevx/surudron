#include <ArduinoJson.h>

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const int COPTER_COUNT = 3;
const double BASE_LAT = 47.3977;
const double BASE_LON = 8.0478;
const double ORBIT_RADIUS_DEG = 0.0005;
const double ORBIT_OMEGA = 0.08;
const double ORBIT_RADIUS_M = ORBIT_RADIUS_DEG * 111320.0;
const int TICK_MS = 500;

const double GOTO_SPEED_MS = 8.0;
const double ARRIVED_THRESHOLD_M = 1.5;
const double TAKEOFF_SPEED_MS = 3.0;
const double LAND_SPEED_MS = 2.0;
const double DEFAULT_TAKEOFF_ALT = 30.0;

enum CopterMode {
  MODE_ORBIT = 0,
  MODE_GOTO = 1,
  MODE_TAKEOFF = 2,
  MODE_LAND = 3
};

struct Target {
  bool active;
  double lat;
  double lon;
};

struct SerialCopterState {
  String id;
  String name;
  double phase;
  double battery;
  CopterMode mode;
  double lat;
  double lon;
  double alt;
  bool armed;
  Target target;
  double targetAlt;
};

SerialCopterState copters[COPTER_COUNT];
unsigned long startTime;

// Helper function to generate a random float between min and max
float randomFloat(float min, float max) {
  return min + (random(0, 1000) / 1000.0) * (max - min);
}

void setup() {
  Serial.begin(115200);
  while (!Serial) {
    delay(10);
  }
  randomSeed(analogRead(0));
  startTime = millis();

  // Initialize drones
  for (int i = 0; i < COPTER_COUNT; i++) {
    double phase = (i * 2.0 * PI) / COPTER_COUNT;
    copters[i].id = "drone-" + String(i + 1);
    copters[i].name = "drone-" + String(i + 1);
    copters[i].phase = phase;
    copters[i].battery = 100.0 - i * 5.0;
    copters[i].mode = MODE_ORBIT;
    copters[i].lat = BASE_LAT + ORBIT_RADIUS_DEG * cos(phase);
    copters[i].lon = BASE_LON + ORBIT_RADIUS_DEG * sin(phase);
    copters[i].alt = DEFAULT_TAKEOFF_ALT;
    copters[i].armed = true;
    copters[i].target.active = false;
    copters[i].targetAlt = DEFAULT_TAKEOFF_ALT;
  }
}

void loop() {
  unsigned long now = millis();
  double tSec = (now - startTime) / 1000.0;
  double dt = TICK_MS / 1000.0;

  // ---------------------------------------------------------------------------
  // 1. Read Incoming Commands from Serial
  // ---------------------------------------------------------------------------
  while (Serial.available() > 0) {
    String cmdStr = Serial.readStringUntil('\n');
    StaticJsonDocument<256> cmdDoc;
    
    DeserializationError error = deserializeJson(cmdDoc, cmdStr);
    if (!error) {
      String type = cmdDoc["type"].as<String>();
      String id = cmdDoc["id"].as<String>();

      for (int i = 0; i < COPTER_COUNT; i++) {
        if (copters[i].id == id) {
          if (type == "goto") {
            copters[i].mode = MODE_GOTO;
            copters[i].target.active = true;
            copters[i].target.lat = cmdDoc["lat"].as<double>();
            copters[i].target.lon = cmdDoc["lon"].as<double>();
          } 
          else if (type == "takeoff") {
            copters[i].armed = true;
            copters[i].alt = 0;
            copters[i].targetAlt = cmdDoc["altitude"].isNull() ? DEFAULT_TAKEOFF_ALT : cmdDoc["altitude"].as<double>();
            copters[i].mode = MODE_TAKEOFF;
          } 
          else if (type == "land") {
            copters[i].mode = MODE_LAND;
          }
          break; // Stop searching once we found the target drone
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Generate Next Frame (Flight State Machine)
  // ---------------------------------------------------------------------------
  DynamicJsonDocument doc(4096);
  JsonArray snapshot = doc.to<JsonArray>();

  for (int i = 0; i < COPTER_COUNT; i++) {
    SerialCopterState& c = copters[i];
    JsonObject copterJson = snapshot.createNestedObject();

    double vx = 0, vy = 0, vz = 0, roll = 0;
    int flightMode = 0;

    switch (c.mode) {
      case MODE_ORBIT: {
        double angle = c.phase + ORBIT_OMEGA * tSec;
        double cosA = cos(angle);
        double sinA = sin(angle);

        c.lat = BASE_LAT + ORBIT_RADIUS_DEG * cosA;
        c.lon = BASE_LON + ORBIT_RADIUS_DEG * sinA;
        c.alt = 30.0 + 5.0 * sin(tSec * 0.1 + c.phase);
        c.armed = true;

        vx = -ORBIT_RADIUS_M * ORBIT_OMEGA * sinA;
        vy = ORBIT_RADIUS_M * ORBIT_OMEGA * cosA;
        vz = 0.3 * sin(tSec * 0.15 + c.phase);
        roll = 0.04 * sin(angle + PI);
        flightMode = 3; // AUTO
        break;
      }
      
      case MODE_GOTO: {
        if (c.target.active) {
          double dNorth = (c.target.lat - c.lat) * 111320.0;
          double dEast = (c.target.lon - c.lon) * 111320.0 * cos(c.lat * PI / 180.0);
          double dist = sqrt(dNorth * dNorth + dEast * dEast);

          if (dist < ARRIVED_THRESHOLD_M) {
            c.lat = c.target.lat;
            c.lon = c.target.lon;
            c.target.active = false;
          } else {
            double speed = min(GOTO_SPEED_MS, dist / dt);
            vx = speed * (dNorth / dist);
            vy = speed * (dEast / dist);
            c.lat += (vx * dt) / 111320.0;
            c.lon += (vy * dt) / (111320.0 * cos(c.lat * PI / 180.0));
          }
        }
        
        c.alt = 30.0 + 5.0 * sin(tSec * 0.1 + c.phase);
        vz = 0.3 * sin(tSec * 0.15 + c.phase);
        flightMode = 4; // GUIDED
        break;
      }
      
      case MODE_TAKEOFF: {
        if (c.alt < c.targetAlt) {
          c.alt = min(c.alt + TAKEOFF_SPEED_MS * dt, c.targetAlt);
          vz = TAKEOFF_SPEED_MS;
        } else {
          c.alt = c.targetAlt;
          c.mode = MODE_ORBIT;
          vz = 0;
        }
        flightMode = 4; // GUIDED
        break;
      }
      
      case MODE_LAND: {
        if (c.alt > 0) {
          c.alt = max(c.alt - LAND_SPEED_MS * dt, 0.0);
          vz = -LAND_SPEED_MS;
        } else {
          c.alt = 0;
          c.armed = false;
          vz = 0;
        }
        flightMode = 9; // LAND
        break;
      }
    }

    // Kinematics math
    double groundSpeed = sqrt(vx * vx + vy * vy);
    bool isMoving = groundSpeed > 0.1;
    double heading = 0;
    double yaw = 0;
    
    if (isMoving) {
      yaw = atan2(vy, vx);
      heading = (yaw * 180.0) / PI + 360.0;
      heading = fmod(heading, 360.0);
    }

    c.battery = max(0.0, c.battery - 1.0 / 600.0);

    double wpDist = 0;
    if (c.target.active) {
      double dN = (c.target.lat - c.lat) * 111320.0;
      double dE = (c.target.lon - c.lon) * 111320.0 * cos(c.lat * PI / 180.0);
      wpDist = sqrt(dN * dN + dE * dE);
    }

    // Map exact properties to Zod schema
    copterJson["id"] = c.id;
    copterJson["name"] = c.name;
    
    // Position
    copterJson["latitude"] = c.lat;
    copterJson["longitude"] = c.lon;
    copterJson["altitude"] = c.alt + 450.0;
    copterJson["relativeAltitude"] = c.alt;
    
    // Velocity
    copterJson["vx"] = vx;
    copterJson["vy"] = vy;
    copterJson["vz"] = vz;
    
    // Orientation
    copterJson["roll"] = roll;
    copterJson["pitch"] = isMoving ? 0.05 : 0.02;
    copterJson["yaw"] = yaw;
    
    // Flight state
    copterJson["heading"] = heading;
    copterJson["groundSpeed"] = groundSpeed;
    copterJson["airspeed"] = groundSpeed + 0.3;
    copterJson["climb"] = vz;
    copterJson["throttle"] = c.armed ? 52 : 0;
    
    // Autopilot
    copterJson["armed"] = c.armed;
    copterJson["flightMode"] = flightMode;
    copterJson["systemStatus"] = c.armed ? 4 : 3;
    
    // Battery
    copterJson["battery"] = round(c.battery);
    copterJson["batteryVoltage"] = 11.1 + (c.battery / 100.0) * 1.1;
    copterJson["batteryCurrent"] = c.armed ? randomFloat(8.5, 9.0) : 0.1;
    
    // GPS
    copterJson["gpsFix"] = 3;
    copterJson["gpsSatellites"] = 12;
    copterJson["gpsHdop"] = 1.2;
    
    // Nav
    copterJson["wpDist"] = wpDist;
    copterJson["wpSeq"] = 0;
    
    // Health
    copterJson["cpuLoad"] = randomFloat(15.0, 20.0);
    copterJson["ekfFlags"] = 63;
    copterJson["vibrationX"] = randomFloat(0.08, 0.12);
    copterJson["vibrationY"] = randomFloat(0.08, 0.12);
    copterJson["vibrationZ"] = randomFloat(0.12, 0.18);
    
    // Mock timestamp
    copterJson["lastUpdate"] = now;
  }

  // ---------------------------------------------------------------------------
  // 3. Transmit Frame over Serial
  // ---------------------------------------------------------------------------
  serializeJson(doc, Serial);
  Serial.println();

  delay(TICK_MS);
}
