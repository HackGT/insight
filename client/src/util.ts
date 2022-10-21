export function formatName(name: any): string {
  if (typeof name !== 'undefined') {
    return `${name.first} ${name.last}`;
  }
  return ""
}
