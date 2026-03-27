import crypto from "node:crypto";
import { encryptData, decryptData } from "./encryption.js";
import { rulesEngine, EvaluationContext, Rule } from "./rulesEngine.js";

/**
 * IoT Integration Service
 * Handles device registration, data collection, encryption, and rule evaluation
 */

export interface IoTDeviceConfig {
  deviceId: string;
  deviceType: "gps_tracker" | "temp_sensor" | "humidity_sensor" | "impact_sensor" | "smart_lock";
  secureToken: string;
  minTemp?: number;
  maxTemp?: number;
  targetLocation?: {
    latitude: number;
    longitude: number;
    radius: number;
  };
  impactThreshold?: number; // in G-force
  lockStatus?: "locked" | "unlocked";
}

export interface IoTReading {
  deviceId: string;
  timestamp: number;
  temperature?: number;
  humidity?: number;
  latitude?: number;
  longitude?: number;
  impactForce?: number;
  lockStatus?: "locked" | "unlocked";
  batteryLevel?: number;
  signalStrength?: number;
}

export interface IoTAlert {
  id: string;
  deviceId: string;
  type: "temperature_anomaly" | "location_deviation" | "impact_detected" | "tampering" | "low_battery";
  severity: "low" | "medium" | "high" | "critical";
  message: string;
  timestamp: number;
  reading: IoTReading;
}

class IoTIntegrationService {
  private devices: Map<string, IoTDeviceConfig> = new Map();
  private readings: Map<string, IoTReading[]> = new Map();
  private encryptedReadings: Map<string, string[]> = new Map();
  private alerts: Map<string, IoTAlert[]> = new Map();
  private rules: Map<string, Rule[]> = new Map(); // escrowId -> rules

  /**
   * Register a new IoT device
   */
  registerDevice(config: IoTDeviceConfig): void {
    this.devices.set(config.deviceId, config);
    this.readings.set(config.deviceId, []);
    this.encryptedReadings.set(config.deviceId, []);
    this.alerts.set(config.deviceId, []);
    // Registration is in-memory for this runtime.
  }

  /**
   * Authenticate device using secure token
   */
  authenticateDevice(deviceId: string, token: string): boolean {
    const device = this.devices.get(deviceId);
    if (!device) {
      return false;
    }

    const isValid = this.constantTimeEquals(device.secureToken, token);
    return isValid;
  }

  /**
   * Process and store IoT reading
   */
  async processReading(
    deviceId: string,
    reading: Omit<IoTReading, "deviceId" | "timestamp">
  ): Promise<{ success: boolean; alerts: IoTAlert[] }> {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new Error(`Device not found: ${deviceId}`);
    }

    const fullReading: IoTReading = {
      ...reading,
      deviceId,
      timestamp: Date.now(),
    };

    // Encrypt sensitive data before storing
    const encryptedReading = this.encryptSensitiveData(fullReading);

    // Store reading
    const deviceReadings = this.readings.get(deviceId) || [];
    deviceReadings.push(fullReading);
    this.readings.set(deviceId, deviceReadings);
    const encryptedReadings = this.encryptedReadings.get(deviceId) || [];
    encryptedReadings.push(encryptedReading);
    this.encryptedReadings.set(deviceId, encryptedReadings);

    // Check for anomalies
    const alerts = await this.checkAnomalies(device, fullReading);

    // Store alerts
    if (alerts.length > 0) {
      const deviceAlerts = this.alerts.get(deviceId) || [];
      deviceAlerts.push(...alerts);
      this.alerts.set(deviceId, deviceAlerts);
    }

    return { success: true, alerts };
  }

  /**
   * Check for anomalies in IoT reading
   */
  private async checkAnomalies(
    device: IoTDeviceConfig,
    reading: IoTReading
  ): Promise<IoTAlert[]> {
    const alerts: IoTAlert[] = [];

    // Temperature anomaly
    if (reading.temperature !== undefined) {
      if (device.minTemp && reading.temperature < device.minTemp) {
        alerts.push({
          id: `alert_${Date.now()}_1`,
          deviceId: device.deviceId,
          type: "temperature_anomaly",
          severity: "high",
          message: `Temperature below minimum: ${reading.temperature}°C (min: ${device.minTemp}°C)`,
          timestamp: reading.timestamp,
          reading,
        });
      }

      if (device.maxTemp && reading.temperature > device.maxTemp) {
        alerts.push({
          id: `alert_${Date.now()}_2`,
          deviceId: device.deviceId,
          type: "temperature_anomaly",
          severity: "high",
          message: `Temperature above maximum: ${reading.temperature}°C (max: ${device.maxTemp}°C)`,
          timestamp: reading.timestamp,
          reading,
        });
      }
    }

    // Location deviation
    if (
      reading.latitude !== undefined &&
      reading.longitude !== undefined &&
      device.targetLocation
    ) {
      const distance = this.calculateDistance(
        reading.latitude,
        reading.longitude,
        device.targetLocation.latitude,
        device.targetLocation.longitude
      );

      if (distance > device.targetLocation.radius) {
        alerts.push({
          id: `alert_${Date.now()}_3`,
          deviceId: device.deviceId,
          type: "location_deviation",
          severity: "medium",
          message: `Location outside target area: ${distance.toFixed(0)}m away (radius: ${device.targetLocation.radius}m)`,
          timestamp: reading.timestamp,
          reading,
        });
      }
    }

    // Impact detection
    if (reading.impactForce !== undefined && device.impactThreshold) {
      if (reading.impactForce > device.impactThreshold) {
        alerts.push({
          id: `alert_${Date.now()}_4`,
          deviceId: device.deviceId,
          type: "impact_detected",
          severity: "critical",
          message: `Impact detected: ${reading.impactForce}G (threshold: ${device.impactThreshold}G)`,
          timestamp: reading.timestamp,
          reading,
        });
      }
    }

    // Low battery
    if (reading.batteryLevel !== undefined && reading.batteryLevel < 20) {
      alerts.push({
        id: `alert_${Date.now()}_5`,
        deviceId: device.deviceId,
        type: "low_battery",
        severity: "low",
        message: `Low battery level: ${reading.batteryLevel}%`,
        timestamp: reading.timestamp,
        reading,
      });
    }

    return alerts;
  }

  /**
   * Encrypt sensitive IoT data
   */
  private encryptSensitiveData(reading: IoTReading): string {
    const sensitiveFields = {
      latitude: reading.latitude,
      longitude: reading.longitude,
      temperature: reading.temperature,
    };

    return encryptData(JSON.stringify(sensitiveFields));
  }

  /**
   * Decrypt sensitive IoT data
   */
  decryptSensitiveData(encryptedData: string): Partial<IoTReading> {
    try {
      const decrypted = decryptData(encryptedData);
      return JSON.parse(decrypted);
    } catch (error) {
      return {};
    }
  }

  /**
   * Register rules for an escrow
   */
  registerRules(escrowId: string, rules: Rule[]): void {
    this.rules.set(escrowId, rules);
    // Rule registration is in-memory for this runtime.
  }

  /**
   * Evaluate rules against IoT reading
   */
  evaluateRules(escrowId: string, reading: IoTReading): Rule[] {
    const rules = this.rules.get(escrowId) || [];

    const context: EvaluationContext = {
      temperature: reading.temperature,
      humidity: reading.humidity,
      location: reading.latitude !== undefined && reading.longitude !== undefined ? {
        latitude: reading.latitude,
        longitude: reading.longitude,
      } : undefined,
      status: reading.lockStatus,
      timestamp: reading.timestamp,
    };

    const matchedRules = rulesEngine.evaluate(context, rules);
    return matchedRules;
  }

  /**
   * Get latest reading for a device
   */
  getLatestReading(deviceId: string): IoTReading | undefined {
    const readings = this.readings.get(deviceId);
    return readings?.[readings.length - 1];
  }

  /**
   * Get readings within time range
   */
  getReadingsInRange(
    deviceId: string,
    startTime: number,
    endTime: number
  ): IoTReading[] {
    const readings = this.readings.get(deviceId) || [];
    return readings.filter(
      (r) => r.timestamp >= startTime && r.timestamp <= endTime
    );
  }

  /**
   * Get alerts for a device
   */
  getAlerts(deviceId: string, limit: number = 100): IoTAlert[] {
    const alerts = this.alerts.get(deviceId) || [];
    return alerts.slice(-limit);
  }

  /**
   * Get critical alerts
   */
  getCriticalAlerts(deviceId: string): IoTAlert[] {
    const alerts = this.alerts.get(deviceId) || [];
    return alerts.filter((a) => a.severity === "critical");
  }


  private constantTimeEquals(expectedValue: string, providedValue: string): boolean {
    const expected = Buffer.from(String(expectedValue));
    const actual = Buffer.from(String(providedValue));
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  }

  /**
   * Calculate distance between two coordinates
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get device statistics
   */
  getDeviceStats(deviceId: string): {
    totalReadings: number;
    totalAlerts: number;
    criticalAlerts: number;
    lastReading?: IoTReading;
    averageTemperature?: number;
  } {
    const readings = this.readings.get(deviceId) || [];
    const alerts = this.alerts.get(deviceId) || [];

    const temperatures = readings
      .filter((r) => r.temperature !== undefined)
      .map((r) => r.temperature as number);

    return {
      totalReadings: readings.length,
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter((a) => a.severity === "critical").length,
      lastReading: readings[readings.length - 1],
      averageTemperature:
        temperatures.length > 0
          ? temperatures.reduce((a, b) => a + b) / temperatures.length
          : undefined,
    };
  }

  /**
   * Clear old readings (for memory management)
   */
  clearOldReadings(deviceId: string, olderThanMs: number): number {
    const readings = this.readings.get(deviceId) || [];
    const cutoffTime = Date.now() - olderThanMs;

    const filtered = readings.filter((r) => r.timestamp > cutoffTime);
    const removed = readings.length - filtered.length;

    this.readings.set(deviceId, filtered);
    return removed;
  }

  /**
   * Export readings for analysis
   */
  exportReadings(deviceId: string): IoTReading[] {
    return this.readings.get(deviceId) || [];
  }

  /**
   * Get all devices
   */
  getAllDevices(): IoTDeviceConfig[] {
    return Array.from(this.devices.values());
  }

  /**
   * Remove device
   */
  removeDevice(deviceId: string): boolean {
    const removed = this.devices.delete(deviceId);
    this.readings.delete(deviceId);
    this.encryptedReadings.delete(deviceId);
    this.alerts.delete(deviceId);
    return removed;
  }
}

export const iotIntegrationService = new IoTIntegrationService();
