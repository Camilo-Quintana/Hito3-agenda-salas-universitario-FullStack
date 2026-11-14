import { Controller, Get, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { IsOptional, Matches } from 'class-validator'
import { Roles } from '../auth/decoradores'
import { Rol } from '../usuarios/usuario.entity'
import { IndicadoresService } from './indicadores.service'

class ConsultaIndicadoresDto {
  /** Inicio del período (AAAA-MM-DD). Por defecto, 29 días antes de "hasta" */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'desde debe tener el formato AAAA-MM-DD.' })
  desde?: string

  /** Fin del período (AAAA-MM-DD). Por defecto, hoy */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'hasta debe tener el formato AAAA-MM-DD.' })
  hasta?: string
}

@ApiTags('Indicadores')
@ApiBearerAuth()
@Roles(Rol.ADMIN)
@Controller('indicadores')
export class IndicadoresController {
  constructor(private readonly indicadores: IndicadoresService) {}

  @Get()
  @ApiOperation({ summary: 'Indicadores de utilización: ocupación por espacio, tipo, edificio y bloque (administrador)' })
  calcular(@Query() { desde, hasta }: ConsultaIndicadoresDto) {
    return this.indicadores.calcular(desde, hasta)
  }
}
