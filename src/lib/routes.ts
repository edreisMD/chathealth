import { getBaseUrl } from "@/lib/api";

const BASE_URL = getBaseUrl();
console.log("Routes: Using BASE_URL:");

export const routes = {
  chat: `${BASE_URL}/api/chat`,
  messages: `${BASE_URL}/api/messages`,
  checkin: `${BASE_URL}/api/checkin`,
  transcribe: `${BASE_URL}/api/transcribe`,
  chatHistory: `${BASE_URL}/api/chat-history`,
  presignedUpload: `${BASE_URL}/api/upload/presigned`,
  generateDescriptions: `${BASE_URL}/api/generate-descriptions`,
  labResults: `${BASE_URL}/api/lab-results`,
  deleteLabResult: (labResultId: string) =>
    `${BASE_URL}/api/lab-results/${labResultId}`,
} as const;
export type RouteKey = keyof typeof routes;
