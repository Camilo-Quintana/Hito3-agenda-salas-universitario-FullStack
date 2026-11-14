import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { InjectConnection } from '@nestjs/mongoose'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { Connection } from 'mongoose'
import { DataSource } from 'typeorm'
import { Publico } from './auth/decoradores'
import { BLOQUES, DIAS_ANTICIPACION } from './common/horario'

@ApiTags('Sistema')
@Controller()
export class SaludController {
  constructor(
    private readonly dataSource: DataSource,
    @InjectConnection() private readonly mongo: Connection,
  ) {}

  @Publico()
  @Get('salud')
  @ApiOperation({ summary: 'Estado de la API y de sus bases de datos (lo usa Docker para saber si está lista)' })
  async salud() {
    const postgres = await this.dataSource
      .query('SELECT 1')
      .then(() => 'ok')
      .catch(() => 'sin conexión')
    const mongo = this.mongo.readyState === 1 ? 'ok' : 'sin conexión'
    const estado = { api: 'ok', postgres, mongo }
    if (postgres !== 'ok' || mongo !== 'ok') throw new ServiceUnavailableException({ mensaje: 'Alguna base de datos no responde.', ...estado })
    return estado
  }

  @Publico()
  @Get('configuracion')
  @ApiOperation({ summary: 'Reglas de horario que el frontend necesita conocer' })
  configuracion() {
    return { bloques: BLOQUES, diasAnticipacion: DIAS_ANTICIPACION, zonaHoraria: process.env.TZ ?? 'America/Santiago' }
  }
}
