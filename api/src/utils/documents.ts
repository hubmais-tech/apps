/** Validação e máscara de documentos brasileiros. Sem consulta externa: só dígitos verificadores. */

export const onlyDigits = (value: string) => value.replace(/\D/g, '')

function allSame(digits: string) {
  return /^(\d)\1+$/.test(digits)
}

export function isValidCpf(value: string) {
  const cpf = onlyDigits(value)
  if (cpf.length !== 11 || allSame(cpf)) return false

  const check = (length: number) => {
    let sum = 0
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }
  return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10])
}

export function isValidCnpj(value: string) {
  const cnpj = onlyDigits(value)
  if (cnpj.length !== 14 || allSame(cnpj)) return false

  const check = (length: number) => {
    const weights = length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < length; i++) sum += Number(cnpj[i]) * weights[i]!
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }
  return check(12) === Number(cnpj[12]) && check(13) === Number(cnpj[13])
}

/** `***.456.789-**`: mostra só o miolo do CPF. */
export function maskCpf(value: string) {
  const cpf = onlyDigits(value)
  return `***.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`
}

export function formatCnpj(value: string) {
  const c = onlyDigits(value)
  return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12, 14)}`
}

export const pixKeyTypes = ['cpf', 'cnpj', 'email', 'phone', 'random'] as const
export type PixKeyType = (typeof pixKeyTypes)[number]

/** Confere o formato da chave Pix conforme o tipo e devolve a chave normalizada, ou null se inválida. */
export function normalizePixKey(type: PixKeyType, key: string): string | null {
  const value = key.trim()
  switch (type) {
    case 'cpf':
      return isValidCpf(value) ? onlyDigits(value) : null
    case 'cnpj':
      return isValidCnpj(value) ? onlyDigits(value) : null
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value.toLowerCase() : null
    case 'phone': {
      const digits = onlyDigits(value)
      const national = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits
      return national.length === 10 || national.length === 11 ? `+55${national}` : null
    }
    case 'random':
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value.toLowerCase() : null
  }
}

/** Esconde a chave Pix, deixando só o fim: `…4567`. */
export function maskPixKey(type: PixKeyType, key: string) {
  if (type === 'email') {
    const [user = '', domain = ''] = key.split('@')
    return `${user.slice(0, 2)}***@${domain}`
  }
  return `…${key.slice(-4)}`
}
