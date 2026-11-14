import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { Publico, Roles, UsuarioActual, UsuarioSesion } from '../auth/decoradores'
import { Rol } from '../usuarios/usuario.entity'
import { EquipamientoService } from './equipamiento.service'
import { GuardarEquipamientoDto } from './equipamiento.dto'

@ApiTags('Equipamiento')
@Controller('equipamiento')
export class EquipamientoController {
  constructor(private readonly equipamiento: EquipamientoService) {}

  @Publico()
  @Get()
  @ApiOperation({ summary: 'Catálogo de equipamiento con la cantidad de espacios que lo tienen' })
  listar() {
    return this.equipamiento.listar()
  }

  @ApiBearerAuth()
  @Roles(Rol.ADMIN)
  @Post()
  @ApiOperation({ summary: 'Agrega un equipo al catálogo (administrador)' })
  crear(@Body() datos: GuardarEquipamientoDto, @UsuarioActual() actor: UsuarioSesion) {
    return this.equipamiento.crear(datos, actor)
  }

  @ApiBearerAuth()
  @Roles(Rol.ADMIN)
  @Patch(':id')
  @ApiOperation({ summary: 'Renombra un equipo (administrador)' })
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() datos: GuardarEquipamientoDto, @UsuarioActual() actor: UsuarioSesion) {
    return this.equipamiento.actualizar(id, datos, actor)
  }

  @ApiBearerAuth()
  @Roles(Rol.ADMIN)
  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Elimina un equipo que ningún espacio usa (administrador)' })
  eliminar(@Param('id', ParseIntPipe) id: number, @UsuarioActual() actor: UsuarioSesion) {
    return this.equipamiento.eliminar(id, actor)
  }
}
