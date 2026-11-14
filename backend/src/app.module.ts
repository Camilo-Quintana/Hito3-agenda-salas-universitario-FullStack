import { Module } from '@nestjs/common'
import { APP_FILTER } from '@nestjs/core'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MongooseModule } from '@nestjs/mongoose'
import { opcionesPostgres } from './database/data-source'
import { leerEntorno } from './config/entorno'
import { FiltroErrores } from './common/filtro-errores'
import { ActividadModule } from './actividad/actividad.module'
import { AuthModule } from './auth/auth.module'
import { EdificiosModule } from './edificios/edificios.module'
import { EquipamientoModule } from './equipamiento/equipamiento.module'
import { EspaciosModule } from './espacios/espacios.module'
import { SaludController } from './salud.controller'

@Module({
  imports: [
    // PostgreSQL: datos relacionales y transaccionales
    TypeOrmModule.forRootAsync({ useFactory: () => opcionesPostgres() }),
    // MongoDB: bitácora de eventos (actividad e historial)
    MongooseModule.forRootAsync({ useFactory: () => ({ uri: leerEntorno().mongoUri, serverSelectionTimeoutMS: 5000 }) }),
    ActividadModule,
    AuthModule,
    EdificiosModule,
    EquipamientoModule,
    EspaciosModule,
  ],
  controllers: [SaludController],
  providers: [{ provide: APP_FILTER, useClass: FiltroErrores }],
})
export class AppModule {}
