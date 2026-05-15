import { Schema, model, models, type Document } from 'mongoose'

export interface MCPConfigDocument extends Document {
  userId:       Schema.Types.ObjectId
  name:         string
  url:          string
  headers:      Array<{ key: string; value: string }>
  description:  string
  enabled:      boolean
  toolCount:    number
  lastTestedAt: Date | null
  createdAt:    Date
  updatedAt:    Date
}

const MCPConfigSchema = new Schema<MCPConfigDocument>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name:        { type: String, required: true, maxlength: 80 },
    url:         { type: String, required: true, maxlength: 500 },
    headers:     [{ key: { type: String }, value: { type: String } }],
    description: { type: String, default: '', maxlength: 300 },
    enabled:     { type: Boolean, default: true },
    toolCount:   { type: Number, default: 0 },
    lastTestedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

MCPConfigSchema.index({ userId: 1, enabled: 1 })
MCPConfigSchema.index({ userId: 1, createdAt: -1 })

export const MCPConfigModel =
  models.MCPConfig || model<MCPConfigDocument>('MCPConfig', MCPConfigSchema)
