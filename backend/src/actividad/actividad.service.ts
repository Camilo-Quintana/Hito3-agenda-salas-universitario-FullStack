import { Injectable, Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { FilterQuery, Model } from 'mongoose'
import { UsuarioSesion } from '../auth/decoradores'
import { Evento, TipoEvento } from './evento.schema'
import { ConsultaActividadDto } from './actividad.dto'

@Injectable()
export class ActividadService {
  private readonly logger = new Logger(ActividadService.name)

  constructor(@InjectModel(Evento.name) private readonly eventos: Model<Evento>) {}

  /**
   * Guarda un evento. PostgreSQL es la fuente de verdad de la operación: si MongoDB no responde,
   * la operación ya quedó hecha y solo se pierde la entrada de la bitácora (queda en el log del servidor).
   */
  async registrar(
    tipo: TipoEvento,
    entidad: { tipo: string; id: number },
    actor: UsuarioSesion,
    datos: Record<string, unknown> = {},
  ): Promise<void> {
    try {
      await this.eventos.create({ tipo, entidad, actor: { id: actor.id, nombre: actor.nombre, rol: actor.rol }, datos })
    } catch (error) {
      this.logger.warn(`No se pudo guardar el evento ${tipo} de ${entidad.tipo} ${entidad.id}: ${(error as Error).message}`)
    }
  }

  /** Línea de tiempo de una entidad (por ejemplo, todo lo que le pasó a la reserva 15) */
  historial(entidadTipo: string, entidadId: number) {
    return this.eventos
      .find({ 'entidad.tipo': entidadTipo, 'entidad.id': entidadId })
      .sort({ fecha: 1 })
      .lean()
      .exec()
  }

  /** Actividad reciente con filtros y paginación (panel de administración) */
  async listar(consulta: ConsultaActividadDto) {
    const filtro: FilterQuery<Evento> = {}
    if (consulta.tipo) filtro.tipo = consulta.tipo
    if (consulta.entidad) filtro['entidad.tipo'] = consulta.entidad
    if (consulta.actorId) filtro['actor.id'] = consulta.actorId
    if (consulta.desde || consulta.hasta) {
      filtro.fecha = {}
      if (consulta.desde) filtro.fecha.$gte = new Date(`${consulta.desde}T00:00:00`)
      if (consulta.hasta) filtro.fecha.$lte = new Date(`${consulta.hasta}T23:59:59.999`)
    }
    const limite = consulta.limite ?? 20
    const pagina = consulta.pagina ?? 1
    const [items, total] = await Promise.all([
      this.eventos
        .find(filtro)
        .sort({ fecha: -1 })
        .skip((pagina - 1) * limite)
        .limit(limite)
        .lean()
        .exec(),
      this.eventos.countDocuments(filtro),
    ])
    return { items, total, pagina, totalPaginas: Math.max(1, Math.ceil(total / limite)) }
  }

  /** Cuántos eventos de cada tipo hubo por día en un rango (agregación de MongoDB) */
  async resumenPorDia(desde: Date, hasta: Date) {
    const filas = await this.eventos.aggregate<{ _id: { dia: string; tipo: string }; cantidad: number }>([
      { $match: { fecha: { $gte: desde, $lte: hasta }, 'entidad.tipo': 'reserva' } },
      {
        $group: {
          _id: {
            dia: { $dateToString: { format: '%Y-%m-%d', date: '$fecha', timezone: process.env.TZ ?? 'America/Santiago' } },
            tipo: '$tipo',
          },
          cantidad: { $sum: 1 },
        },
      },
      { $sort: { '_id.dia': 1 } },
    ])
    return filas.map((fila) => ({ dia: fila._id.dia, tipo: fila._id.tipo, cantidad: fila.cantidad }))
  }
}
