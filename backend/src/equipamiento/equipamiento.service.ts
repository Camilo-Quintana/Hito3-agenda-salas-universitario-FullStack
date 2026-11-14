import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { ILike, Not, Repository } from 'typeorm'
import { Equipamiento } from './equipamiento.entity'
import { EspacioEquipamiento } from '../espacios/espacio-equipamiento.entity'
import { GuardarEquipamientoDto } from './equipamiento.dto'
import { ActividadService } from '../actividad/actividad.service'
import { UsuarioSesion } from '../auth/decoradores'

@Injectable()
export class EquipamientoService {
  constructor(
    @InjectRepository(Equipamiento) private readonly equipamiento: Repository<Equipamiento>,
    @InjectRepository(EspacioEquipamiento) private readonly asignaciones: Repository<EspacioEquipamiento>,
    private readonly actividad: ActividadService,
  ) {}

  /** Catálogo con la cantidad de espacios que tienen cada equipo */
  async listar() {
    const filas = await this.equipamiento
      .createQueryBuilder('eq')
      .leftJoin(EspacioEquipamiento, 'ee', 'ee.equipamiento_id = eq.id')
      .select(['eq.id AS id', 'eq.nombre AS nombre', 'COUNT(ee.espacio_id)::int AS "totalEspacios"'])
      .groupBy('eq.id')
      .orderBy('eq.nombre', 'ASC')
      .getRawMany<{ id: number; nombre: string; totalEspacios: number }>()
    return filas
  }

  async crear(datos: GuardarEquipamientoDto, actor: UsuarioSesion): Promise<Equipamiento> {
    await this.verificarNombreLibre(datos.nombre)
    const creado = await this.equipamiento.save(this.equipamiento.create(datos))
    await this.actividad.registrar('equipamiento.creado', { tipo: 'equipamiento', id: creado.id }, actor, { nombre: creado.nombre })
    return creado
  }

  async actualizar(id: number, datos: GuardarEquipamientoDto, actor: UsuarioSesion): Promise<Equipamiento> {
    const equipo = await this.obtener(id)
    await this.verificarNombreLibre(datos.nombre, id)
    const anterior = equipo.nombre
    equipo.nombre = datos.nombre
    const guardado = await this.equipamiento.save(equipo)
    await this.actividad.registrar('equipamiento.actualizado', { tipo: 'equipamiento', id }, actor, {
      cambios: { nombre: { antes: anterior, despues: datos.nombre } },
    })
    return guardado
  }

  async eliminar(id: number, actor: UsuarioSesion): Promise<void> {
    const equipo = await this.obtener(id)
    const enUso = await this.asignaciones.countBy({ equipamientoId: id })
    if (enUso > 0) throw new ConflictException(`No se puede eliminar: ${enUso} espacio(s) tienen "${equipo.nombre}".`)
    await this.equipamiento.delete(id)
    await this.actividad.registrar('equipamiento.eliminado', { tipo: 'equipamiento', id }, actor, { nombre: equipo.nombre })
  }

  private async obtener(id: number): Promise<Equipamiento> {
    const equipo = await this.equipamiento.findOneBy({ id })
    if (!equipo) throw new NotFoundException('El equipamiento no existe.')
    return equipo
  }

  // Sin distinguir mayúsculas: "wifi" y "WiFi" serían el mismo equipo
  private async verificarNombreLibre(nombre: string, idActual?: number) {
    const existe = await this.equipamiento.exists({
      where: { nombre: ILike(nombre.replace(/[%_]/g, '\\$&')), ...(idActual ? { id: Not(idActual) } : {}) },
    })
    if (existe) throw new ConflictException(`Ya existe el equipamiento "${nombre}".`)
  }
}
