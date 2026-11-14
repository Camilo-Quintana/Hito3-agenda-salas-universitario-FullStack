import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { EstadoReserva, Reserva } from '../reservas/reserva.entity'
import { Espacio } from '../espacios/espacio.entity'
import { ActividadService } from '../actividad/actividad.service'
import { BLOQUES, aFecha, aTextoFecha, esFechaValida, sumarDias } from '../common/horario'

const MAX_DIAS = 366

function porcentaje(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 1000) / 10 : 0
}

@Injectable()
export class IndicadoresService {
  constructor(
    @InjectRepository(Reserva) private readonly reservas: Repository<Reserva>,
    @InjectRepository(Espacio) private readonly espacios: Repository<Espacio>,
    private readonly actividad: ActividadService,
  ) {}

  /**
   * Indicadores de utilización en un período. Por defecto, los últimos 30 días.
   * Ocupación = bloques con reserva aprobada / bloques disponibles (espacios activos x 13 bloques x días).
   */
  async calcular(desdeTexto?: string, hastaTexto?: string) {
    const hoy = aTextoFecha(new Date())
    const hasta = hastaTexto ?? hoy
    const desde = desdeTexto ?? sumarDias(hasta, -29)
    if (!esFechaValida(desde) || !esFechaValida(hasta)) throw new BadRequestException('Las fechas no son válidas.')
    if (desde > hasta) throw new BadRequestException('"desde" no puede ser posterior a "hasta".')
    const dias = Math.round((aFecha(hasta).getTime() - aFecha(desde).getTime()) / 86_400_000) + 1
    if (dias > MAX_DIAS) throw new BadRequestException(`El período puede tener como máximo ${MAX_DIAS} días.`)

    const rango = { desde, hasta }
    const aprobada = EstadoReserva.APROBADA

    // 1. Totales por estado
    const porEstadoFilas = await this.reservas
      .createQueryBuilder('r')
      .select('r.estado', 'estado')
      .addSelect('COUNT(*)::int', 'cantidad')
      .where('r.fecha BETWEEN :desde AND :hasta', rango)
      .groupBy('r.estado')
      .getRawMany<{ estado: EstadoReserva; cantidad: number }>()
    const porEstado = Object.fromEntries(Object.values(EstadoReserva).map((e) => [e, 0])) as Record<EstadoReserva, number>
    for (const fila of porEstadoFilas) porEstado[fila.estado] = fila.cantidad
    const total = Object.values(porEstado).reduce((a, b) => a + b, 0)

    // 2. Uso por espacio (todos los espacios activos, aunque no tengan reservas)
    const porEspacioFilas = await this.espacios
      .createQueryBuilder('e')
      .innerJoin('e.edificio', 'ed')
      .leftJoin(Reserva, 'r', 'r.espacio_id = e.id AND r.fecha BETWEEN :desde AND :hasta AND r.estado = :aprobada', {
        ...rango,
        aprobada,
      })
      .select(['e.id AS id', 'e.nombre AS nombre', 'e.tipo AS tipo', 'ed.codigo AS edificio'])
      .addSelect('COUNT(r.id)::int', 'reservas')
      .where('e.activo = true')
      .groupBy('e.id')
      .addGroupBy('ed.codigo')
      .orderBy('reservas', 'DESC')
      .addOrderBy('e.nombre', 'ASC')
      .getRawMany<{ id: number; nombre: string; tipo: string; edificio: string; reservas: number }>()

    const bloquesPorEspacio = BLOQUES.length * dias
    const porEspacio = porEspacioFilas.map((f) => ({ ...f, ocupacion: porcentaje(f.reservas, bloquesPorEspacio) }))

    // 3. Agrupaciones por tipo y por edificio (se calculan sobre la lista anterior)
    const agrupar = (clave: 'tipo' | 'edificio') => {
      const grupos = new Map<string, { espacios: number; reservas: number }>()
      for (const f of porEspacio) {
        const g = grupos.get(f[clave]) ?? { espacios: 0, reservas: 0 }
        g.espacios += 1
        g.reservas += f.reservas
        grupos.set(f[clave], g)
      }
      return [...grupos.entries()]
        .map(([nombre, g]) => ({ nombre, espacios: g.espacios, reservas: g.reservas, ocupacion: porcentaje(g.reservas, g.espacios * bloquesPorEspacio) }))
        .sort((a, b) => b.ocupacion - a.ocupacion)
    }

    // 4. Demanda por bloque horario
    const porBloqueFilas = await this.reservas
      .createQueryBuilder('r')
      .select('r.bloque', 'bloque')
      .addSelect('COUNT(*)::int', 'reservas')
      .where('r.fecha BETWEEN :desde AND :hasta AND r.estado = :aprobada', { ...rango, aprobada })
      .groupBy('r.bloque')
      .getRawMany<{ bloque: string; reservas: number }>()
    const porBloque = BLOQUES.map((bloque) => ({ bloque, reservas: porBloqueFilas.find((f) => f.bloque === bloque)?.reservas ?? 0 }))

    // 5. Solicitudes que esperan revisión (desde hoy en adelante, sin importar el período)
    const pendientesPorRevisar = await this.reservas
      .createQueryBuilder('r')
      .where('r.estado = :pendiente AND r.fecha >= :hoy', { pendiente: EstadoReserva.PENDIENTE, hoy })
      .getCount()

    // 6. Movimiento diario desde la bitácora de MongoDB
    const eventos = await this.actividad.resumenPorDia(aFecha(desde), new Date(aFecha(hasta).getTime() + 86_399_999))
    const movimiento = new Map<string, Record<string, number>>()
    for (const { dia, tipo, cantidad } of eventos) {
      const fila = movimiento.get(dia) ?? { creadas: 0, aprobadas: 0, rechazadas: 0, canceladas: 0 }
      const clave = { 'reserva.creada': 'creadas', 'reserva.aprobada': 'aprobadas', 'reserva.rechazada': 'rechazadas', 'reserva.cancelada': 'canceladas' }[tipo]
      if (clave) fila[clave] += cantidad
      movimiento.set(dia, fila)
    }

    const revisadas = porEstado.aprobada + porEstado.rechazada
    return {
      periodo: { desde, hasta, dias },
      totales: {
        reservas: total,
        porEstado,
        espaciosActivos: porEspacio.length,
        ocupacionGeneral: porcentaje(porEstado.aprobada, porEspacio.length * bloquesPorEspacio),
        tasaRechazo: porcentaje(porEstado.rechazada, revisadas),
        tasaCancelacion: porcentaje(porEstado.cancelada, total),
        pendientesPorRevisar,
      },
      porEspacio,
      porTipo: agrupar('tipo'),
      porEdificio: agrupar('edificio'),
      porBloque,
      movimientoDiario: [...movimiento.entries()].map(([dia, valores]) => ({ dia, ...valores })),
    }
  }
}
