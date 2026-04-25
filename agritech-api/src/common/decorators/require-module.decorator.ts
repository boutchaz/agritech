import { SetMetadata } from '@nestjs/common';

export const REQUIRED_MODULES_KEY = 'requiredModules';

export function RequireModule(...moduleSlugs: string[]) {
  return SetMetadata(REQUIRED_MODULES_KEY, moduleSlugs);
}
