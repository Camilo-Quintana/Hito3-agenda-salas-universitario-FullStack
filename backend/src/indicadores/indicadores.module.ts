import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Reserva } from '../reservas/reserva.entity'
import { Espacio } from '../espacios/espacio.entity'
import { IndicadoresController } from './indicadores.controller'
import { IndicadoresService } from './indicadores.service'

@Module({
  imports: [TypeOrmModule.forFeature([Reserva, Espacio])],
  controllers: [IndicadoresController],
  providers: [IndicadoresService],
})
export class IndicadoresModule {}
