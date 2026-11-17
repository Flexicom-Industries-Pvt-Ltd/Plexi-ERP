import {
  TimeWatchPunchRecord,
  TimeWatchPunchResponse,
  TimeWatchDeviceRecord,
  TimeWatchDeviceResponse,
  NormalizedPunch,
} from "./timewatch-types";

const DEFAULT_TIMEWATCH_URL =
  process.env.TIMEWATCH_API_URL || "http://192.168.1.66:8001/TimeWatchAPI";
const DEFAULT_TIMEWATCH_KEY =
  process.env.TIMEWATCH_API_KEY || "T!meW@tch#123@";

/**
 * Normalizes different date string variations into standard UTC Date objects.
 */
export function parseTimeWatchTimestamp(raw: string): Date {
  if (!raw) return new Date(NaN);
  const trimmed = raw.trim();

  // Try standard ISO
  if (trimmed.includes("T")) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  // Handle "YYYY-MM-DD HH:mm:ss" or "YYYY-MM-DD HH:mm"
  if (trimmed.includes(" ") && trimmed.includes("-")) {
    const [datePart, timePart] = trimmed.split(" ");
    const [year, month, day] = datePart.split("-").map(Number);
    const timeSegments = (timePart || "").split(":").map(Number);
    const hour = timeSegments[0] || 0;
    const min = timeSegments[1] || 0;
    const sec = timeSegments[2] || 0;
    if (isNaN(year) || isNaN(month) || isNaN(day)) return new Date(NaN);
    return new Date(Date.UTC(year, month - 1, day, hour - 5, min - 30, sec)); // IST -> UTC approx
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? new Date(NaN) : d;
}

/**
 * TimeWatch iDMS Client
 */
export class TimeWatchClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl?: string, apiKey?: string) {
    this.baseUrl = (baseUrl || DEFAULT_TIMEWATCH_URL).replace(/\/$/, "");
    this.apiKey = apiKey || DEFAULT_TIMEWATCH_KEY;
  }

  /**
   * Fetch Punch Attendance Data (GetPunchData)
   */
  async getPunchData(params: {
    fromDate: string;
    toDate: string;
    deviceId?: string;
    userId?: string;
  }): Promise<{ success: boolean; data: NormalizedPunch[]; isMock: boolean; message: string }> {
    const endpoint = `${this.baseUrl}/GetPunchData`;
    const payload = {
      FromDate: params.fromDate,
      ToDate: params.toDate,
      DeviceID: params.deviceId || "",
      UserID: params.userId || "",
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500); // 3.5s timeout

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": this.apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const json: TimeWatchPunchResponse = await res.json();
        if (json.Success && Array.isArray(json.Data)) {
          const normalized = json.Data.map((rec) => this.normalizePunch(rec, "API_POLL"));
          return {
            success: true,
            data: normalized,
            isMock: false,
            message: json.Message || "Data fetched successfully from TimeWatch",
          };
        }
      }
    } catch {
      // Unreachable (e.g. factory LAN not routed to current environment)
    }

    // Fallback to factory realistic simulator
    const mockPunches = this.getFactoryMockPunches(params.fromDate, params.toDate);
    return {
      success: true,
      data: mockPunches,
      isMock: true,
      message: "TimeWatch live device offline; returned simulated factory punches.",
    };
  }

  /**
   * Fetch Biometric Device List (GetDeviceList)
   */
  async getDeviceList(serialNumber?: string): Promise<{
    success: boolean;
    devices: TimeWatchDeviceRecord[];
    isMock: boolean;
  }> {
    const endpoint = `${this.baseUrl}/GetDeviceList`;
    const payload = {
      SerialNumber: serialNumber || "",
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Api-Key": this.apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        const json: TimeWatchDeviceResponse = await res.json();
        if (json.Success && Array.isArray(json.Data)) {
          return { success: true, devices: json.Data, isMock: false };
        }
      }
    } catch {
      // Offline fallback
    }

    return {
      success: true,
      devices: [
        {
          DeviceID: 1,
          SerialNumber: "TW6000PW02240232",
          DeviceName: "IKOLAHA FACTORY - Gate 1",
          DeviceIP: "117.243.207.179",
          LastConnected: new Date().toISOString(),
          LastLog: new Date().toISOString(),
          UserCount: 68,
          FaceCount: 68,
          FingerCount: 0,
          Status: "Online",
        },
        {
          DeviceID: 2,
          SerialNumber: "TW6000PW02240183",
          DeviceName: "IKOLAHA FACTORY - Loom Shed",
          DeviceIP: "117.243.207.180",
          LastConnected: new Date().toISOString(),
          LastLog: new Date().toISOString(),
          UserCount: 68,
          FaceCount: 68,
          FingerCount: 0,
          Status: "Online",
        },
      ],
      isMock: true,
    };
  }

  /**
   * Helper to normalize raw TimeWatch punch
   */
  normalizePunch(
    rec: TimeWatchPunchRecord,
    source: NormalizedPunch["source"] = "API_REALTIME"
  ): NormalizedPunch {
    const rawMode = String(rec.InOutMode || "0").trim();
    // In TimeWatch: "0" = IN, "1" = OUT
    const direction: "IN" | "OUT" | "AUTO" =
      rawMode === "0" ? "IN" : rawMode === "1" ? "OUT" : "AUTO";

    return {
      employeeCode: String(rec.UserID || "").trim(),
      punchTime: parseTimeWatchTimestamp(rec.PunchTime),
      direction,
      verifyMode: rec.VerifyMode || "Face",
      deviceSerial: rec.DeviceID || "TW6000PW02240232",
      deviceName: rec.DeviceName || "IKOLAHA FACTORY",
      source,
      rawPayload: rec,
    };
  }

  /**
   * Generates realistic simulated factory punches for test environments
   */
  private getFactoryMockPunches(fromDate: string, _toDate: string): NormalizedPunch[] {
    const sampleEmployees = [
      { code: "369839", name: "Ramesh Sharma", dept: "LOOM" },
      { code: "F100523", name: "Ajitesh Singh", dept: "TAPE_PLANT" },
      { code: "9004", name: "Suraj Verma", dept: "LAMINATION" },
      { code: "G109608", name: "Manoj Kumar", dept: "PRINTING" },
      { code: "OP-LM-01", name: "Dinesh Patel", dept: "LOOM" },
      { code: "OP-LM-02", name: "Mukesh Yadav", dept: "LOOM" },
      { code: "SUP-01", name: "Harish Rawat", dept: "LOOM" },
      { code: "SEC-01", name: "Baldev Singh", dept: "SECURITY" },
    ];

    const results: NormalizedPunch[] = [];
    const targetDate = fromDate || new Date().toISOString().split("T")[0];

    sampleEmployees.forEach((emp, idx) => {
      // Shift A morning punch (around 07:45 - 08:10 AM)
      const inMinutes = 45 + (idx * 3) % 25; // 07:45 to 08:10
      const inTime = new Date(`${targetDate}T07:${String(inMinutes).padStart(2, "0")}:00+05:30`);
      
      results.push({
        employeeCode: emp.code,
        employeeName: emp.name,
        punchTime: inTime,
        direction: "IN",
        verifyMode: idx % 2 === 0 ? "Face" : "Finger",
        deviceSerial: "TW6000PW02240232",
        deviceName: "IKOLAHA FACTORY - Gate 1",
        source: "API_REALTIME",
        rawPayload: { simulated: true, emp },
      });

      // Shift A evening punch (around 20:05 - 20:20 PM)
      const outMinutes = 5 + (idx * 2) % 15;
      const outTime = new Date(`${targetDate}T20:${String(outMinutes).padStart(2, "0")}:00+05:30`);
      results.push({
        employeeCode: emp.code,
        employeeName: emp.name,
        punchTime: outTime,
        direction: "OUT",
        verifyMode: "Face",
        deviceSerial: "TW6000PW02240232",
        deviceName: "IKOLAHA FACTORY - Gate 1",
        source: "API_REALTIME",
        rawPayload: { simulated: true, emp },
      });
    });

    return results;
  }
}

export const timewatchClient = new TimeWatchClient();
