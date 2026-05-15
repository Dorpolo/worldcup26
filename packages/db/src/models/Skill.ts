import { Schema, model, models, type Document } from 'mongoose'

export type SkillType = 'instruction' | 'tool'

export interface SkillDocument extends Document {
  userId:      Schema.Types.ObjectId
  name:        string
  description: string
  type:        SkillType
  prompt:      string
  enabled:     boolean
  tags:        string[]
  icon:        string
  createdAt:   Date
  updatedAt:   Date
}

const SkillSchema = new Schema<SkillDocument>(
  {
    userId:      { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name:        { type: String, required: true, maxlength: 50 },
    description: { type: String, required: true, maxlength: 300 },
    type:        { type: String, enum: ['instruction', 'tool'], required: true },
    prompt:      { type: String, required: true, maxlength: 4000 },
    enabled:     { type: Boolean, default: true },
    tags:        [{ type: String }],
    icon:        { type: String, default: '⚡', maxlength: 8 },
  },
  { timestamps: true }
)

SkillSchema.index({ userId: 1, enabled: 1 })
SkillSchema.index({ userId: 1, createdAt: -1 })

export const SkillModel =
  models.Skill || model<SkillDocument>('Skill', SkillSchema)
