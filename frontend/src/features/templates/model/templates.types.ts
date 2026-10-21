export type OutputFormat = 'png' | 'jpg' | 'webp'
export type UploadFormat = 'svg' | 'png' | 'jpg'

export type Padding = {
  bottom: number
  left: number
  right: number
  top: number
}

export type TemplateInput = {
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

export type Template = TemplateInput & {
  created_at: string
  id: string
  is_open: boolean
}
