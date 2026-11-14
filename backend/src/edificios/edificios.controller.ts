import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Publico, Roles, UsuarioActual, UsuarioSesion } from '../auth/decoradores'
import { Rol } from '../usuarios/usuario.entity'
import { EdificiosService } from './edificios.service'
import { ActualizarEdificioDto, CrearEdificioDto } from './edificio.dto'

@ApiTags('Edificios')
@Controller('edificios')
export class EdificiosController {
  constructor(private readonly edificios: EdificiosService) {}

  @Publico()
  @Get()
  @ApiOperation({ summary: 'Lista los edificios con su cantidad de espacios' })
  listar() {
    return this.edificios.listar()
  }

  @Publico()
  @Get(':id')
  @ApiOperation({ summary: 'Obtiene un edificio' })
  obtener(@Param('id', ParseIntPipe) id: number) {
    return this.edificios.obtener(id)
  }

  @ApiBearerAuth()
  @Roles(Rol.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Crea un edificio (administrador)' })
  crear(@Body() datos: CrearEdificioDto, @UsuarioActual() actor: UsuarioSesion) {
    return this.edificios.crear(datos, actor)
  }

  @ApiBearerAuth()
  @Roles(Rol.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Actualiza un edificio (administrador)' })
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() datos: ActualizarEdificioDto, @UsuarioActual() actor: UsuarioSesion) {
    return this.edificios.actualizar(id, datos, actor)
  }

  @ApiBearerAuth()
  @Roles(Rol.ADMIN)
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina un edificio sin espacios (administrador)' })
  eliminar(@Param('id', ParseIntPipe) id: number, @UsuarioActual() actor: UsuarioSesion) {
    return this.edificios.eliminar(id, actor)
  }
}
