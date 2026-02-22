import { Module } from '@nestjs/common';
import { DrugTradeNamesService } from './drug-trade-names.service';
import { DrugTradeNamesController } from './drug-trade-names.controller';

@Module({
  controllers: [DrugTradeNamesController],
  providers: [DrugTradeNamesService],
  exports: [DrugTradeNamesService],
})
export class DrugTradeNamesModule {}
