export function formatName(name: any): string {
  return `${name.preferred || name.first} ${name.last}`;
}
