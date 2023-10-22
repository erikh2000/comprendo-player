export const MIMETYPE_AUDIO_WAV = 'audio/wav';
export const MIMETYPE_GIF = 'image/gif';
export const MIMETYPE_JPEG = 'image/jpeg';
export const MIMETYPE_OCTET_STREAM = 'application/octet-stream';
export const MIMETYPE_PLAIN_TEXT = 'text/plain';
export const MIMETYPE_PNG = 'image/png';

type MimeTypeToExtensionMap = {
  [key:string]:string
}

const MIMETYPE_TO_EXTENSION_MAP:MimeTypeToExtensionMap = {
  [MIMETYPE_AUDIO_WAV]: 'wav',
  [MIMETYPE_GIF]: 'gif',
  [MIMETYPE_JPEG]: 'jpg',
  [MIMETYPE_OCTET_STREAM]: 'bin',
  [MIMETYPE_PLAIN_TEXT]: 'txt',
  [MIMETYPE_PNG]: 'png'
};


const DEFAULT_EXTENSION = '';

export function mimeTypeToExtension(mimeType:string):string {
  return MIMETYPE_TO_EXTENSION_MAP[mimeType] ?? DEFAULT_EXTENSION;
}