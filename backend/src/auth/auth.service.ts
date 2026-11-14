import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcryptjs'
import { Rol, Usuario } from '../usuarios/usuario.entity'
import { formatearRut } from '../common/rut'
import { ActividadService } from '../actividad/actividad.service'
import { ActualizarPerfilDto, LoginDto, RegistroDto, SesionRespuesta, UsuarioRespuesta } from './auth.dto'
import { UsuarioSesion } from './decoradores'

const RONDAS_BCRYPT = 10

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario) private readonly usuarios: Repository<Usuario>,
    private readonly jwt: JwtService,
    private readonly actividad: ActividadService,
  ) {}

  /** Registro público: siempre crea estudiantes. Los administradores se crean con los datos de prueba. */
  async registrar(datos: RegistroDto): Promise<SesionRespuesta> {
    const rut = formatearRut(datos.rut)
    if (await this.usuarios.exists({ where: { rut } })) throw new ConflictException('Ya existe una cuenta con ese RUT.')
    if (await this.usuarios.exists({ where: { correo: datos.correo } })) {
      throw new ConflictException('Ya existe una cuenta con ese correo.')
    }
    const usuario = await this.usuarios.save(
      this.usuarios.create({
        rut,
        nombre: datos.nombre,
        correo: datos.correo,
        passwordHash: await bcrypt.hash(datos.password, RONDAS_BCRYPT),
        rol: Rol.ESTUDIANTE,
      }),
    )
    const sesion = await this.crearSesion(usuario)
    await this.actividad.registrar('usuario.registrado', { tipo: 'usuario', id: usuario.id }, aSesion(usuario))
    return sesion
  }

  async iniciarSesion({ correo, password }: LoginDto): Promise<SesionRespuesta> {
    // passwordHash tiene select:false, así que hay que pedirlo explícitamente
    const usuario = await this.usuarios
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.correo = :correo', { correo })
      .getOne()
    // Mismo mensaje si el correo no existe o la clave es incorrecta: no revelamos qué cuentas existen
    if (!usuario || !(await bcrypt.compare(password, usuario.passwordHash))) {
      throw new UnauthorizedException('Correo o contraseña incorrectos.')
    }
    await this.actividad.registrar('usuario.sesion_iniciada', { tipo: 'usuario', id: usuario.id }, aSesion(usuario))
    return this.crearSesion(usuario)
  }

  async perfil(id: number): Promise<UsuarioRespuesta> {
    const usuario = await this.usuarios.findOneBy({ id })
    if (!usuario) throw new NotFoundException('El usuario ya no existe.')
    return aRespuesta(usuario)
  }

  async actualizarPerfil(id: number, datos: ActualizarPerfilDto): Promise<UsuarioRespuesta> {
    const usuario = await this.usuarios.findOneBy({ id })
    if (!usuario) throw new NotFoundException('El usuario ya no existe.')
    if (datos.correo && datos.correo !== usuario.correo && (await this.usuarios.exists({ where: { correo: datos.correo } }))) {
      throw new ConflictException('Ya existe una cuenta con ese correo.')
    }
    Object.assign(usuario, datos)
    return aRespuesta(await this.usuarios.save(usuario))
  }

  private async crearSesion(usuario: Usuario): Promise<SesionRespuesta> {
    const token = await this.jwt.signAsync({ sub: usuario.id, nombre: usuario.nombre, rol: usuario.rol })
    return { token, usuario: aRespuesta(usuario) }
  }
}

function aRespuesta({ id, rut, nombre, correo, rol }: Usuario): UsuarioRespuesta {
  return { id, rut, nombre, correo, rol }
}

function aSesion(usuario: Usuario): UsuarioSesion {
  return { id: usuario.id, nombre: usuario.nombre, rol: usuario.rol }
}
