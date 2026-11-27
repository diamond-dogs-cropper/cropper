export type OutputFormat = 'png' | 'jpg' | 'webp'
export type UploadFormat = 'svg' | 'png' | 'jpg'

export interface Padding {
  bottom: number
  left: number
  right: number
  top: number
}

export interface TemplateInput {
  background_color: string | null
  description: string
  height: number
  name: string
  output_format: OutputFormat
  padding_bottom: number
  padding_left: number
  padding_right: number
  padding_top: number
  upload_formats: UploadFormat[]
  width: number
}

export interface Logo {
  company: string
  created_at: string
  id: string
  size_bytes: number
}

export type Template = TemplateInput & {
  created_at: string
  id: string
  is_open: boolean
}

export type RecipientMark = 'done' | 'skip'

export interface Recipient {
  company: string
  created_at: string
  email: string | null
  id: string
  invited_at: string | null
  logo: Logo | null
  mark: RecipientMark | null
  note: string
}

export type RecipientChanges = Partial<Pick<Recipient, 'company' | 'email' | 'mark' | 'note'>> & {
  logo_id?: string | null
}

export type PublicTemplate = Template & {
  recipient: { company: string; logo_sent_at: string | null } | null
}
