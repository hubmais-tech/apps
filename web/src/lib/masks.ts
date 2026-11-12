/** Máscaras e validações de documentos para formulários. A API valida de novo (nunca confie só no navegador). */

export const onlyDigits = (value: string) => value.replace(/\D/g, '')

export function maskCpf(value: string) {
  const d = onlyDigits(value).slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2')
}

export function maskCnpj(value: string) {
  const d = onlyDigits(value).slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function maskPhone(value: string) {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

const allSame = (digits: string) => /^(\d)\1+$/.test(digits)

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

export function ageFrom(birthDate: string) {
  const birth = new Date(`${birthDate}T00:00:00`)
  if (Number.isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1
  return age
}

export const pixKeyTypes = [
  { value: 'cpf', label: 'CPF', placeholder: '000.000.000-00' },
  { value: 'email', label: 'E-mail', placeholder: 'voce@email.com' },
  { value: 'phone', label: 'Telefone', placeholder: '(79) 99999-0000' },
  { value: 'cnpj', label: 'CNPJ', placeholder: '00.000.000/0000-00' },
  { value: 'random', label: 'Chave aleatória', placeholder: '123e4567-e89b-12d3-a456-426614174000' },
] as const

export type PixKeyType = (typeof pixKeyTypes)[number]['value']

export function isValidPixKey(type: PixKeyType, key: string) {
  const value = key.trim()
  switch (type) {
    case 'cpf':
      return isValidCpf(value)
    case 'cnpj':
      return isValidCnpj(value)
    case 'email':
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
    case 'phone': {
      const d = onlyDigits(value)
      const national = d.startsWith('55') && d.length > 11 ? d.slice(2) : d
      return national.length === 10 || national.length === 11
    }
    case 'random':
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  }
}
