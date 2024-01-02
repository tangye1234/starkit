export function stringTobase64(str: string) {
  const bytes = Array.from(new TextEncoder().encode(str))
  return btoa(String.fromCodePoint(...bytes))
}

export function base64Tostring(base64: string) {
  const bytes = Uint8Array.from(atob(base64), c => c.codePointAt(0) || 0)
  return new TextDecoder().decode(bytes)
}

export function hexTobase64(hex: string) {
  const bytes = hex.match(/.{1,2}/g)!.map(n => parseInt(n, 16))
  return btoa(String.fromCodePoint(...bytes))
}

export function base64Tohex(base64: string) {
  const bytes = Array.from(
    Uint8Array.from(atob(base64), c => c.codePointAt(0) || 0)
  )
  return bytes.map(n => padStartZero(n.toString(16))).join('')
}

export function uuidToBase64(uuid: string) {
  return hexTobase64(uuid.replace(/-/g, ''))
}

export function base64ToUuid(base64: string) {
  return base64Tohex(base64).replace(
    /^(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})$/,
    '$1-$2-$3-$4-$5'
  )
}

function padStartZero(s: string) {
  return s.length < 2 ? `0${s}` : s
}
