/**
 * Types matching TimeWatch iDMS API Standard (from iDMS_API_Standard.pdf)
 */

export interface TimeWatchPunchRecord {
  UserID: string;
  PunchTime: string; // "2025-07-01T07:53:49" or "YYYY-MM-DD HH:mm:ss"
  InsertedOn?: string;
  DeviceID: string; // e.g. "TW6000PW02240232"
  DeviceName?: string; // e.g. "IKOLAHA FACTORY"
  InOutMode?: string; // "0" (In) or "1" (Out)
  VerifyMode?: string; // "Face", "Finger", "Card", etc.
}

export interface TimeWatchPunchResponse {
  Success: boolean;
  Message: string;
  Data: TimeWatchPunchRecord[] | null;
}

export interface TimeWatchDeviceRecord {
  DeviceID?: number;
  SerialNumber: string;
  DeviceName: string;
  DeviceIP: string;
  LastConnected?: string;
  LastLog?: string;
  UserCount?: number;
  FaceCount?: number;
  FingerCount?: number;
  Status: string; // "Online" | "Offline"
}

export interface TimeWatchDeviceResponse {
  Success: boolean;
  Message: string;
  Data: TimeWatchDeviceRecord[] | null;
}

export interface TimeWatchUserRecord {
  RowID?: number;
  Name?: string;
  UserID: string;
  DeviceID: string;
  TimeZoneID?: number;
  AccesstimeFrom?: string;
  AccessTimeTo?: string;
  UpdatedOn?: string;
  Card?: string;
  FaceTemplate?: string;
}

export interface NormalizedPunch {
  employeeCode: string;
  employeeName?: string;
  punchTime: Date;
  direction: "IN" | "OUT" | "AUTO";
  verifyMode: string;
  deviceSerial: string;
  deviceName: string;
  source: "API_REALTIME" | "API_POLL" | "EXCEL_IMPORT" | "MANUAL_ENTRY";
  rawPayload?: any;
}

