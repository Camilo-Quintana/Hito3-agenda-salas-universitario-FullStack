import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { EstadoReserva, ESTADOS_ACTIVOS, Reserva } from './reserva.entity'
import { Espacio } from '../espacios/espacio.entity'
import { Rol } from '../usuarios/usuario.entity'
import { UsuarioSesion } from '../auth/decoradores'
import { ActividadService } from '../actividad/actividad.service'
import { CancelarReservaDto, ConsultaMisReservasDto, ConsultaReservasDto, CrearReservaDto } from './reserva.dto'
import { estadoInicial, estadoTemporal, validarCancelacion, validarNuevaReserva, validarRevision } from './reglas-reserva'

@Injectable()
export class ReservasService {
  constructor(
    @InjectRepository(Reserva) private readonly reservas: Repository<Reserva>,
    @InjectRepository(Espacio) private readonly espacios: Repository<Espacio>,
    private readonly actividad: ActividadService,
  ) {}

  /** Crea una reserva (o una solicitud pendiente si el espacio requiere aprobación) */
  async crear(datos: CrearReservaDto, usuario: UsuarioSesion) {
    const espacio = await this.espacios.findOne({ where: { id: datos.espacioId }, relations: { edificio: true } })
    if (!espacio) throw new NotFoundException('El espacio no existe.')

    const [bloqueOcupado, yaTieneReservaEseDia] = await Promise.all([
      this.reservas.exists({
        where: { espacioId: espacio.id, fecha: datos.fecha, bloque: datos.bloque, estado: In(ESTADOS_ACTIVOS) },
      }),
      this.reservas.exists({ where: { usuarioId: usuario.id, fecha: datos.fecha, estado: In(ESTADOS_ACTIVOS) } }),
    ])

    const problema = validarNuevaReserva({
      espacio,
      fecha: datos.fecha,
      bloque: datos.bloque,
      asistentes: datos.asistentes,
      ahora: new Date(),
      bloqueOcupado,
      yaTieneReservaEseDia,
    })
    if (problema) {
      // 409 si choca con otra reserva; 400 si los datos no cumplen las reglas
      if (bloqueOcupado || yaTieneReservaEseDia) throw new ConflictException(problema)
      throw new BadRequestException(problema)
    }

    // Si dos personas reservan el mismo bloque al mismo tiempo, el índice único parcial de PostgreSQL
    // rechaza la segunda y el filtro de errores responde 409 "Ese horario ya está ocupado".
    const reserva = await this.reservas.save(
      this.reservas.create({
        usuarioId: usuario.id,
        espacioId: espacio.id,
        fecha: datos.fecha,
        bloque: datos.bloque,
        motivo: datos.motivo,
        asistentes: datos.asistentes,
        estado: estadoInicial(espacio),
      }),
    )

    await this.actividad.registrar('reserva.creada', { tipo: 'reserva', id: reserva.id }, usuario, {
      estado: reserva.estado,
      espacio: { id: espacio.id, nombre: espacio.nombre, edificio: espacio.edificio.codigo },
      fecha: reserva.fecha,
      bloque: reserva.bloque,
      motivo: reserva.motivo,
      asistentes: reserva.asistentes,
      requiereAprobacion: espacio.requiereAprobacion,
    })
    return this.obtener(reserva.id, usuario)
  }

  /** Reservas del usuario con sesión iniciada */
  async mias(usuario: UsuarioSesion, { vista }: ConsultaMisReservasDto) {
    const lista = await this.consultaBase()
      .where('r.usuario_id = :id', { id: usuario.id })
      .orderBy('r.fecha', 'DESC')
      .addOrderBy('r.bloque', 'DESC')
      .getMany()
    const ahora = new Date()
    const respuestas = lista.map((r) => aRespuesta(r, ahora))
    if (!vista) return respuestas
    const esActiva = (r: ReturnType<typeof aRespuesta>) =>
      ESTADOS_ACTIVOS.includes(r.estado) && r.estadoTemporal !== 'finalizada'
    return vista === 'activas'
      ? respuestas.filter(esActiva).reverse() // las activas, de la más próxima a la más lejana
      : respuestas.filter((r) => !esActiva(r))
  }

  /** Todas las reservas con filtros y paginación (administración) */
  async listar(consulta: ConsultaReservasDto) {
    const qb = this.consultaBase()
    if (consulta.estado) qb.andWhere('r.estado = :estado', { estado: consulta.estado })
    if (consulta.desde) qb.andWhere('r.fecha >= :desde', { desde: consulta.desde })
    if (consulta.hasta) qb.andWhere('r.fecha <= :hasta', { hasta: consulta.hasta })
    if (consulta.espacioId) qb.andWhere('r.espacio_id = :espacioId', { espacioId: consulta.espacioId })
    if (consulta.edificioId) qb.andWhere('e.edificio_id = :edificioId', { edificioId: consulta.edificioId })
    if (consulta.q) {
      qb.andWhere('(u.nombre ILIKE :texto OR u.rut ILIKE :texto OR e.nombre ILIKE :texto)', {
        texto: `%${consulta.q.replace(/[%_\\]/g, '\\$&')}%`,
      })
    }
    // Las pendientes se ordenan de la más próxima a la más lejana (hay que revisarlas a tiempo)
    if (consulta.estado === EstadoReserva.PENDIENTE) qb.orderBy('r.fecha', 'ASC').addOrderBy('r.bloque', 'ASC')
    else qb.orderBy('r.fecha', 'DESC').addOrderBy('r.bloque', 'DESC')

    const limite = consulta.limite ?? 20
    const pagina = consulta.pagina ?? 1
    const [items, total] = await qb
      .skip((pagina - 1) * limite)
      .take(limite)
      .getManyAndCount()
    const ahora = new Date()
    return {
      items: items.map((r) => aRespuesta(r, ahora)),
      total,
      pagina,
      totalPaginas: Math.max(1, Math.ceil(total / limite)),
    }
  }

  async obtener(id: number, usuario: UsuarioSesion) {
    const reserva = await this.consultaBase().where('r.id = :id', { id }).getOne()
    if (!reserva) throw new NotFoundException('La reserva no existe.')
    if (usuario.rol !== Rol.ADMIN && reserva.usuarioId !== usuario.id) throw new ForbiddenException('Esta reserva no es tuya.')
    return aRespuesta(reserva, new Date())
  }

  async aprobar(id: number, admin: UsuarioSesion) {
    return this.revisar(id, admin, EstadoReserva.APROBADA, null)
  }

  async rechazar(id: number, admin: UsuarioSesion, observacion: string) {
    return this.revisar(id, admin, EstadoReserva.RECHAZADA, observacion)
  }

  async cancelar(id: number, usuario: UsuarioSesion, { observacion }: CancelarReservaDto) {
    const reserva = await this.buscar(id)
    const problema = validarCancelacion(reserva, usuario, new Date())
    if (problema) {
      if (problema.startsWith('Solo puedes')) throw new ForbiddenException(problema)
      throw new ConflictException(problema)
    }
    const anterior = reserva.estado
    await this.reservas.update(id, { estado: EstadoReserva.CANCELADA, observacion: observacion || null })
    await this.actividad.registrar('reserva.cancelada', { tipo: 'reserva', id }, usuario, {
      estadoAnterior: anterior,
      estado: EstadoReserva.CANCELADA,
      observacion: observacion || null,
      porAdministrador: usuario.rol === Rol.ADMIN && reserva.usuarioId !== usuario.id,
    })
    return this.obtener(id, usuario)
  }

  /** Línea de tiempo de la reserva guardada en MongoDB */
  async historial(id: number, usuario: UsuarioSesion) {
    await this.obtener(id, usuario) // valida que exista y que el usuario pueda verla
    return this.actividad.historial('reserva', id)
  }

  private async revisar(id: number, admin: UsuarioSesion, nuevoEstado: EstadoReserva, observacion: string | null) {
    const reserva = await this.buscar(id)
    const problema = validarRevision(reserva, new Date())
    if (problema) throw new ConflictException(problema)

    // Solo cambia si sigue pendiente: si otro administrador la revisó recién, no se pisa su decisión
    const resultado = await this.reservas.update(
      { id, estado: EstadoReserva.PENDIENTE },
      { estado: nuevoEstado, observacion, revisadaPorId: admin.id },
    )
    if (!resultado.affected) throw new ConflictException('Otro administrador ya revisó esta solicitud.')

    await this.actividad.registrar(
      nuevoEstado === EstadoReserva.APROBADA ? 'reserva.aprobada' : 'reserva.rechazada',
      { tipo: 'reserva', id },
      admin,
      { estadoAnterior: EstadoReserva.PENDIENTE, estado: nuevoEstado, observacion },
    )
    return this.obtener(id, admin)
  }

  private async buscar(id: number): Promise<Reserva> {
    const reserva = await this.reservas.findOneBy({ id })
    if (!reserva) throw new NotFoundException('La reserva no existe.')
    return reserva
  }

  private consultaBase() {
    return this.reservas
      .createQueryBuilder('r')
      .innerJoinAndSelect('r.espacio', 'e')
      .innerJoinAndSelect('e.edificio', 'ed')
      .innerJoinAndSelect('r.usuario', 'u')
      .leftJoinAndSelect('r.revisadaPor', 'rev')
  }
}

function aRespuesta(r: Reserva, ahora: Date) {
  return {
    id: r.id,
    fecha: r.fecha,
    bloque: r.bloque,
    motivo: r.motivo,
    asistentes: r.asistentes,
    estado: r.estado,
    estadoTemporal: estadoTemporal(r.fecha, r.bloque, ahora),
    observacion: r.observacion,
    creadaEn: r.creadaEn,
    actualizadaEn: r.actualizadaEn,
    espacio: {
      id: r.espacio.id,
      nombre: r.espacio.nombre,
      tipo: r.espacio.tipo,
      categoria: r.espacio.categoria,
      piso: r.espacio.piso,
      capacidad: r.espacio.capacidad,
      edificio: { id: r.espacio.edificio.id, codigo: r.espacio.edificio.codigo },
    },
    solicitante: { id: r.usuario.id, nombre: r.usuario.nombre, rut: r.usuario.rut, correo: r.usuario.correo },
    revisadaPor: r.revisadaPor ? { id: r.revisadaPor.id, nombre: r.revisadaPor.nombre } : null,
  }
}
