import { Module, Global } from '@nestjs/common';
import { CaslAbilityFactory } from './casl-ability.factory';
import { PoliciesGuard } from './policies.guard';
import { DatabaseModule } from '../database/database.module';

@Global()
@Module({
    imports: [DatabaseModule],
    providers: [CaslAbilityFactory, PoliciesGuard],
    exports: [CaslAbilityFactory, PoliciesGuard],
})
export class CaslModule { }
