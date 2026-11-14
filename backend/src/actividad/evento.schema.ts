import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose'

/**
 * Tipos de evento. Cada tipo guarda en "datos" una forma distinta (por eso conviene un modelo documental):
 * - reserva.*: estado anterior y nuevo, motivo, observación, fotografía del espacio y del solicitante
 * - espacio.* / edificio.* / equipamiento.*: los campos que cambiaron (antes y después)
 * - usuario.*: registro e inicio de sesión
 */
export const TIPOS_EVENTO = [
  'reserva.creada',
  'reserva.aprobada',
  'reserva.rechazada',
  'reserva.cancelada',
  'espacio.creado',
  'espacio.actualizado',
  'espacio.eliminado',
  'edificio.creado',
  'edificio.actualizado',
  'edificio.eliminado',
  'equipamiento.creado',
  'equipamiento.actualizado',
  'equipamiento.eliminado',
  'usuario.registrado',
  'usuario.sesion_iniciada',
] as const

export type TipoEvento = (typeof TIPOS_EVENTO)[number]

@Schema({ _id: false })
export class Actor {
  @Prop({ required: true }) id: number
  @Prop({ required: true }) nombre: string
  @Prop({ required: true }) rol: string
}

/** Un documento por cada acción relevante. Es de solo inserción: nunca se edita ni se borra. */
// minimize:false guarda "datos" aunque venga vacío, para que todos los documentos tengan la misma forma base
@Schema({ collection: 'eventos', timestamps: { createdAt: 'fecha', updatedAt: false }, versionKey: false, minimize: false })
export class Evento {
  @Prop({ required: true, enum: TIPOS_EVENTO, index: true })
  tipo: TipoEvento

  /** Entidad SQL a la que se refiere el evento: { tipo: 'reserva', id: 15 } */
  @Prop({
    type: { tipo: { type: String, required: true }, id: { type: Number, required: true } },
    _id: false,
    required: true,
  })
  entidad: { tipo: string; id: number }

  @Prop({ type: Actor, required: true })
  actor: Actor

  /** Datos propios de cada tipo de evento (esquema flexible) */
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  datos: Record<string, unknown>

  fecha: Date
}

export type EventoDocument = HydratedDocument<Evento>
export const EventoSchema = SchemaFactory.createForClass(Evento)

// Consultas frecuentes: historial de una entidad y la actividad más reciente
EventoSchema.index({ 'entidad.tipo': 1, 'entidad.id': 1, fecha: -1 })
EventoSchema.index({ fecha: -1 })
