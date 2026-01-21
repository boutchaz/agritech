import { Module, Global } from '@nestjs/common';
import { CaslAbilityFactory, Subject } from './casl-ability.factory';
import { PoliciesGuard } from './policies.guard';
import { DatabaseModule } from '../database/database.module';

// Re-export commonly used items for convenience
export * from './action.enum';
export * from './casl-ability.factory';
export * from './check-policies.decorator';
export * from './permissions.decorator';
export * from './policy.interface';

@Global()
@Module({
    imports: [DatabaseModule],
    providers: [CaslAbilityFactory, PoliciesGuard],
    exports: [CaslAbilityFactory, PoliciesGuard],
})
export class CaslModule { }
