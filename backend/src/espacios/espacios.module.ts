import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Espacio } from './espacio.entity'
import { EspacioEquipamiento } from './espacio-equipamiento.entity'
import { Edificio } from '../edificios/edificio.entity'
import { Equipamiento } from '../equipamiento/equipamiento.entity'
import { Reserva } from '../reservas/reserva.entity'
import { EspaciosController } from './espacios.controller'
import { EspaciosService } from './espacios.service'

@Module({
  imports: [TypeOrmModule.forFeature([Espacio, EspacioEquipamiento, Edificio, Equipamiento, Reserva])],
  controllers: [EspaciosController],
  providers: [EspaciosService],
  exports: [EspaciosService],
})
export class EspaciosModule {}
