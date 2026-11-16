import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Reserva } from './reserva.entity'
import { Espacio } from '../espacios/espacio.entity'
import { ReservasController } from './reservas.controller'
import { ReservasService } from './reservas.service'

@Module({
  imports: [TypeOrmModule.forFeature([Reserva, Espacio])],
  controllers: [ReservasController],
  providers: [ReservasService],
})
export class ReservasModule {}
