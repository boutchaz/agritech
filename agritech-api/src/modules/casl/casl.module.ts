import { Module, Global } from '@nestjs/common';
import { CaslAbilityFactory } from './casl-ability.factory';
import { DatabaseModule } from '../database/database.module';

@Global()
@Module({
    imports: [DatabaseModule],
    providers: [CaslAbilityFactory],
    exports: [CaslAbilityFactory],
})
export class CaslModule { }
