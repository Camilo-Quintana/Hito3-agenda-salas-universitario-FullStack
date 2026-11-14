import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, Repository } from 'typeorm'
import { Espacio } from './espacio.entity'
import { EspacioEquipamiento } from './espacio-equipamiento.entity'
import { Edificio } from '../edificios/edificio.entity'
import { Equipamiento } from '../equipamiento/equipamiento.entity'
import { ESTADOS_ACTIVOS, Reserva } from '../reservas/reserva.entity'
import { ActualizarEspacioDto, ConsultaEspaciosDto, CrearEspacioDto, EquipoAsignadoDto } from './espacio.dto'
import { ActividadService } from '../actividad/actividad.service'
import { UsuarioSesion } from '../auth/decoradores'
import { Rol } from '../usuarios/usuario.entity'
import { BLOQUES, aTextoFecha, esFechaValida } from '../common/horario'
import { contarBloquesLibres, estadoBloque } from '../reservas/reglas-reserva'
import { detectarCambios } from '../common/cambios'

/** Forma en que la API entrega un espacio */
export interface EspacioRespuesta {
  id: number
  nombre: string
  tipo: string
  categoria: string | null
  piso: number
  capacidad: number
  requiereAprobacion: boolean
  activo: boolean
  edificio: { id: number; codigo: string; nombre: string }
  equipamiento: { id: number; nombre: string; cantidad: number }[]
  bloquesLibres?: number
}

@Injectable()
export class EspaciosService {
  constructor(
    @InjectRepository(Espacio) private readonly espacios: Repository<Espacio>,
    @InjectRepository(Edificio) private readonly edificios: Repository<Edificio>,
    @InjectRepository(Equipamiento) private readonly equipamiento: Repository<Equipamiento>,
    @InjectRepository(Reserva) private readonly reservas: Repository<Reserva>,
    private readonly dataSource: DataSource,
    private readonly actividad: ActividadService,
  ) {}

  async listar(consulta: ConsultaEspaciosDto, usuario?: UsuarioSesion): Promise<EspacioRespuesta[]> {
    const qb = this.espacios
      .createQueryBuilder('e')
      .innerJoinAndSelect('e.edificio', 'ed')
      .leftJoinAndSelect('e.equipamiento', 'ee')
      .leftJoinAndSelect('ee.equipamiento', 'eq')
      .orderBy('ed.codigo', 'ASC')
      .addOrderBy('e.piso', 'ASC')
      .addOrderBy('e.nombre', 'ASC')

    const verInactivos = consulta.incluirInactivos && usuario?.rol === Rol.ADMIN
    if (!verInactivos) qb.andWhere('e.activo = true')
    if (consulta.tipo) qb.andWhere('e.tipo = :tipo', { tipo: consulta.tipo })
    if (consulta.edificioId) qb.andWhere('e.edificio_id = :edificioId', { edificioId: consulta.edificioId })
    if (consulta.capacidadMin) qb.andWhere('e.capacidad >= :capacidadMin', { capacidadMin: consulta.capacidadMin })
    if (consulta.q) {
      // busca en el nombre o en el nombre de algún equipo del espacio
      qb.andWhere(
        `(e.nombre ILIKE :texto OR EXISTS (
          SELECT 1 FROM espacio_equipamiento x JOIN equipamiento y ON y.id = x.equipamiento_id
          WHERE x.espacio_id = e.id AND y.nombre ILIKE :texto))`,
        { texto: `%${consulta.q.replace(/[%_\\]/g, '\\$&')}%` },
      )
    }

    const lista = (await qb.getMany()).map(aRespuesta)
    if (!consulta.fecha) return lista
    if (!esFechaValida(consulta.fecha)) throw new BadRequestException('La fecha no es válida.')

    // Bloques ocupados de ese día para todos los espacios, en una sola consulta
    const ocupadas = await this.reservas.find({
      select: { espacioId: true, bloque: true },
      where: { fecha: consulta.fecha, estado: In(ESTADOS_ACTIVOS) },
    })
    const porEspacio = new Map<number, Set<string>>()
    for (const { espacioId, bloque } of ocupadas) {
      if (!porEspacio.has(espacioId)) porEspacio.set(espacioId, new Set())
      porEspacio.get(espacioId)!.add(bloque)
    }
    const ahora = new Date()
    return lista.map((espacio) => ({
      ...espacio,
      bloquesLibres: contarBloquesLibres(porEspacio.get(espacio.id) ?? new Set(), consulta.fecha!, ahora),
    }))
  }

  async obtener(id: number, usuario?: UsuarioSesion): Promise<EspacioRespuesta> {
    const espacio = await this.buscarEntidad(id)
    if (!espacio.activo && usuario?.rol !== Rol.ADMIN) throw new NotFoundException('El espacio no existe.')
    return aRespuesta(espacio)
  }

  /** Estado de cada bloque de un día: libre, ocupado o pasado */
  async disponibilidad(id: number, fecha: string) {
    if (!esFechaValida(fecha)) throw new BadRequestException('La fecha no es válida.')
    const espacio = await this.buscarEntidad(id)
    const ocupadas = await this.reservas.find({
      select: { bloque: true },
      where: { espacioId: espacio.id, fecha, estado: In(ESTADOS_ACTIVOS) },
    })
    const ocupados = new Set(ocupadas.map((r) => r.bloque))
    const ahora = new Date()
    return {
      espacioId: espacio.id,
      fecha,
      hoy: aTextoFecha(ahora),
      bloques: BLOQUES.map((bloque) => ({ bloque, estado: estadoBloque(ocupados, fecha, bloque, ahora) })),
    }
  }

  async crear(datos: CrearEspacioDto, actor: UsuarioSesion): Promise<EspacioRespuesta> {
    const edificio = await this.validarEdificioYPiso(datos.edificioId, datos.piso)
    await this.validarNombreLibre(datos.edificioId, datos.nombre)
    await this.validarEquipos(datos.equipamiento)

    const { equipamiento, ...campos } = datos
    const creado = await this.espacios.save(
      this.espacios.create({
        ...campos,
        categoria: campos.categoria ?? null,
        edificio,
        equipamiento: (equipamiento ?? []).map((item) => ({ equipamientoId: item.equipamientoId, cantidad: item.cantidad })),
      }),
    )
    const respuesta = await this.obtener(creado.id, actor)
    await this.actividad.registrar('espacio.creado', { tipo: 'espacio', id: creado.id }, actor, { espacio: respuesta })
    return respuesta
  }

  async actualizar(id: number, datos: ActualizarEspacioDto, actor: UsuarioSesion): Promise<EspacioRespuesta> {
    const espacio = await this.buscarEntidad(id)
    const antes = aRespuesta(espacio)

    const edificioId = datos.edificioId ?? espacio.edificioId
    const piso = datos.piso ?? espacio.piso
    if (datos.edificioId !== undefined || datos.piso !== undefined) await this.validarEdificioYPiso(edificioId, piso)
    if (datos.nombre !== undefined || datos.edificioId !== undefined) {
      await this.validarNombreLibre(edificioId, datos.nombre ?? espacio.nombre, id)
    }
    await this.validarEquipos(datos.equipamiento)

    // No se puede desactivar un espacio que tiene reservas próximas: primero hay que cancelarlas o rechazarlas
    if (datos.activo === false && espacio.activo) {
      const proximas = await this.reservas
        .createQueryBuilder('r')
        .where('r.espacio_id = :id', { id })
        .andWhere('r.estado IN (:...estados)', { estados: ESTADOS_ACTIVOS })
        .andWhere('r.fecha >= :hoy', { hoy: aTextoFecha(new Date()) })
        .getCount()
      if (proximas > 0) {
        throw new ConflictException(
          `No se puede desactivar: tiene ${proximas} reserva(s) próximas. Cancélalas o recházalas primero.`,
        )
      }
    }

    const { equipamiento, ...campos } = datos
    // Transacción: los datos del espacio y su equipamiento cambian juntos o no cambia nada
    await this.dataSource.transaction(async (manager) => {
      await manager.update(Espacio, id, campos)
      if (equipamiento) {
        await manager.delete(EspacioEquipamiento, { espacioId: id })
        if (equipamiento.length) {
          await manager.insert(
            EspacioEquipamiento,
            equipamiento.map((item) => ({ espacioId: id, equipamientoId: item.equipamientoId, cantidad: item.cantidad })),
          )
        }
      }
    })

    const despues = await this.obtener(id, actor)
    const cambios = detectarCambios(antes as object, {
      ...campos,
      ...(equipamiento ? { equipamiento: despues.equipamiento } : {}),
      ...(datos.edificioId !== undefined ? { edificio: despues.edificio } : {}),
    } as object)
    delete cambios.edificioId
    if (Object.keys(cambios).length) {
      await this.actividad.registrar('espacio.actualizado', { tipo: 'espacio', id }, actor, { nombre: despues.nombre, cambios })
    }
    return despues
  }

  async eliminar(id: number, actor: UsuarioSesion): Promise<void> {
    const espacio = await this.buscarEntidad(id)
    const reservas = await this.reservas.countBy({ espacioId: id })
    if (reservas > 0) {
      throw new ConflictException(
        `No se puede eliminar: el espacio tiene ${reservas} reserva(s) en su historial. Desactívalo para que no reciba nuevas.`,
      )
    }
    const datos = aRespuesta(espacio)
    await this.espacios.delete(id)
    await this.actividad.registrar('espacio.eliminado', { tipo: 'espacio', id }, actor, { espacio: datos })
  }

  async buscarEntidad(id: number): Promise<Espacio> {
    const espacio = await this.espacios.findOne({
      where: { id },
      relations: { edificio: true, equipamiento: { equipamiento: true } },
    })
    if (!espacio) throw new NotFoundException('El espacio no existe.')
    return espacio
  }

  private async validarEdificioYPiso(edificioId: number, piso: number): Promise<Edificio> {
    const edificio = await this.edificios.findOneBy({ id: edificioId })
    if (!edificio) throw new BadRequestException('El edificio elegido no existe.')
    if (piso > edificio.pisos) {
      throw new BadRequestException(`El edificio ${edificio.codigo} tiene ${edificio.pisos} piso(s); el piso ${piso} no existe.`)
    }
    return edificio
  }

  private async validarNombreLibre(edificioId: number, nombre: string, idActual?: number) {
    const otro = await this.espacios.findOneBy({ edificioId, nombre })
    if (otro && otro.id !== idActual) throw new ConflictException('Ya existe un espacio con ese nombre en el edificio.')
  }

  private async validarEquipos(items?: EquipoAsignadoDto[]) {
    if (!items?.length) return
    const ids = items.map((item) => item.equipamientoId)
    const existentes = await this.equipamiento.countBy({ id: In(ids) })
    if (existentes !== ids.length) throw new BadRequestException('Algún equipamiento elegido no existe.')
  }
}

function aRespuesta(espacio: Espacio): EspacioRespuesta {
  return {
    id: espacio.id,
    nombre: espacio.nombre,
    tipo: espacio.tipo,
    categoria: espacio.categoria,
    piso: espacio.piso,
    capacidad: espacio.capacidad,
    requiereAprobacion: espacio.requiereAprobacion,
    activo: espacio.activo,
    edificio: { id: espacio.edificio.id, codigo: espacio.edificio.codigo, nombre: espacio.edificio.nombre },
    equipamiento: (espacio.equipamiento ?? [])
      .map((item) => ({ id: item.equipamiento.id, nombre: item.equipamiento.nombre, cantidad: item.cantidad }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
  }
}
