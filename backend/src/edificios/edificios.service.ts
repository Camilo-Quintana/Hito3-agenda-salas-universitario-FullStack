import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Edificio } from './edificio.entity'
import { Espacio } from '../espacios/espacio.entity'
import { ActualizarEdificioDto, CrearEdificioDto } from './edificio.dto'
import { ActividadService } from '../actividad/actividad.service'
import { UsuarioSesion } from '../auth/decoradores'
import { detectarCambios } from '../common/cambios'

@Injectable()
export class EdificiosService {
  constructor(
    @InjectRepository(Edificio) private readonly edificios: Repository<Edificio>,
    @InjectRepository(Espacio) private readonly espacios: Repository<Espacio>,
    private readonly actividad: ActividadService,
  ) {}

  /** Lista los edificios con la cantidad de espacios de cada uno */
  async listar() {
    const filas = await this.edificios
      .createQueryBuilder('e')
      .loadRelationCountAndMap('e.totalEspacios', 'e.espacios')
      .orderBy('e.codigo', 'ASC')
      .getMany()
    return filas
  }

  async obtener(id: number): Promise<Edificio> {
    const edificio = await this.edificios.findOneBy({ id })
    if (!edificio) throw new NotFoundException('El edificio no existe.')
    return edificio
  }

  async crear(datos: CrearEdificioDto, actor: UsuarioSesion): Promise<Edificio> {
    if (await this.edificios.exists({ where: { codigo: datos.codigo } })) {
      throw new ConflictException(`Ya existe el edificio ${datos.codigo}.`)
    }
    const edificio = await this.edificios.save(this.edificios.create(datos))
    await this.actividad.registrar('edificio.creado', { tipo: 'edificio', id: edificio.id }, actor, { edificio: { ...edificio } })
    return edificio
  }

  async actualizar(id: number, datos: ActualizarEdificioDto, actor: UsuarioSesion): Promise<Edificio> {
    const edificio = await this.obtener(id)
    if (datos.codigo && datos.codigo !== edificio.codigo && (await this.edificios.exists({ where: { codigo: datos.codigo } }))) {
      throw new ConflictException(`Ya existe el edificio ${datos.codigo}.`)
    }
    if (datos.pisos !== undefined) {
      // No se puede dejar un espacio en un piso que el edificio ya no tendría
      const pisoMaximo = await this.espacios.maximum('piso', { edificioId: id })
      if (pisoMaximo !== null && pisoMaximo > datos.pisos) {
        throw new BadRequestException(`Hay espacios en el piso ${pisoMaximo}: el edificio debe tener al menos ${pisoMaximo} pisos.`)
      }
    }
    const cambios = detectarCambios(edificio, datos)
    const guardado = await this.edificios.save({ ...edificio, ...datos })
    if (Object.keys(cambios).length) {
      await this.actividad.registrar('edificio.actualizado', { tipo: 'edificio', id }, actor, { cambios })
    }
    return guardado
  }

  async eliminar(id: number, actor: UsuarioSesion): Promise<void> {
    const edificio = await this.obtener(id)
    const cantidad = await this.espacios.countBy({ edificioId: id })
    if (cantidad > 0) {
      throw new ConflictException(`No se puede eliminar: el edificio tiene ${cantidad} espacio(s). Muévelos o elimínalos primero.`)
    }
    await this.edificios.delete(id)
    await this.actividad.registrar('edificio.eliminado', { tipo: 'edificio', id }, actor, { edificio: { ...edificio } })
  }
}
