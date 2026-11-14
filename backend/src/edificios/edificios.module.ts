import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Edificio } from './edificio.entity'
import { Espacio } from '../espacios/espacio.entity'
import { EdificiosController } from './edificios.controller'
import { EdificiosService } from './edificios.service'

@Module({
  imports: [TypeOrmModule.forFeature([Edificio, Espacio])],
  controllers: [EdificiosController],
  providers: [EdificiosService],
})
export class EdificiosModule {}
