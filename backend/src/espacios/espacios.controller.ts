import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Publico, Roles, UsuarioActual, UsuarioSesion } from '../auth/decoradores'
import { Rol } from '../usuarios/usuario.entity'
import { EspaciosService } from './espacios.service'
import { ActualizarEspacioDto, ConsultaDisponibilidadDto, ConsultaEspaciosDto, CrearEspacioDto } from './espacio.dto'

@ApiTags('Espacios')
@Controller('espacios')
export class EspaciosController {
  constructor(private readonly espacios: EspaciosService) {}

  @Publico()
  @Get()
  @ApiOperation({
    summary: 'Catálogo de espacios con filtros',
    description: 'Si se envía "fecha", cada espacio incluye "bloquesLibres" para ese día.',
  })
  listar(@Query() consulta: ConsultaEspaciosDto, @UsuarioActual() usuario?: UsuarioSesion) {
    return this.espacios.listar(consulta, usuario)
  }

  @Publico()
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un espacio con su edificio y equipamiento' })
  obtener(@Param('id', ParseIntPipe) id: number, @UsuarioActual() usuario?: UsuarioSesion) {
    return this.espacios.obtener(id, usuario)
  }

  @Publico()
  @Get(':id/disponibilidad')
  @ApiOperation({ summary: 'Estado de cada bloque horario de un día (libre, ocupado o pasado)' })
  disponibilidad(@Param('id', ParseIntPipe) id: number, @Query() { fecha }: ConsultaDisponibilidadDto) {
    return this.espacios.disponibilidad(id, fecha)
  }

  @ApiBearerAuth()
  @Roles(Rol.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Crea un espacio con su equipamiento (administrador)' })
  crear(@Body() datos: CrearEspacioDto, @UsuarioActual() actor: UsuarioSesion) {
    return this.espacios.crear(datos, actor)
  }

  @ApiBearerAuth()
  @Roles(Rol.ADMIN)
  @Patch(':id')
  @ApiOperation({
    summary: 'Actualiza un espacio (administrador)',
    description: 'Si se envía "equipamiento", reemplaza la lista completa. "activo: false" lo saca del catálogo.',
  })
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() datos: ActualizarEspacioDto, @UsuarioActual() actor: UsuarioSesion) {
    return this.espacios.actualizar(id, datos, actor)
  }

  @ApiBearerAuth()
  @Roles(Rol.ADMIN)
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina un espacio sin reservas (administrador). Si tiene historial, hay que desactivarlo.' })
  eliminar(@Param('id', ParseIntPipe) id: number, @UsuarioActual() actor: UsuarioSesion) {
    return this.espacios.eliminar(id, actor)
  }
}
