import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Roles, UsuarioActual, UsuarioSesion } from '../auth/decoradores'
import { Rol } from '../usuarios/usuario.entity'
import { ReservasService } from './reservas.service'
import { CancelarReservaDto, ConsultaMisReservasDto, ConsultaReservasDto, CrearReservaDto, RechazarReservaDto } from './reserva.dto'

@ApiTags('Reservas')
@ApiBearerAuth()
@Controller('reservas')
export class ReservasController {
  constructor(private readonly reservas: ReservasService) {}

  @Post()
  @ApiOperation({
    summary: 'Crea una reserva',
    description:
      'Valida conflicto de horario, una reserva por día, capacidad y anticipación. ' +
      'Si el espacio requiere aprobación, la reserva queda "pendiente"; si no, "aprobada".',
  })
  crear(@Body() datos: CrearReservaDto, @UsuarioActual() usuario: UsuarioSesion) {
    return this.reservas.crear(datos, usuario)
  }

  @Get('mias')
  @ApiOperation({ summary: 'Reservas del usuario con sesión iniciada (vista=activas o vista=historial)' })
  mias(@UsuarioActual() usuario: UsuarioSesion, @Query() consulta: ConsultaMisReservasDto) {
    return this.reservas.mias(usuario, consulta)
  }

  @Roles(Rol.ADMIN)
  @Get()
  @ApiOperation({ summary: 'Todas las reservas y solicitudes, con filtros y paginación (administrador)' })
  listar(@Query() consulta: ConsultaReservasDto) {
    return this.reservas.listar(consulta)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de una reserva (propia, o cualquiera si es administrador)' })
  obtener(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioSesion) {
    return this.reservas.obtener(id, usuario)
  }

  @Get(':id/historial')
  @ApiOperation({ summary: 'Línea de tiempo de la reserva (eventos guardados en MongoDB)' })
  historial(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario: UsuarioSesion) {
    return this.reservas.historial(id, usuario)
  }

  @Roles(Rol.ADMIN)
  @Patch(':id/aprobar')
  @ApiOperation({ summary: 'Aprueba una solicitud pendiente (administrador)' })
  aprobar(@Param('id', ParseIntPipe) id: number, @UsuarioActual() admin: UsuarioSesion) {
    return this.reservas.aprobar(id, admin)
  }

  @Roles(Rol.ADMIN)
  @Patch(':id/rechazar')
  @ApiOperation({ summary: 'Rechaza una solicitud pendiente indicando el motivo (administrador)' })
  rechazar(@Param('id', ParseIntPipe) id: number, @Body() { observacion }: RechazarReservaDto, @UsuarioActual() admin: UsuarioSesion) {
    return this.reservas.rechazar(id, admin, observacion)
  }

  @Patch(':id/cancelar')
  @ApiOperation({ summary: 'Cancela una reserva pendiente o aprobada que aún no empieza (dueño o administrador)' })
  cancelar(@Param('id', ParseIntPipe) id: number, @Body() datos: CancelarReservaDto, @UsuarioActual() usuario: UsuarioSesion) {
    return this.reservas.cancelar(id, usuario, datos)
  }
}
