export function httpToHttps(url: string): string {
  return url.replace('http://', 'https://');
}