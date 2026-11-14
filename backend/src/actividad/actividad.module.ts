import { Global, Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Evento, EventoSchema } from './evento.schema'
import { ActividadService } from './actividad.service'
import { ActividadController } from './actividad.controller'

/** Global: cualquier módulo puede registrar eventos sin importarlo */
@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: Evento.name, schema: EventoSchema }])],
  controllers: [ActividadController],
  providers: [ActividadService],
  exports: [ActividadService],
})
export class ActividadModule {}
