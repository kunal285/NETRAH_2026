import crypto from 'crypto';

/**
 * Generates a structured S3 storage key for a given image type, robot, and extension.
 * Shared utility used by services that upload detection/telemetry images.
 *
 * @param {string} type - image type e.g. 'ambulance', 'anpr', 'face', 'uploads'
 * @param {string} robotId - robot identifier (default PRAHARI-01)
 * @param {string} extension - file extension (default jpg)
 * @returns {string} S3 key path
 */
export function generateS3Key(type, robotId = 'PRAHARI-01', extension = 'jpg') {
  const date = new Date();
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const uniqueId = crypto.randomUUID();

  const cleanType = String(type || '').trim().toLowerCase();

  if (cleanType === 'number plate' || cleanType === 'anpr') {
    return `anpr/${yyyy}/${mm}/${dd}/${uniqueId}.${extension}`;
  } else if (cleanType === 'ambulance') {
    return `ambulance/${yyyy}/${mm}/${dd}/${uniqueId}.${extension}`;
  } else if (cleanType === 'detection evidence' || cleanType === 'incident') {
    return `incidents/${yyyy}/${mm}/${dd}/${uniqueId}.${extension}`;
  } else if (cleanType === 'robot snapshot') {
    return `robot/${robotId}/snapshots/${yyyy}/${mm}/${dd}/${uniqueId}.${extension}`;
  } else if (cleanType === 'face') {
    return `faces/enrolled/${uniqueId}.${extension}`;
  } else {
    return `uploads/${yyyy}/${mm}/${dd}/${uniqueId}.${extension}`;
  }
}
