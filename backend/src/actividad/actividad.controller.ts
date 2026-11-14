import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Roles } from '../auth/decoradores'
import { Rol } from '../usuarios/usuario.entity'
import { ActividadService } from './actividad.service'
import { ConsultaActividadDto } from './actividad.dto'

@ApiTags('Actividad (MongoDB)')
@ApiBearerAuth()
@Roles(Rol.ADMIN)
@Controller('actividad')
export class ActividadController {
  constructor(private readonly actividad: ActividadService) {}

  @Get()
  @ApiOperation({ summary: 'Bitácora de actividad del sistema, más reciente primero (solo administradores)' })
  listar(@Query() consulta: ConsultaActividadDto) {
    return this.actividad.listar(consulta)
  }
}
