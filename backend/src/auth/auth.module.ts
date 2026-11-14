import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Usuario } from '../usuarios/usuario.entity'
import { leerEntorno } from '../config/entorno'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { GuardiaAutenticacion } from './guardias'

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario]),
    JwtModule.registerAsync({
      global: true,
      useFactory: () => {
        const { jwt } = leerEntorno()
        return { secret: jwt.secreto, signOptions: { expiresIn: jwt.expiraEn as never } }
      },
    }),
  ],
  controllers: [AuthController],
  // La guardia se registra como global: protege todas las rutas de la API
  providers: [AuthService, { provide: APP_GUARD, useClass: GuardiaAutenticacion }],
})
export class AuthModule {}
