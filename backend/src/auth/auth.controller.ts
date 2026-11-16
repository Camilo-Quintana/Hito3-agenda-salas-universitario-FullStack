import { Body, Controller, Get, HttpCode, Patch, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { ActualizarPerfilDto, LoginDto, RegistroDto, SesionRespuesta, UsuarioRespuesta } from './auth.dto'
import { Publico, UsuarioActual, UsuarioSesion } from './decoradores'

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Publico()
  @Post('registro')
  @ApiOperation({ summary: 'Crea una cuenta de estudiante y devuelve el token de sesión' })
  registrar(@Body() datos: RegistroDto): Promise<SesionRespuesta> {
    return this.auth.registrar(datos)
  }

  @Publico()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Inicia sesión con correo y contraseña' })
  iniciarSesion(@Body() datos: LoginDto): Promise<SesionRespuesta> {
    return this.auth.iniciarSesion(datos)
  }

  @ApiBearerAuth()
  @Get('yo')
  @ApiOperation({ summary: 'Datos del usuario con sesión iniciada' })
  perfil(@UsuarioActual() usuario: UsuarioSesion): Promise<UsuarioRespuesta> {
    return this.auth.perfil(usuario.id)
  }

  @ApiBearerAuth()
  @Patch('yo')
  @ApiOperation({ summary: 'Actualiza el nombre o el correo del usuario con sesión iniciada' })
  actualizar(@UsuarioActual() usuario: UsuarioSesion, @Body() datos: ActualizarPerfilDto): Promise<UsuarioRespuesta> {
    return this.auth.actualizarPerfil(usuario.id, datos)
  }
}
